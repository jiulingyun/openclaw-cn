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

type ToolsBySenderKeyField = "id" | "e164" | "username" | "name";

const TOOLS_BY_SENDER_KEY_FIELDS = new Set<ToolsBySenderKeyField>([
  "id",
  "e164",
  "username",
  "name",
]);

function parseToolsBySenderKey(
  key: string,
): { field: ToolsBySenderKeyField; value: string } | null {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }
  const fieldRaw = key.slice(0, separatorIndex).trim().toLowerCase();
  if (!TOOLS_BY_SENDER_KEY_FIELDS.has(fieldRaw as ToolsBySenderKeyField)) {
    return null;
  }
  const value = key.slice(separatorIndex + 1);
  if (!value) {
    return null;
  }
  return { field: fieldRaw as ToolsBySenderKeyField, value };
}

/**
 * Resolve a per-sender tool policy from a toolsBySender map.
 *
 * Keys should use explicit type prefixes (`id:`, `e164:`, `username:`, `name:`).
 * Legacy unprefixed keys are still accepted and matched as `id:` only (deprecated).
 * Use `"*"` as a wildcard fallback.
 */
export function resolveToolsBySender(params: {
  toolsBySender: Record<string, GroupToolPolicyConfig>;
  senderId?: string;
  senderE164?: string;
  senderUsername?: string;
  senderName?: string;
}): GroupToolPolicyConfig | undefined {
  const { toolsBySender, senderId, senderE164, senderUsername, senderName } = params;
  for (const [key, policy] of Object.entries(toolsBySender)) {
    if (key === "*") continue;
    const explicit = parseToolsBySenderKey(key);
    if (explicit) {
      // Typed key: match only against the named field
      let fieldValue: string | undefined;
      switch (explicit.field) {
        case "id":
          fieldValue = senderId;
          break;
        case "e164":
          fieldValue = senderE164;
          break;
        case "username":
          fieldValue = senderUsername;
          break;
        case "name":
          fieldValue = senderName;
          break;
      }
      if (fieldValue !== undefined && fieldValue === explicit.value) {
        return policy;
      }
    } else {
      // Legacy untyped key: deprecated — match as senderId only
      process.emitWarning(
        `toolsBySender key "${key}" is untyped; use "id:${key}" for explicit ID matching. Untyped keys will be removed in a future release.`,
        "DeprecationWarning",
      );
      if (senderId !== undefined && senderId === key) {
        return policy;
      }
    }
  }
  return toolsBySender["*"];
}

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

export function resolveChannelGroupPolicy(params: {
  cfg: ClawdbotConfig;
  channel: GroupPolicyChannel;
  groupId?: string | null;
  accountId?: string | null;
}): ChannelGroupPolicy {
  const { cfg, channel } = params;
  const groups = resolveChannelGroups(cfg, channel, params.accountId);
  const allowlistEnabled = Boolean(groups && Object.keys(groups).length > 0);
  const normalizedId = params.groupId?.trim();
  const groupConfig = normalizedId && groups ? groups[normalizedId] : undefined;
  const defaultConfig = groups?.["*"];
  const allowAll = allowlistEnabled && Boolean(groups && Object.hasOwn(groups, "*"));
  const allowed =
    !allowlistEnabled ||
    allowAll ||
    (normalizedId ? Boolean(groups && Object.hasOwn(groups, normalizedId)) : false);
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
