import fs from "node:fs";

import { lookupContextTokens } from "../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { resolveModelAuthMode } from "../agents/model-auth.js";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
import { resolveSandboxRuntimeStatus } from "../agents/sandbox.js";
import { derivePromptTokens, normalizeUsage, type UsageLike } from "../agents/usage.js";
import type { ClawdbotConfig } from "../config/config.js";
import {
  resolveMainSessionKey,
  resolveSessionFilePath,
  type SessionEntry,
  type SessionScope,
} from "../config/sessions.js";
import {
  getTtsMaxLength,
  getTtsProvider,
  isSummarizationEnabled,
  resolveTtsAutoMode,
  resolveTtsConfig,
  resolveTtsPrefsPath,
} from "../tts/tts.js";
import { resolveCommitHash } from "../infra/git-commit.js";
import {
  estimateUsageCost,
  formatTokenCount as formatTokenCountShared,
  formatUsd,
  resolveModelCostConfig,
} from "../utils/usage-format.js";
import { VERSION } from "../version.js";
import { listChatCommands, listChatCommandsForConfig } from "./commands-registry.js";
import { listPluginCommands } from "../plugins/commands.js";
import type { SkillCommandSpec } from "../agents/skills.js";
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from "./thinking.js";
import type { MediaUnderstandingDecision } from "../media-understanding/types.js";

type AgentConfig = Partial<NonNullable<NonNullable<ClawdbotConfig["agents"]>["defaults"]>>;

export const formatTokenCount = formatTokenCountShared;

type QueueStatus = {
  mode?: string;
  depth?: number;
  debounceMs?: number;
  cap?: number;
  dropPolicy?: string;
  showDetails?: boolean;
};

type StatusArgs = {
  config?: ClawdbotConfig;
  agent: AgentConfig;
  sessionEntry?: SessionEntry;
  sessionKey?: string;
  sessionScope?: SessionScope;
  groupActivation?: "mention" | "always";
  resolvedThink?: ThinkLevel;
  resolvedVerbose?: VerboseLevel;
  resolvedReasoning?: ReasoningLevel;
  resolvedElevated?: ElevatedLevel;
  modelAuth?: string;
  usageLine?: string;
  timeLine?: string;
  queue?: QueueStatus;
  mediaDecisions?: MediaUnderstandingDecision[];
  subagentsLine?: string;
  includeTranscriptUsage?: boolean;
  now?: number;
};

function resolveRuntimeLabel(
  args: Pick<StatusArgs, "config" | "agent" | "sessionKey" | "sessionScope">,
): string {
  const sessionKey = args.sessionKey?.trim();
  if (args.config && sessionKey) {
    const runtimeStatus = resolveSandboxRuntimeStatus({
      cfg: args.config,
      sessionKey,
    });
    const sandboxMode = runtimeStatus.mode ?? "off";
    if (sandboxMode === "off") return "direct";
    const runtime = runtimeStatus.sandboxed ? "docker" : sessionKey ? "direct" : "unknown";
    return `${runtime}/${sandboxMode}`;
  }

  const sandboxMode = args.agent?.sandbox?.mode ?? "off";
  if (sandboxMode === "off") return "direct";
  const sandboxed = (() => {
    if (!sessionKey) return false;
    if (sandboxMode === "all") return true;
    if (args.config) {
      return resolveSandboxRuntimeStatus({
        cfg: args.config,
        sessionKey,
      }).sandboxed;
    }
    const sessionScope = args.sessionScope ?? "per-sender";
    const mainKey = resolveMainSessionKey({
      session: { scope: sessionScope },
    });
    return sessionKey !== mainKey.trim();
  })();
  const runtime = sandboxed ? "docker" : sessionKey ? "direct" : "unknown";
  return `${runtime}/${sandboxMode}`;
}

const formatTokens = (total: number | null | undefined, contextTokens: number | null) => {
  const ctx = contextTokens ?? null;
  if (total == null) {
    const ctxLabel = ctx ? formatTokenCount(ctx) : "?";
    return `?/${ctxLabel}`;
  }
  const pct = ctx ? Math.min(999, Math.round((total / ctx) * 100)) : null;
  const totalLabel = formatTokenCount(total);
  const ctxLabel = ctx ? formatTokenCount(ctx) : "?";
  return `${totalLabel}/${ctxLabel}${pct !== null ? ` (${pct}%)` : ""}`;
};

export const formatContextUsageShort = (
  total: number | null | undefined,
  contextTokens: number | null | undefined,
) => `上下文 ${formatTokens(total, contextTokens ?? null)}`;

