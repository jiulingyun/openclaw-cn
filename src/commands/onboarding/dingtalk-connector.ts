import type { ClawdbotConfig } from "../../config/config.js";
import type { ChannelOnboardingAdapter } from "./types.js";

const CHANNEL_ID = "dingtalk-connector" as const;

export const dingtalkConnectorOnboardingAdapter: ChannelOnboardingAdapter = {
  channel: CHANNEL_ID,
  getStatus: async ({ cfg }) => {
    const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID] as
      | Record<string, unknown>
      | undefined;
    const configured = Boolean(channelCfg?.clientId && channelCfg?.clientSecret);
    return {
      channel: CHANNEL_ID,
      configured,
      statusLines: [`钉钉: ${configured ? "已配置" : "需要填写凭证"}`],
      selectionHint: configured ? "recommended · configured" : "需要钉钉开放平台应用凭证",
      quickstartScore: configured ? 1 : 10,
    };
  },
  configure: async ({ cfg, prompter }) => {
    const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID] as
      | Record<string, unknown>
      | undefined;

    const existingClientId = (channelCfg?.clientId as string | undefined) ?? "";
    const clientId = String(
      await prompter.text({
        message: "输入钉钉应用 Client ID",
        initialValue: existingClientId,
        validate: (val) => (val?.trim() ? undefined : "必填"),
      }),
    ).trim();

    const existingClientSecret = (channelCfg?.clientSecret as string | undefined) ?? "";
    const clientSecret = String(
      await prompter.text({
        message: "输入钉钉应用 Client Secret",
        initialValue: existingClientSecret,
        validate: (val) => (val?.trim() ? undefined : "必填"),
      }),
    ).trim();

    // Default to existing gateway.auth.token if available
    const resolvedExistingToken =
      ((channelCfg?.gatewayToken as string | undefined) ?? "") ||
      ((
        (cfg.gateway as Record<string, unknown> | undefined)?.auth as
          | Record<string, unknown>
          | undefined
      )?.token as string | undefined) ||
      "";

    const gatewayToken = String(
      await prompter.text({
        message: "输入 Gateway 认证 Token（openclaw.json 中 gateway.auth.token 的值）",
        initialValue: resolvedExistingToken,
        validate: (val) => (val?.trim() ? undefined : "必填"),
      }),
    ).trim();

    const next = applyDingtalkConnectorConfig(cfg, { clientId, clientSecret, gatewayToken });
    return { cfg: next };
  },
  disable: (cfg) => {
    const next = { ...cfg } as ClawdbotConfig;
    const channels = { ...(next.channels as Record<string, unknown> | undefined) };
    const existing = channels[CHANNEL_ID] as Record<string, unknown> | undefined;
    if (existing) {
      channels[CHANNEL_ID] = { ...existing, enabled: false };
      next.channels = channels as ClawdbotConfig["channels"];
    }
    return next;
  },
};

function applyDingtalkConnectorConfig(
  cfg: ClawdbotConfig,
  updates: { clientId: string; clientSecret: string; gatewayToken: string },
): ClawdbotConfig {
  const next = { ...cfg } as ClawdbotConfig;
  const channels = { ...(next.channels as Record<string, unknown> | undefined) };
  const existing = (channels[CHANNEL_ID] as Record<string, unknown> | undefined) ?? {};
  channels[CHANNEL_ID] = {
    ...existing,
    clientId: updates.clientId,
    clientSecret: updates.clientSecret,
    gatewayToken: updates.gatewayToken,
    enabled: true,
  };
  next.channels = channels as ClawdbotConfig["channels"];

  // Ensure gateway.http.endpoints.chatCompletions.enabled = true (required by connector)
  const gateway = { ...(next.gateway as Record<string, unknown> | undefined) };
  const http = { ...(gateway.http as Record<string, unknown> | undefined) };
  const endpoints = { ...(http.endpoints as Record<string, unknown> | undefined) };
  const chatCompletions = {
    ...(endpoints.chatCompletions as Record<string, unknown> | undefined),
    enabled: true,
  };
  endpoints.chatCompletions = chatCompletions;
  http.endpoints = endpoints;
  gateway.http = http;

  // Ensure gateway.auth.mode = "token" and token is set
  const auth = { ...(gateway.auth as Record<string, unknown> | undefined) };
  if (!auth.mode) auth.mode = "token";
  if (!auth.token) auth.token = updates.gatewayToken;
  gateway.auth = auth;

  next.gateway = gateway as ClawdbotConfig["gateway"];

  return next;
}
