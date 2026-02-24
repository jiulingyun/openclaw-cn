import { resolveAgentConfig } from "../../agents/agent-scope.js";
import { getChannelDock } from "../../channels/dock.js";
import { normalizeChannelId } from "../../channels/plugins/index.js";
import { CHAT_CHANNEL_ORDER } from "../../channels/registry.js";
import type { AgentElevatedAllowFromConfig, ClawdbotConfig } from "../../config/config.js";
import { INTERNAL_MESSAGE_CHANNEL } from "../../utils/message-channel.js";
import { formatCliCommand } from "../../cli/command-format.js";
import type { MsgContext } from "../templating.js";

type ExplicitElevatedAllowField = "id" | "from" | "e164" | "name" | "username" | "tag";

const EXPLICIT_ELEVATED_ALLOW_FIELDS = new Set<ExplicitElevatedAllowField>([
  "id",
  "from",
  "e164",
  "name",
  "username",
  "tag",
]);

function normalizeAllowToken(value?: string) {
  if (!value) return "";
  return value.trim().toLowerCase();
}

const SENDER_PREFIXES = [
  ...CHAT_CHANNEL_ORDER,
  INTERNAL_MESSAGE_CHANNEL,
  "user",
  "group",
  "channel",
];
const SENDER_PREFIX_RE = new RegExp(`^(${SENDER_PREFIXES.join("|")}):`, "i");

function stripSenderPrefix(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.replace(SENDER_PREFIX_RE, "");
}

function parseExplicitElevatedAllowEntry(
  entry: string,
): { field: ExplicitElevatedAllowField; value: string } | null {
  const separatorIndex = entry.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }
  const fieldRaw = entry.slice(0, separatorIndex).trim().toLowerCase();
  if (!EXPLICIT_ELEVATED_ALLOW_FIELDS.has(fieldRaw as ExplicitElevatedAllowField)) {
    return null;
  }
  const value = entry.slice(separatorIndex + 1).trim();
  if (!value) {
    return null;
  }
  return {
    field: fieldRaw as ExplicitElevatedAllowField,
    value,
  };
}

function addTokenVariants(tokens: Set<string>, value: string) {
  if (!value) {
    return;
  }
  tokens.add(value);
  const normalized = normalizeAllowToken(value);
  if (normalized) {
    tokens.add(normalized);
  }
}

function addProviderFormattedTokens(params: {
  cfg: ClawdbotConfig;
  provider: string;
  accountId?: string;
  values: string[];
  tokens: Set<string>;
}) {
  const normalizedProvider = normalizeChannelId(params.provider);
  const dock = normalizedProvider ? getChannelDock(normalizedProvider) : undefined;
  const formatted = dock?.config?.formatAllowFrom
    ? dock.config.formatAllowFrom({
        cfg: params.cfg,
        accountId: params.accountId,
        allowFrom: params.values,
      })
    : params.values.map((entry) => String(entry).trim()).filter(Boolean);
  for (const entry of formatted) {
    addTokenVariants(params.tokens, entry);
  }
}

function matchesProviderFormattedTokens(params: {
  cfg: ClawdbotConfig;
  provider: string;
  accountId?: string;
  value: string;
  includeStripped?: boolean;
  tokens: Set<string>;
}): boolean {
  const probeTokens = new Set<string>();
  const values = params.includeStripped
    ? [params.value, stripSenderPrefix(params.value)].filter(Boolean)
    : [params.value];
  addProviderFormattedTokens({
    cfg: params.cfg,
    provider: params.provider,
    accountId: params.accountId,
    values,
    tokens: probeTokens,
  });
  for (const token of probeTokens) {
    if (params.tokens.has(token)) {
      return true;
    }
  }
  return false;
}

function resolveElevatedAllowList(
  allowFrom: AgentElevatedAllowFromConfig | undefined,
  provider: string,
  fallbackAllowFrom?: Array<string | number>,
): Array<string | number> | undefined {
  if (!allowFrom) return fallbackAllowFrom;
  const value = allowFrom[provider];
  return Array.isArray(value) ? value : fallbackAllowFrom;
}

