import type { ChannelOnboardingAdapter } from "openclaw/plugin-sdk";

const CHANNEL_ID = "wecom" as const;

export const wecomConnectorOnboardingAdapter: ChannelOnboardingAdapter = {
  channel: CHANNEL_ID,
  getStatus: async ({ cfg }) => {
    const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID] as
      | Record<string, unknown>
      | undefined;
    const configured = Boolean(channelCfg?.botId && channelCfg?.secret);
    return {
      channel: CHANNEL_ID,
      configured,
      statusLines: [`企业微信: ${configured ? "已配置" : "需要填写凭证"}`],
      selectionHint: configured ? "recommended · configured" : "需要企业微信机器人凭证",
      quickstartScore: configured ? 1 : 10,
    };
  },
  configure: async ({ cfg, prompter }) => {
    const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID] as
      | Record<string, unknown>
      | undefined;

    await prompter.note(
      "企业微信机器人需要以下配置信息：\n1. Bot ID: 企业微信机器人id\n2. Secret: 企业微信机器人密钥",
      "企业微信设置",
    );

    const existingBotId = (channelCfg?.botId as string | undefined) ?? "";
    const botId = (
      await prompter.text({
        message: "企业微信机器人 Bot ID",
        initialValue: existingBotId,
        validate: (val) => (val?.trim() ? undefined : "必填"),
      })
    )
      .toString()
      .trim();

    const existingSecret = (channelCfg?.secret as string | undefined) ?? "";
    const secret = (
      await prompter.text({
        message: "企业微信机器人 Secret",
        initialValue: existingSecret,
        validate: (val) => (val?.trim() ? undefined : "必填"),
      })
    )
      .toString()
      .trim();

    const next = applyWecomConnectorConfig(cfg, { botId, secret });
    return { cfg: next };
  },
  disable: (cfg) => {
    const next = { ...cfg } as Record<string, unknown>;
    const channels = { ...(next.channels as Record<string, unknown> | undefined) };
    const existing = channels[CHANNEL_ID] as Record<string, unknown> | undefined;
    if (existing) {
      channels[CHANNEL_ID] = { ...existing, enabled: false };
      next.channels = channels;
    }
    return next as Parameters<typeof wecomConnectorOnboardingAdapter.disable>[0];
  },
};

function applyWecomConnectorConfig(
  cfg: Record<string, unknown>,
  updates: { botId: string; secret: string },
): Record<string, unknown> {
  const next = { ...cfg };
  const channels = { ...(next.channels as Record<string, unknown> | undefined) };
  const existing = (channels[CHANNEL_ID] as Record<string, unknown> | undefined) ?? {};
  channels[CHANNEL_ID] = {
    ...existing,
    botId: updates.botId,
    secret: updates.secret,
    enabled: true,
  };
  next.channels = channels;
  return next;
}