const formatAge = (ms?: number | null) => {
  if (!ms || ms < 0) return "未知";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}小时前`;
  const days = Math.round(hours / 24);
  return `${days}天前`;
};

const formatQueueDetails = (queue?: QueueStatus) => {
  if (!queue) return "";
  const depth = typeof queue.depth === "number" ? `深度 ${queue.depth}` : null;
  if (!queue.showDetails) {
    return depth ? ` (${depth})` : "";
  }
  const detailParts: string[] = [];
  if (depth) detailParts.push(depth);
  if (typeof queue.debounceMs === "number") {
    const ms = Math.max(0, Math.round(queue.debounceMs));
    const label =
      ms >= 1000 ? `${ms % 1000 === 0 ? ms / 1000 : (ms / 1000).toFixed(1)}秒` : `${ms}毫秒`;
    detailParts.push(`防抖 ${label}`);
  }
  if (typeof queue.cap === "number") detailParts.push(`上限 ${queue.cap}`);
  if (queue.dropPolicy) detailParts.push(`丢弃 ${queue.dropPolicy}`);
  return detailParts.length ? ` (${detailParts.join(" · ")})` : "";
};

const readUsageFromSessionLog = (
  sessionId?: string,
  sessionEntry?: SessionEntry,
):
  | {
      input: number;
      output: number;
      promptTokens: number;
      total: number;
      model?: string;
    }
  | undefined => {
  // Transcripts are stored at the session file path (fallback: ~/.openclaw/sessions/<SessionId>.jsonl)
  if (!sessionId) return undefined;
  const logPath = resolveSessionFilePath(sessionId, sessionEntry);
  if (!fs.existsSync(logPath)) return undefined;

  try {
    const lines = fs.readFileSync(logPath, "utf-8").split(/\n+/);
    let input = 0;
    let output = 0;
    let promptTokens = 0;
    let model: string | undefined;
    let lastUsage: ReturnType<typeof normalizeUsage> | undefined;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as {
          message?: {
            usage?: UsageLike;
            model?: string;
          };
          usage?: UsageLike;
          model?: string;
        };
        const usageRaw = parsed.message?.usage ?? parsed.usage;
        const usage = normalizeUsage(usageRaw);
        if (usage) lastUsage = usage;
        model = parsed.message?.model ?? parsed.model ?? model;
      } catch {
        // ignore bad lines
      }
    }

    if (!lastUsage) return undefined;
    input = lastUsage.input ?? 0;
    output = lastUsage.output ?? 0;
    promptTokens = derivePromptTokens(lastUsage) ?? lastUsage.total ?? input + output;
    const total = lastUsage.total ?? promptTokens + output;
    if (promptTokens === 0 && total === 0) return undefined;
    return { input, output, promptTokens, total, model };
  } catch {
    return undefined;
  }
};

const formatUsagePair = (input?: number | null, output?: number | null) => {
  if (input == null && output == null) return null;
  const inputLabel = typeof input === "number" ? formatTokenCount(input) : "?";
  const outputLabel = typeof output === "number" ? formatTokenCount(output) : "?";
  return `🧮 Token: ${inputLabel} 输入 / ${outputLabel} 输出`;
};

const formatMediaUnderstandingLine = (decisions?: MediaUnderstandingDecision[]) => {
  if (!decisions || decisions.length === 0) return null;
  const parts = decisions
    .map((decision) => {
      const count = decision.attachments.length;
      const countLabel = count > 1 ? ` x${count}` : "";
      if (decision.outcome === "success") {
        const chosen = decision.attachments.find((entry) => entry.chosen)?.chosen;
        const provider = chosen?.provider?.trim();
        const model = chosen?.model?.trim();
        const modelLabel = provider ? (model ? `${provider}/${model}` : provider) : null;
        return `${decision.capability}${countLabel} ok${modelLabel ? ` (${modelLabel})` : ""}`;
      }
      if (decision.outcome === "no-attachment") {
        return `${decision.capability} none`;
      }
      if (decision.outcome === "disabled") {
        return `${decision.capability} off`;
      }
      if (decision.outcome === "scope-deny") {
        return `${decision.capability} denied`;
      }
      if (decision.outcome === "skipped") {
        const reason = decision.attachments
          .flatMap((entry) => entry.attempts.map((attempt) => attempt.reason).filter(Boolean))
          .find(Boolean);
        const shortReason = reason ? reason.split(":")[0]?.trim() : undefined;
        return `${decision.capability} skipped${shortReason ? ` (${shortReason})` : ""}`;
      }
      return null;
    })
    .filter((part): part is string => part != null);
  if (parts.length === 0) return null;
  if (parts.every((part) => part.endsWith(" none"))) return null;
  return `📎 Media: ${parts.join(" · ")}`;
};

const formatVoiceModeLine = (
  config?: ClawdbotConfig,
  sessionEntry?: SessionEntry,
): string | null => {
  if (!config) return null;
  const ttsConfig = resolveTtsConfig(config);
  const prefsPath = resolveTtsPrefsPath(ttsConfig);
  const autoMode = resolveTtsAutoMode({
    config: ttsConfig,
    prefsPath,
    sessionAuto: sessionEntry?.ttsAuto,
  });
  if (autoMode === "off") return null;
  const provider = getTtsProvider(ttsConfig, prefsPath);
  const maxLength = getTtsMaxLength(prefsPath);
  const summarize = isSummarizationEnabled(prefsPath) ? "on" : "off";
  return `🔊 Voice: ${autoMode} · provider=${provider} · limit=${maxLength} · summary=${summarize}`;
};

export function buildStatusMessage(args: StatusArgs): string {
  const now = args.now ?? Date.now();
  const entry = args.sessionEntry;
  const resolved = resolveConfiguredModelRef({
    cfg: {
      agents: {
        defaults: args.agent ?? {},
      },
    } as ClawdbotConfig,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
  const provider = entry?.providerOverride ?? resolved.provider ?? DEFAULT_PROVIDER;
  let model = entry?.modelOverride ?? resolved.model ?? DEFAULT_MODEL;
  let contextTokens =
    entry?.contextTokens ??
    args.agent?.contextTokens ??
    lookupContextTokens(model) ??
    DEFAULT_CONTEXT_TOKENS;

  let inputTokens = entry?.inputTokens;
  let outputTokens = entry?.outputTokens;
  let totalTokens = entry?.totalTokens ?? (entry?.inputTokens ?? 0) + (entry?.outputTokens ?? 0);

  // Prefer prompt-size tokens from the session transcript when it looks larger
  // (cached prompt tokens are often missing from agent meta/store).
  if (args.includeTranscriptUsage) {
    const logUsage = readUsageFromSessionLog(entry?.sessionId, entry);
    if (logUsage) {
      const candidate = logUsage.promptTokens || logUsage.total;
      if (!totalTokens || totalTokens === 0 || candidate > totalTokens) {
        totalTokens = candidate;
      }
      if (!model) model = logUsage.model ?? model;
      if (!contextTokens && logUsage.model) {
        contextTokens = lookupContextTokens(logUsage.model) ?? contextTokens;
      }
      if (!inputTokens || inputTokens === 0) inputTokens = logUsage.input;
      if (!outputTokens || outputTokens === 0) outputTokens = logUsage.output;
    }
  }

  const thinkLevel = args.resolvedThink ?? args.agent?.thinkingDefault ?? "off";
  const verboseLevel = args.resolvedVerbose ?? args.agent?.verboseDefault ?? "off";
  const reasoningLevel = args.resolvedReasoning ?? "off";
  const elevatedLevel =
    args.resolvedElevated ??
    args.sessionEntry?.elevatedLevel ??
    args.agent?.elevatedDefault ??
    "on";

  const runtime = { label: resolveRuntimeLabel(args) };

  const updatedAt = entry?.updatedAt;
  const sessionLine = [
    `会话: ${args.sessionKey ?? "未知"}`,
    typeof updatedAt === "number" ? `更新于 ${formatAge(now - updatedAt)}` : "无活动",
  ]
    .filter(Boolean)
    .join(" • ");

  const isGroupSession =
    entry?.chatType === "group" ||
    entry?.chatType === "channel" ||
    Boolean(args.sessionKey?.includes(":group:")) ||
    Boolean(args.sessionKey?.includes(":channel:"));
  const groupActivationValue = isGroupSession
    ? (args.groupActivation ?? entry?.groupActivation ?? "mention")
    : undefined;

  const contextLine = [
    `上下文: ${formatTokens(totalTokens, contextTokens ?? null)}`,
    `🧹 压缩次数: ${entry?.compactionCount ?? 0}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const queueMode = args.queue?.mode ?? "未知";
  const queueDetails = formatQueueDetails(args.queue);
  const verboseLabel =
    verboseLevel === "full" ? "详细:完整" : verboseLevel === "on" ? "详细" : null;
  const elevatedLabel =
    elevatedLevel && elevatedLevel !== "off"
      ? elevatedLevel === "on"
        ? "提权"
        : `提权:${elevatedLevel}`
      : null;
  const optionParts = [
    `运行时: ${runtime.label}`,
    `思考: ${thinkLevel}`,
    verboseLabel,
    reasoningLevel !== "off" ? `推理: ${reasoningLevel}` : null,
    elevatedLabel,
  ];
  const optionsLine = optionParts.filter(Boolean).join(" · ");
  const activationParts = [
    groupActivationValue ? `👥 激活: ${groupActivationValue}` : null,
    `🪢 队列: ${queueMode}${queueDetails}`,
  ];
  const activationLine = activationParts.filter(Boolean).join(" · ");

  const authMode = resolveModelAuthMode(provider, args.config);
  const authLabelValue =
    args.modelAuth ?? (authMode && authMode !== "unknown" ? authMode : undefined);
  const showCost = authLabelValue === "api-key" || authLabelValue === "mixed";
  const costConfig = showCost
    ? resolveModelCostConfig({
        provider,
        model,
        config: args.config,
      })
    : undefined;
  const hasUsage = typeof inputTokens === "number" || typeof outputTokens === "number";
  const cost =
    showCost && hasUsage
      ? estimateUsageCost({
          usage: {
            input: inputTokens ?? undefined,
            output: outputTokens ?? undefined,
          },
          cost: costConfig,
        })
      : undefined;
  const costLabel = showCost && hasUsage ? formatUsd(cost) : undefined;

  const modelLabel = model ? `${provider}/${model}` : "未知";
  const authLabel = authLabelValue ? ` · 🔑 ${authLabelValue}` : "";
  const modelLine = `🧠 模型: ${modelLabel}${authLabel}`;
  const commit = resolveCommitHash();
  const versionLine = `🦞 Clawdbot ${VERSION}${commit ? ` (${commit})` : ""}`;
  const usagePair = formatUsagePair(inputTokens, outputTokens);
  const costLine = costLabel ? `💵 成本: ${costLabel}` : null;
  const usageCostLine =
    usagePair && costLine ? `${usagePair} · ${costLine}` : (usagePair ?? costLine);
  const mediaLine = formatMediaUnderstandingLine(args.mediaDecisions);
  const voiceLine = formatVoiceModeLine(args.config, args.sessionEntry);

  return [
    versionLine,
    args.timeLine,
    modelLine,
    usageCostLine,
    `📚 ${contextLine}`,
    mediaLine,
    args.usageLine,
    `🧵 ${sessionLine}`,
    args.subagentsLine,
    `⚙️ ${optionsLine}`,
    voiceLine,
    activationLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildHelpMessage(cfg?: ClawdbotConfig): string {
  const options = [
    "/think <级别>",
    "/verbose on|full|off",
    "/reasoning on|off",
    "/elevated on|off|ask|full",
    "/model <ID>",
    "/usage off|tokens|full",
  ];
  if (cfg?.commands?.config === true) options.push("/config show");
  if (cfg?.commands?.debug === true) options.push("/debug show");
  return [
    "ℹ️ 帮助",
    "快捷方式: /new 重置 | /compact [指令] | /restart 重启 (需启用)",
    `选项: ${options.join(" | ")}`,
    "技能: /skill <名称> [输入]",
    "更多: /commands 查看所有命令",
  ].join("\n");
}

export function buildCommandsMessage(
  cfg?: ClawdbotConfig,
  skillCommands?: SkillCommandSpec[],
): string {
  const lines = ["ℹ️ 斜杠命令"];
  const commands = cfg
    ? listChatCommandsForConfig(cfg, { skillCommands })
    : listChatCommands({ skillCommands });
  for (const command of commands) {
    const primary = command.nativeName
      ? `/${command.nativeName}`
      : command.textAliases[0]?.trim() || `/${command.key}`;
    const seen = new Set<string>();
    const aliases = command.textAliases
      .map((alias) => alias.trim())
      .filter(Boolean)
      .filter((alias) => alias.toLowerCase() !== primary.toLowerCase())
      .filter((alias) => {
        const key = alias.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const aliasLabel = aliases.length ? ` (别名: ${aliases.join(", ")})` : "";
    const scopeLabel = command.scope === "text" ? " (仅文本)" : "";
    lines.push(`${primary}${aliasLabel}${scopeLabel} - ${command.description}`);
  }
  const pluginCommands = listPluginCommands();
  if (pluginCommands.length > 0) {
    lines.push("");
    lines.push("插件命令:");
    for (const command of pluginCommands) {
      const pluginLabel = command.pluginId ? ` (插件: ${command.pluginId})` : "";
      lines.push(`/${command.name}${pluginLabel} - ${command.description}`);
    }
  }
  return lines.join("\n");
}
