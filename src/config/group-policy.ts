import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { ClawdbotConfig } from "./config.js";
import type { GroupToolPolicyConfig } from "./types.tools.js";

export type GroupPolicyChannel = ChannelId;

export type ChannelGroupConfig = {
  requireMention?: boolean;
  tools?: GroupToolPolicyConfig;
};

export type ChannelGroupPolicy = {
  allowlistEnabled: boolean;
  allowed: boolean;
  groupConfig?: ChannelGroupConfig;
  defaultConfig?: ChannelGroupConfig;
};

type ChannelGroups = Record<string, ChannelGroupConfig>;

type ChannelGroupPolicyMode = "open" | "allowlist" | "disabled";

function resolveChannelGroups(
  cfg: ClawdbotConfig,
  channel: GroupPolicyChannel,
  accountId?: string | null,
): ChannelGroups | undefined {
  const normalizedAccountId = normalizeAccountId(accountId);
  const channelConfig = cfg.channels?.[channel] as
    | {
        accounts?: Record<string, { groups?: ChannelGroups }>;
        groups?: ChannelGroups;
      }
    | undefined;
  if (!channelConfig) return undefined;
  const accountGroups =
    channelConfig.accounts?.[normalizedAccountId]?.groups ??
    channelConfig.accounts?.[
      Object.keys(channelConfig.accounts ?? {}).find(
        (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
      ) ?? ""
    ]?.groups;
  return accountGroups ?? channelConfig.groups;
}

function resolveChannelGroupPolicyMode(
  cfg: ClawdbotConfig,
  channel: GroupPolicyChannel,
  accountId?: string | null,
): ChannelGroupPolicyMode | undefined {
  const normalizedAccountId = normalizeAccountId(accountId);
  const channelConfig = cfg.channels?.[channel] as
    | {
        groupPolicy?: ChannelGroupPolicyMode;
        accounts?: Record<string, { groupPolicy?: ChannelGroupPolicyMode }>;
      }
    | undefined;
  if (!channelConfig) {
    return undefined;
  }
  const accountPolicy =
    channelConfig.accounts?.[normalizedAccountId]?.groupPolicy ??
    channelConfig.accounts?.[
      Object.keys(channelConfig.accounts ?? {}).find(
        (key) => key.toLowerCase() === normalizedAccountId.toLowerCase(),
      ) ?? ""
    ]?.groupPolicy;
  return accountPolicy ?? channelConfig.groupPolicy;
}

export function resolveChannelGroupPolicy(params: {
  cfg: ClawdbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
}): ChannelGroupPolicy {
  const { cfg, channel } = params;
  const groups = resolveChannelGroups(cfg, channel, params.accountId);
  const groupPolicy = resolveChannelGroupPolicyMode(cfg, channel, params.accountId);
  const hasGroups = Boolean(groups && Object.keys(groups).length > 0);
  const allowlistEnabled = groupPolicy === "allowlist" || hasGroups;
  const normalizedId = params.groupId?.trim();
  const groupConfig = normalizedId && groups ? groups[normalizedId] : undefined;
  const defaultConfig = groups?.["*"];
  const allowAll = allowlistEnabled && Boolean(groups && Object.hasOwn(groups, "*"));
  const allowed =
    groupPolicy === "disabled" ? false : !allowlistEnabled || allowAll || Boolean(groupConfig);
  return {
    allowlistEnabled,
    allowed,
    groupConfig,
    defaultConfig,
  };
}

export function resolveChannelGroupRequireMention(params: {
  cfg: ClawdbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
  requireMentionOverride?: boolean;
  overrideOrder?: "before-config" | "after-config";
}): boolean {
  const { requireMentionOverride, overrideOrder = "after-config" } = params;
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  const configMention =
    typeof groupConfig?.requireMention === "boolean"
      ? groupConfig.requireMention
      : typeof defaultConfig?.requireMention === "boolean"
        ? defaultConfig.requireMention
        : undefined;

  if (overrideOrder === "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  if (typeof configMention === "boolean") return configMention;
  if (overrideOrder !== "before-config" && typeof requireMentionOverride === "boolean") {
    return requireMentionOverride;
  }
  return true;
}

export function resolveChannelGroupToolsPolicy(params: {
  cfg: ClawdbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
}): GroupToolPolicyConfig | undefined {
  const { groupConfig, defaultConfig } = resolveChannelGroupPolicy(params);
  if (groupConfig?.tools) return groupConfig.tools;
  if (defaultConfig?.tools) return defaultConfig.tools;
  return undefined;
}