function isApprovedElevatedSender(params: {
  cfg: ClawdbotConfig;
  provider: string;
  ctx: MsgContext;
  allowFrom?: AgentElevatedAllowFromConfig;
  fallbackAllowFrom?: Array<string | number>;
}): boolean {
  const rawAllow = resolveElevatedAllowList(
    params.allowFrom,
    params.provider,
    params.fallbackAllowFrom,
  );
  if (!rawAllow || rawAllow.length === 0) return false;

  const allowTokens = rawAllow.map((entry) => String(entry).trim()).filter(Boolean);
  if (allowTokens.length === 0) return false;
  if (allowTokens.some((entry) => entry === "*")) return true;

  // Build sender identity tokens from immutable sender-scoped fields only.
  // Recipient fields (ctx.To) and mutable display fields are intentionally excluded
  // to prevent cross-field collisions and recipient-token bypasses.
  const identityTokens = new Set<string>();
  const addIdentityValue = (value?: string) => {
    if (!value) return;
    addTokenVariants(identityTokens, value);
  };
  addIdentityValue(params.ctx.SenderId);
  addIdentityValue(params.ctx.SenderE164);
  if (params.ctx.From) {
    addIdentityValue(params.ctx.From);
    addIdentityValue(stripSenderPrefix(params.ctx.From));
  }
  // Also apply provider-specific formatting (e.g. phone normalization) to raw identity values
  const idValues = [
    params.ctx.SenderId,
    params.ctx.SenderE164,
    params.ctx.From,
  ].filter(Boolean) as string[];
  addProviderFormattedTokens({
    cfg: params.cfg,
    provider: params.provider,
    accountId: params.ctx.AccountId,
    values: idValues,
    tokens: identityTokens,
  });

  for (const rawEntry of allowTokens) {
    const entry = rawEntry.trim();
    if (!entry) continue;

    const explicit = parseExplicitElevatedAllowEntry(entry);
    if (explicit) {
      // Explicit prefix: match only against the named mutable/identity field
      let fieldValue: string | undefined;
      switch (explicit.field) {
        case "id":
          fieldValue = params.ctx.SenderId;
          break;
        case "from":
          fieldValue = params.ctx.From;
          break;
        case "e164":
          fieldValue = params.ctx.SenderE164;
          break;
        case "name":
          fieldValue = params.ctx.SenderName;
          break;
        case "username":
          fieldValue = params.ctx.SenderUsername;
          break;
        case "tag":
          fieldValue = params.ctx.SenderTag;
          break;
      }
      if (!fieldValue) continue;
      const fieldNorm = normalizeAllowToken(fieldValue);
      const entryNorm = normalizeAllowToken(explicit.value);
      if (fieldValue === explicit.value || (fieldNorm && fieldNorm === entryNorm)) return true;
    } else {
      // Untyped entry: match against sender identity fields only
      if (
        matchesProviderFormattedTokens({
          cfg: params.cfg,
          provider: params.provider,
          accountId: params.ctx.AccountId,
          value: entry,
          includeStripped: true,
          tokens: identityTokens,
        })
      ) {
        return true;
      }
    }
  }

  return false;
}

export function resolveElevatedPermissions(params: {
  cfg: ClawdbotConfig;
  agentId: string;
  ctx: MsgContext;
  provider: string;
}): {
  enabled: boolean;
  allowed: boolean;
  failures: Array<{ gate: string; key: string }>;
} {
  const globalConfig = params.cfg.tools?.elevated;
  const agentConfig = resolveAgentConfig(params.cfg, params.agentId)?.tools?.elevated;
  const globalEnabled = globalConfig?.enabled !== false;
  const agentEnabled = agentConfig?.enabled !== false;
  const enabled = globalEnabled && agentEnabled;
  const failures: Array<{ gate: string; key: string }> = [];
  if (!globalEnabled) failures.push({ gate: "enabled", key: "tools.elevated.enabled" });
  if (!agentEnabled)
    failures.push({
      gate: "enabled",
      key: "agents.list[].tools.elevated.enabled",
    });
  if (!enabled) return { enabled, allowed: false, failures };
  if (!params.provider) {
    failures.push({ gate: "provider", key: "ctx.Provider" });
    return { enabled, allowed: false, failures };
  }

  const normalizedProvider = normalizeChannelId(params.provider);
  const dockFallbackAllowFrom = normalizedProvider
    ? getChannelDock(normalizedProvider)?.elevated?.allowFromFallback?.({
        cfg: params.cfg,
        accountId: params.ctx.AccountId,
      })
    : undefined;
  const fallbackAllowFrom = dockFallbackAllowFrom;
  const globalAllowed = isApprovedElevatedSender({
    cfg: params.cfg,
    provider: params.provider,
    ctx: params.ctx,
    allowFrom: globalConfig?.allowFrom,
    fallbackAllowFrom,
  });
  if (!globalAllowed) {
    failures.push({
      gate: "allowFrom",
      key: `tools.elevated.allowFrom.${params.provider}`,
    });
    return { enabled, allowed: false, failures };
  }

  const agentAllowed = agentConfig?.allowFrom
    ? isApprovedElevatedSender({
        cfg: params.cfg,
        provider: params.provider,
        ctx: params.ctx,
        allowFrom: agentConfig.allowFrom,
        fallbackAllowFrom,
      })
    : true;
  if (!agentAllowed) {
    failures.push({
      gate: "allowFrom",
      key: `agents.list[].tools.elevated.allowFrom.${params.provider}`,
    });
  }
  return { enabled, allowed: globalAllowed && agentAllowed, failures };
}

export function formatElevatedUnavailableMessage(params: {
  runtimeSandboxed: boolean;
  failures: Array<{ gate: string; key: string }>;
  sessionKey?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    `elevated is not available right now (runtime=${params.runtimeSandboxed ? "sandboxed" : "direct"}).`,
  );
  if (params.failures.length > 0) {
    lines.push(`Failing gates: ${params.failures.map((f) => `${f.gate} (${f.key})`).join(", ")}`);
  } else {
    lines.push(
      "Failing gates: enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled), allowFrom (tools.elevated.allowFrom.<provider>).",
    );
  }
  lines.push("Fix-it keys:");
  lines.push("- tools.elevated.enabled");
  lines.push("- tools.elevated.allowFrom.<provider>");
  lines.push("- agents.list[].tools.elevated.enabled");
  lines.push("- agents.list[].tools.elevated.allowFrom.<provider>");
  if (params.sessionKey) {
    lines.push(
      `See: ${formatCliCommand(`openclaw-cn sandbox explain --session ${params.sessionKey}`)}`,
    );
  }
  return lines.join("\n");
}
