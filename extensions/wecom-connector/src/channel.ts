import type {
  ChannelMeta,
  ChannelPlugin,
  OpenClawConfig as ClawdbotConfig,
} from "openclaw/plugin-sdk";
import { wecomConnectorOnboardingAdapter } from "./onboarding.js";

const CHANNEL_ID = "wecom";

const meta: ChannelMeta = {
  id: CHANNEL_ID,
  label: "企业微信",
  selectionLabel: "企业微信 (WeCom)",
  docsPath: "/channels/wecom",
  docsLabel: "wecom",
  blurb: "企业微信机器人接入插件。",
  aliases: ["wechat-work", "wxwork"],
  order: 45,
};

type WecomConnectorAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  botId?: string;
};

export const wecomConnectorPlugin: ChannelPlugin<WecomConnectorAccount> = {
  id: CHANNEL_ID,
  meta,
  capabilities: {
    chatTypes: ["direct", "channel"],
    polls: false,
    threads: false,
    media: false,
    nativeCommands: false,
    reactions: false,
    edit: false,
    reply: false,
  },
  reload: { configPrefixes: [`channels.${CHANNEL_ID}`] },
  configSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        botId: { type: "string" },
        secret: { type: "string" },
        sessionTimeout: { type: "integer", minimum: 0 },
      },
      required: [],
    },
  },
  config: {
    listAccountIds: (cfg) => {
      const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID];
      return channelCfg ? ["default"] : [];
    },
    resolveAccount: (cfg, accountId) => {
      const channelCfg = (cfg.channels as Record<string, unknown> | undefined)?.[CHANNEL_ID] as
        | Record<string, unknown>
        | undefined;
      const botId = (channelCfg?.botId as string | undefined) ?? "";
      return {
        accountId: accountId ?? "default",
        enabled: channelCfg?.enabled !== false && Boolean(channelCfg),
        configured: Boolean(channelCfg?.botId && channelCfg?.secret),
        botId: botId || undefined,
      };
    },
    defaultAccountId: () => "default",
    setAccountEnabled: ({ cfg, enabled }) => {
      const next = { ...cfg } as ClawdbotConfig;
      const channels = { ...(next.channels as Record<string, unknown> | undefined) };
      const existing = (channels[CHANNEL_ID] as Record<string, unknown> | undefined) ?? {};
      channels[CHANNEL_ID] = { ...existing, enabled };
      next.channels = channels as ClawdbotConfig["channels"];
      return next;
    },
    deleteAccount: ({ cfg }) => {
      const next = { ...cfg } as ClawdbotConfig;
      const channels = { ...(next.channels as Record<string, unknown> | undefined) };
      delete channels[CHANNEL_ID];
      next.channels = channels as ClawdbotConfig["channels"];
      return next;
    },
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      botId: account.botId,
    }),
    resolveAllowFrom: () => [],
    formatAllowFrom: ({ allowFrom }) => allowFrom.map((e) => String(e).trim()).filter(Boolean),
  },
  setup: {
    resolveAccountId: () => "default",
    applyAccountConfig: ({ cfg }) => {
      const next = { ...cfg } as ClawdbotConfig;
      const channels = { ...(next.channels as Record<string, unknown> | undefined) };
      const existing = (channels[CHANNEL_ID] as Record<string, unknown> | undefined) ?? {};
      channels[CHANNEL_ID] = { ...existing, enabled: true };
      next.channels = channels as ClawdbotConfig["channels"];
      return next;
    },
  },
  onboarding: wecomConnectorOnboardingAdapter,
  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
      port: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      port: snapshot.port ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      port: runtime?.port ?? null,
    }),
  },
};
