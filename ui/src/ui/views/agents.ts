import { html, nothing } from "lit";
import type {
  AgentFileEntry,
  AgentsFilesListResult,
  AgentsListResult,
  AgentIdentityResult,
  ChannelAccountSnapshot,
  ChannelsStatusSnapshot,
  CronJob,
  CronStatus,
  SkillStatusEntry,
  SkillStatusReport,
} from "../types";
import {
  expandToolGroups,
  normalizeToolName,
  resolveToolProfilePolicy,
} from "../../../../src/agents/tool-policy.js";
import { formatAgo } from "../format";
import {
  formatCronPayload,
  formatCronSchedule,
  formatCronState,
  formatNextRun,
} from "../presenter";

export type AgentsPanel = "overview" | "files" | "tools" | "skills" | "channels" | "cron";

export type AgentsProps = {
  loading: boolean;
  error: string | null;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  activePanel: AgentsPanel;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  channelsLoading: boolean;
  channelsError: string | null;
  channelsSnapshot: ChannelsStatusSnapshot | null;
  channelsLastSuccess: number | null;
  cronLoading: boolean;
  cronStatus: CronStatus | null;
  cronJobs: CronJob[];
  cronError: string | null;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFilesList: AgentsFilesListResult | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  agentIdentityById: Record<string, AgentIdentityResult>;
  agentSkillsLoading: boolean;
  agentSkillsReport: SkillStatusReport | null;
  agentSkillsError: string | null;
  agentSkillsAgentId: string | null;
  skillsFilter: string;
  onRefresh: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectPanel: (panel: AgentsPanel) => void;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
  onToolsProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onToolsOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
  onChannelsRefresh: () => void;
  onCronRefresh: () => void;
  onSkillsFilterChange: (next: string) => void;
  onSkillsRefresh: () => void;
  onAgentSkillToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onAgentSkillsClear: (agentId: string) => void;
  onAgentSkillsDisableAll: (agentId: string) => void;
};

const TOOL_SECTIONS = [
  {
    id: "fs",
    label: "文件",
    tools: [
      { id: "read", label: "read", description: "读取文件内容" },
      { id: "write", label: "write", description: "创建或覆盖文件" },
      { id: "edit", label: "edit", description: "精确编辑" },
      { id: "apply_patch", label: "apply_patch", description: "补丁文件 (OpenAI)" },
    ],
  },
  {
    id: "runtime",
    label: "运行时",
    tools: [
      { id: "exec", label: "exec", description: "执行 Shell 命令" },
      { id: "process", label: "process", description: "管理后台进程" },
    ],
  },
  {
    id: "web",
    label: "网络",
    tools: [
      { id: "web_search", label: "web_search", description: "搜索网络" },
      { id: "web_fetch", label: "web_fetch", description: "获取网络内容" },
    ],
  },
  {
    id: "memory",
    label: "记忆",
    tools: [
      { id: "memory_search", label: "memory_search", description: "语义搜索" },
      { id: "memory_get", label: "memory_get", description: "读取记忆文件" },
    ],
  },
  {
    id: "sessions",
    label: "会话",
    tools: [
      { id: "sessions_list", label: "sessions_list", description: "列出会话" },
      { id: "sessions_history", label: "sessions_history", description: "会话历史" },
      { id: "sessions_send", label: "sessions_send", description: "发送到会话" },
      { id: "sessions_spawn", label: "sessions_spawn", description: "派生子代理" },
      { id: "session_status", label: "session_status", description: "会话状态" },
    ],
  },
  {
    id: "ui",
    label: "界面",
    tools: [
      { id: "browser", label: "browser", description: "控制网页浏览器" },
      { id: "canvas", label: "canvas", description: "控制画布" },
    ],
  },
  {
    id: "messaging",
    label: "消息",
    tools: [{ id: "message", label: "message", description: "发送消息" }],
  },
  {
    id: "automation",
    label: "自动化",
    tools: [
      { id: "cron", label: "cron", description: "定时任务" },
      { id: "gateway", label: "gateway", description: "网关控制" },
    ],
  },
  {
    id: "nodes",
    label: "节点",
    tools: [{ id: "nodes", label: "nodes", description: "节点 + 设备" }],
  },
  {
    id: "agents",
    label: "代理",
    tools: [{ id: "agents_list", label: "agents_list", description: "列出代理" }],
  },
  {
    id: "media",
    label: "媒体",
    tools: [{ id: "image", label: "image", description: "图像理解" }],
  },
];

const PROFILE_OPTIONS = [
  { id: "minimal", label: "最小" },
  { id: "coding", label: "编码" },
  { id: "messaging", label: "消息" },
  { id: "full", label: "完整" },
] as const;

type ToolPolicy = {
  allow?: string[];
  deny?: string[];
};

type AgentConfigEntry = {
  id: string;
  name?: string;
  workspace?: string;
  agentDir?: string;
  model?: unknown;
  skills?: string[];
  tools?: {
    profile?: string;
    allow?: string[];
    alsoAllow?: string[];
    deny?: string[];
  };
};

type ConfigSnapshot = {
  agents?: {
    defaults?: { workspace?: string; model?: unknown; models?: Record<string, { alias?: string }> };
    list?: AgentConfigEntry[];
  };
  tools?: {
    profile?: string;
    allow?: string[];
    alsoAllow?: string[];
    deny?: string[];
  };
};

function normalizeAgentLabel(agent: { id: string; name?: string; identity?: { name?: string } }) {
  return agent.name?.trim() || agent.identity?.name?.trim() || agent.id;
}

function isLikelyEmoji(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.length > 16) {
    return false;
  }
  let hasNonAscii = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed.charCodeAt(i) > 127) {
      hasNonAscii = true;
      break;
    }
  }
  if (!hasNonAscii) {
    return false;
  }
  if (trimmed.includes("://") || trimmed.includes("/") || trimmed.includes(".")) {
    return false;
  }
  return true;
}

function resolveAgentEmoji(
  agent: { identity?: { emoji?: string; avatar?: string } },
  agentIdentity?: AgentIdentityResult | null,
) {
  const identityEmoji = agentIdentity?.emoji?.trim();
  if (identityEmoji && isLikelyEmoji(identityEmoji)) {
    return identityEmoji;
  }
  const agentEmoji = agent.identity?.emoji?.trim();
  if (agentEmoji && isLikelyEmoji(agentEmoji)) {
    return agentEmoji;
  }
  const identityAvatar = agentIdentity?.avatar?.trim();
  if (identityAvatar && isLikelyEmoji(identityAvatar)) {
    return identityAvatar;
  }
  const avatar = agent.identity?.avatar?.trim();
  if (avatar && isLikelyEmoji(avatar)) {
    return avatar;
  }
  return "";
}

function agentBadgeText(agentId: string, defaultId: string | null) {
  return defaultId && agentId === defaultId ? "默认" : null;
}

function formatBytes(bytes?: number) {
  if (bytes == null || !Number.isFinite(bytes)) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function resolveAgentConfig(config: Record<string, unknown> | null, agentId: string) {
  const cfg = config as ConfigSnapshot | null;
  const list = cfg?.agents?.list ?? [];
  const entry = list.find((agent) => agent?.id === agentId);
  return {
    entry,
    defaults: cfg?.agents?.defaults,
    globalTools: cfg?.tools,
  };
}

type AgentContext = {
  workspace: string;
  model: string;
  identityName: string;
  identityEmoji: string;
  skillsLabel: string;
  isDefault: boolean;
};

function buildAgentContext(
  agent: AgentsListResult["agents"][number],
  configForm: Record<string, unknown> | null,
  agentFilesList: AgentsFilesListResult | null,
  defaultId: string | null,
  agentIdentity?: AgentIdentityResult | null,
): AgentContext {
  const config = resolveAgentConfig(configForm, agent.id);
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles || config.entry?.workspace || config.defaults?.workspace || "default";
  const modelLabel = config.entry?.model
    ? resolveModelLabel(config.entry?.model)
    : resolveModelLabel(config.defaults?.model);
  const identityName =
    agentIdentity?.name?.trim() ||
    agent.identity?.name?.trim() ||
    agent.name?.trim() ||
    config.entry?.name ||
    agent.id;
  const identityEmoji = resolveAgentEmoji(agent, agentIdentity) || "-";
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  return {
    workspace,
    model: modelLabel,
    identityName,
    identityEmoji,
    skillsLabel: skillFilter ? `已选择 ${skillCount} 个` : "全部技能",
    isDefault: Boolean(defaultId && agent.id === defaultId),
  };
}

function resolveModelLabel(model?: unknown): string {
  if (!model) {
    return "-";
  }
  if (typeof model === "string") {
    return model.trim() || "-";
  }
  if (typeof model === "object" && model) {
    const record = model as { primary?: string; fallbacks?: string[] };
    const primary = record.primary?.trim();
    if (primary) {
      const fallbackCount = Array.isArray(record.fallbacks) ? record.fallbacks.length : 0;
      return fallbackCount > 0 ? `${primary} (+${fallbackCount} 备选)` : primary;
    }
  }
  return "-";
}

function resolveModelPrimary(model?: unknown): string | null {
  if (!model) {
    return null;
  }
  if (typeof model === "string") {
    const trimmed = model.trim();
    return trimmed || null;
  }
  if (typeof model === "object" && model) {
    const record = model as Record<string, unknown>;
    const candidate =
      typeof record.primary === "string"
        ? record.primary
        : typeof record.model === "string"
          ? record.model
          : typeof record.id === "string"
            ? record.id
            : typeof record.value === "string"
              ? record.value
              : null;
    const primary = candidate?.trim();
    return primary || null;
  }
  return null;
}

function resolveModelFallbacks(model?: unknown): string[] | null {
  if (!model || typeof model === "string") {
    return null;
  }
  if (typeof model === "object" && model) {
    const record = model as Record<string, unknown>;
    const fallbacks = Array.isArray(record.fallbacks)
      ? record.fallbacks
      : Array.isArray(record.fallback)
        ? record.fallback
        : null;
    return fallbacks
      ? fallbacks.filter((entry): entry is string => typeof entry === "string")
      : null;
  }
  return null;
}

function parseFallbackList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type ConfiguredModelOption = {
  value: string;
  label: string;
};

function resolveConfiguredModels(
  configForm: Record<string, unknown> | null,
): ConfiguredModelOption[] {
  const cfg = configForm as ConfigSnapshot | null;
  const models = cfg?.agents?.defaults?.models;
  if (!models || typeof models !== "object") {
    return [];
  }
  const options: ConfiguredModelOption[] = [];
  for (const [modelId, modelRaw] of Object.entries(models)) {
    const trimmed = modelId.trim();
    if (!trimmed) {
      continue;
    }
    const alias =
      modelRaw && typeof modelRaw === "object" && "alias" in modelRaw
        ? typeof (modelRaw as { alias?: unknown }).alias === "string"
          ? (modelRaw as { alias?: string }).alias?.trim()
          : undefined
        : undefined;
    const label = alias && alias !== trimmed ? `${alias} (${trimmed})` : trimmed;
    options.push({ value: trimmed, label });
  }
  return options;
}

function buildModelOptions(configForm: Record<string, unknown> | null, current?: string | null) {
  const options = resolveConfiguredModels(configForm);
  const hasCurrent = current ? options.some((option) => option.value === current) : false;
  if (current && !hasCurrent) {
    options.unshift({ value: current, label: `当前 (${current})` });
  }
  if (options.length === 0) {
    return html`
      <option value="" disabled>未配置模型</option>
    `;
  }
  return options.map((option) => html`<option value=${option.value}>${option.label}</option>`);
}

type CompiledPattern =
  | { kind: "all" }
  | { kind: "exact"; value: string }
  | { kind: "regex"; value: RegExp };

function compilePattern(pattern: string): CompiledPattern {
  const normalized = normalizeToolName(pattern);
  if (!normalized) {
    return { kind: "exact", value: "" };
  }
  if (normalized === "*") {
    return { kind: "all" };
  }
  if (!normalized.includes("*")) {
    return { kind: "exact", value: normalized };
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  return { kind: "regex", value: new RegExp(`^${escaped.replaceAll("\\*", ".*")}$`) };
}

function compilePatterns(patterns?: string[]): CompiledPattern[] {
  if (!Array.isArray(patterns)) {
    return [];
  }
  return expandToolGroups(patterns)
    .map(compilePattern)
    .filter((pattern) => {
      return pattern.kind !== "exact" || pattern.value.length > 0;
    });
}

function matchesAny(name: string, patterns: CompiledPattern[]) {
  for (const pattern of patterns) {
    if (pattern.kind === "all") {
      return true;
    }
    if (pattern.kind === "exact" && name === pattern.value) {
      return true;
    }
    if (pattern.kind === "regex" && pattern.value.test(name)) {
      return true;
    }
  }
  return false;
}

function isAllowedByPolicy(name: string, policy?: ToolPolicy) {
  if (!policy) {
    return true;
  }
  const normalized = normalizeToolName(name);
  const deny = compilePatterns(policy.deny);
  if (matchesAny(normalized, deny)) {
    return false;
  }
  const allow = compilePatterns(policy.allow);
  if (allow.length === 0) {
    return true;
  }
  if (matchesAny(normalized, allow)) {
    return true;
  }
  if (normalized === "apply_patch" && matchesAny("exec", allow)) {
    return true;
  }
  return false;
}

function matchesList(name: string, list?: string[]) {
  if (!Array.isArray(list) || list.length === 0) {
    return false;
  }
  const normalized = normalizeToolName(name);
  const patterns = compilePatterns(list);
  if (matchesAny(normalized, patterns)) {
    return true;
  }
  if (normalized === "apply_patch" && matchesAny("exec", patterns)) {
    return true;
  }
  return false;
}

export function renderAgents(props: AgentsProps) {
  const agents = props.agentsList?.agents ?? [];
  const defaultId = props.agentsList?.defaultId ?? null;
  const selectedId = props.selectedAgentId ?? defaultId ?? agents[0]?.id ?? null;
  const selectedAgent = selectedId
    ? (agents.find((agent) => agent.id === selectedId) ?? null)
    : null;

  return html`
    <div class="agents-layout">
      <section class="card agents-sidebar">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">代理</div>
            <div class="card-sub">已配置 ${agents.length} 个。</div>
          </div>
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "加载中…" : "刷新"}
          </button>
        </div>
        ${
          props.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
            : nothing
        }
        <div class="agent-list" style="margin-top: 12px;">
          ${
            agents.length === 0
              ? html`
                  <div class="muted">未找到代理。</div>
                `
              : agents.map((agent) => {
                  const badge = agentBadgeText(agent.id, defaultId);
                  const emoji = resolveAgentEmoji(agent, props.agentIdentityById[agent.id] ?? null);
                  return html`
                    <button
                      type="button"
                      class="agent-row ${selectedId === agent.id ? "active" : ""}"
                      @click=${() => props.onSelectAgent(agent.id)}
                    >
                      <div class="agent-avatar">
                        ${emoji || normalizeAgentLabel(agent).slice(0, 1)}
                      </div>
                      <div class="agent-info">
                        <div class="agent-title">${normalizeAgentLabel(agent)}</div>
                        <div class="agent-sub mono">${agent.id}</div>
                      </div>
                      ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
                    </button>
                  `;
                })
          }
        </div>
      </section>
      <section class="agents-main">
        ${
          !selectedAgent
            ? html`
                <div class="card">
                  <div class="card-title">选择一个代理</div>
                  <div class="card-sub">选择一个代理以查看其工作区和工具。</div>
                </div>
              `
            : html`
              ${renderAgentHeader(
                selectedAgent,
                defaultId,
                props.agentIdentityById[selectedAgent.id] ?? null,
              )}
              ${renderAgentTabs(props.activePanel, (panel) => props.onSelectPanel(panel))}
              ${
                props.activePanel === "overview"
                  ? renderAgentOverview({
                      agent: selectedAgent,
                      defaultId,
                      configForm: props.configForm,
                      agentFilesList: props.agentFilesList,
                      agentIdentity: props.agentIdentityById[selectedAgent.id] ?? null,
                      agentIdentityError: props.agentIdentityError,
                      agentIdentityLoading: props.agentIdentityLoading,
                      configLoading: props.configLoading,
                      configSaving: props.configSaving,
                      configDirty: props.configDirty,
                      onConfigReload: props.onConfigReload,
                      onConfigSave: props.onConfigSave,
                      onModelChange: props.onModelChange,
                      onModelFallbacksChange: props.onModelFallbacksChange,
                    })
                  : nothing
              }
              ${
                props.activePanel === "files"
                  ? renderAgentFiles({
                      agentId: selectedAgent.id,
                      agentFilesList: props.agentFilesList,
                      agentFilesLoading: props.agentFilesLoading,
                      agentFilesError: props.agentFilesError,
                      agentFileActive: props.agentFileActive,
                      agentFileContents: props.agentFileContents,
                      agentFileDrafts: props.agentFileDrafts,
                      agentFileSaving: props.agentFileSaving,
                      onLoadFiles: props.onLoadFiles,
                      onSelectFile: props.onSelectFile,
                      onFileDraftChange: props.onFileDraftChange,
                      onFileReset: props.onFileReset,
                      onFileSave: props.onFileSave,
                    })
                  : nothing
              }
              ${
                props.activePanel === "tools"
                  ? renderAgentTools({
                      agentId: selectedAgent.id,
                      configForm: props.configForm,
                      configLoading: props.configLoading,
                      configSaving: props.configSaving,
                      configDirty: props.configDirty,
                      onProfileChange: props.onToolsProfileChange,
                      onOverridesChange: props.onToolsOverridesChange,
                      onConfigReload: props.onConfigReload,
                      onConfigSave: props.onConfigSave,
                    })
                  : nothing
              }
              ${
                props.activePanel === "skills"
                  ? renderAgentSkills({
                      agentId: selectedAgent.id,
                      report: props.agentSkillsReport,
                      loading: props.agentSkillsLoading,
                      error: props.agentSkillsError,
                      activeAgentId: props.agentSkillsAgentId,
                      configForm: props.configForm,
                      configLoading: props.configLoading,
                      configSaving: props.configSaving,
                      configDirty: props.configDirty,
                      filter: props.skillsFilter,
                      onFilterChange: props.onSkillsFilterChange,
                      onRefresh: props.onSkillsRefresh,
                      onToggle: props.onAgentSkillToggle,
                      onClear: props.onAgentSkillsClear,
                      onDisableAll: props.onAgentSkillsDisableAll,
                      onConfigReload: props.onConfigReload,
                      onConfigSave: props.onConfigSave,
                    })
                  : nothing
              }
              ${
                props.activePanel === "channels"
                  ? renderAgentChannels({
                      agent: selectedAgent,
                      defaultId,
                      configForm: props.configForm,
                      agentFilesList: props.agentFilesList,
                      agentIdentity: props.agentIdentityById[selectedAgent.id] ?? null,
                      snapshot: props.channelsSnapshot,
                      loading: props.channelsLoading,
                      error: props.channelsError,
                      lastSuccess: props.channelsLastSuccess,
                      onRefresh: props.onChannelsRefresh,
                    })
                  : nothing
              }
              ${
                props.activePanel === "cron"
                  ? renderAgentCron({
                      agent: selectedAgent,
                      defaultId,
                      configForm: props.configForm,
                      agentFilesList: props.agentFilesList,
                      agentIdentity: props.agentIdentityById[selectedAgent.id] ?? null,
                      jobs: props.cronJobs,
                      status: props.cronStatus,
                      loading: props.cronLoading,
                      error: props.cronError,
                      onRefresh: props.onCronRefresh,
                    })
                  : nothing
              }
            `
        }
      </section>
    </div>
  `;
}

function renderAgentHeader(
  agent: AgentsListResult["agents"][number],
  defaultId: string | null,
  agentIdentity: AgentIdentityResult | null,
) {
  const badge = agentBadgeText(agent.id, defaultId);
  const displayName = normalizeAgentLabel(agent);
  const subtitle = agent.identity?.theme?.trim() || "代理工作区和路由。";
  const emoji = resolveAgentEmoji(agent, agentIdentity);
  return html`
    <section class="card agent-header">
      <div class="agent-header-main">
        <div class="agent-avatar agent-avatar--lg">
          ${emoji || displayName.slice(0, 1)}
        </div>
        <div>
          <div class="card-title">${displayName}</div>
          <div class="card-sub">${subtitle}</div>
        </div>
      </div>
      <div class="agent-header-meta">
        <div class="mono">${agent.id}</div>
        ${badge ? html`<span class="agent-pill">${badge}</span>` : nothing}
      </div>
    </section>
  `;
}

function renderAgentTabs(active: AgentsPanel, onSelect: (panel: AgentsPanel) => void) {
  const tabs: Array<{ id: AgentsPanel; label: string }> = [
    { id: "overview", label: "概览" },
    { id: "files", label: "文件" },
    { id: "tools", label: "工具" },
    { id: "skills", label: "技能" },
    { id: "channels", label: "通道" },
    { id: "cron", label: "定时任务" },
  ];
  return html`
    <div class="agent-tabs">
      ${tabs.map(
        (tab) => html`
          <button
            class="agent-tab ${active === tab.id ? "active" : ""}"
            type="button"
            @click=${() => onSelect(tab.id)}
          >
            ${tab.label}
          </button>
        `,
      )}
    </div>
  `;
}

function renderAgentOverview(params: {
  agent: AgentsListResult["agents"][number];
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  agentIdentityLoading: boolean;
  agentIdentityError: string | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onConfigReload: () => void;
  onConfigSave: () => void;
  onModelChange: (agentId: string, modelId: string | null) => void;
  onModelFallbacksChange: (agentId: string, fallbacks: string[]) => void;
}) {
  const {
    agent,
    configForm,
    agentFilesList,
    agentIdentity,
    agentIdentityLoading,
    agentIdentityError,
    configLoading,
    configSaving,
    configDirty,
    onConfigReload,
    onConfigSave,
    onModelChange,
    onModelFallbacksChange,
  } = params;
  const config = resolveAgentConfig(configForm, agent.id);
  const workspaceFromFiles =
    agentFilesList && agentFilesList.agentId === agent.id ? agentFilesList.workspace : null;
  const workspace =
    workspaceFromFiles || config.entry?.workspace || config.defaults?.workspace || "default";
  const model = config.entry?.model
    ? resolveModelLabel(config.entry?.model)
    : resolveModelLabel(config.defaults?.model);
  const modelPrimary = resolveModelPrimary(config.entry?.model);
  const defaultPrimary = resolveModelPrimary(config.defaults?.model);
  const effectivePrimary = modelPrimary ?? defaultPrimary ?? null;
  const modelFallbacks = resolveModelFallbacks(config.entry?.model);
  const fallbackText = modelFallbacks ? modelFallbacks.join(", ") : "";
  const identityName =
    agentIdentity?.name?.trim() ||
    agent.identity?.name?.trim() ||
    agent.name?.trim() ||
    config.entry?.name ||
    "-";
  const resolvedEmoji = resolveAgentEmoji(agent, agentIdentity);
  const identityEmoji = resolvedEmoji || "-";
  const skillFilter = Array.isArray(config.entry?.skills) ? config.entry?.skills : null;
  const skillCount = skillFilter?.length ?? null;
  const identityStatus = agentIdentityLoading ? "加载中…" : agentIdentityError ? "不可用" : "";
  const isDefault = Boolean(params.defaultId && agent.id === params.defaultId);

  return html`
    <section class="card">
      <div class="card-title">概览</div>
      <div class="card-sub">工作区路径和身份元数据。</div>
      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">工作区</div>
          <div class="mono">${workspace}</div>
        </div>
        <div class="agent-kv">
          <div class="label">主模型</div>
          <div class="mono">${model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">身份名称</div>
          <div>${identityName}</div>
          ${identityStatus ? html`<div class="agent-kv-sub muted">${identityStatus}</div>` : nothing}
        </div>
        <div class="agent-kv">
          <div class="label">默认</div>
          <div>${isDefault ? "是" : "否"}</div>
        </div>
        <div class="agent-kv">
          <div class="label">身份表情</div>
          <div>${identityEmoji}</div>
        </div>
        <div class="agent-kv">
          <div class="label">技能过滤</div>
          <div>${skillFilter ? `已选择 ${skillCount} 个` : "全部技能"}</div>
        </div>
      </div>

      <div class="agent-model-select" style="margin-top: 20px;">
        <div class="label">模型选择</div>
        <div class="row" style="gap: 12px; flex-wrap: wrap;">
          <label class="field" style="min-width: 260px; flex: 1;">
            <span>主模型</span>
            <select
              .value=${effectivePrimary ?? ""}
              ?disabled=${!configForm || configLoading || configSaving}
              @change=${(e: Event) =>
                onModelChange(agent.id, (e.target as HTMLSelectElement).value || null)}
            >
              <option value="">
                ${defaultPrimary ? `继承默认 (${defaultPrimary})` : "继承默认"}
              </option>
              ${buildModelOptions(configForm, effectivePrimary ?? undefined)}
            </select>
          </label>
          <label class="field" style="min-width: 260px; flex: 1;">
            <span>备选模型（逗号分隔）</span>
            <input
              .value=${fallbackText}
              ?disabled=${!configForm || configLoading || configSaving}
              placeholder="提供商/模型, 提供商/模型"
              @input=${(e: Event) =>
                onModelFallbacksChange(
                  agent.id,
                  parseFallbackList((e.target as HTMLInputElement).value),
                )}
            />
          </label>
        </div>
        <div class="row" style="justify-content: flex-end; gap: 8px;">
          <button
            class="btn btn--sm"
            ?disabled=${configLoading}
            @click=${onConfigReload}
          >
            重新加载配置
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${configSaving || !configDirty}
            @click=${onConfigSave}
          >
            ${configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderAgentContextCard(context: AgentContext, subtitle: string) {
  return html`
    <section class="card">
      <div class="card-title">代理上下文</div>
      <div class="card-sub">${subtitle}</div>
      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">工作区</div>
          <div class="mono">${context.workspace}</div>
        </div>
        <div class="agent-kv">
          <div class="label">主模型</div>
          <div class="mono">${context.model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">身份名称</div>
          <div>${context.identityName}</div>
        </div>
        <div class="agent-kv">
          <div class="label">身份表情</div>
          <div>${context.identityEmoji}</div>
        </div>
        <div class="agent-kv">
          <div class="label">技能过滤</div>
          <div>${context.skillsLabel}</div>
        </div>
        <div class="agent-kv">
          <div class="label">默认</div>
          <div>${context.isDefault ? "是" : "否"}</div>
        </div>
      </div>
    </section>
  `;
}

type ChannelSummaryEntry = {
  id: string;
  label: string;
  accounts: ChannelAccountSnapshot[];
};

function resolveChannelLabel(snapshot: ChannelsStatusSnapshot, id: string) {
  const meta = snapshot.channelMeta?.find((entry) => entry.id === id);
  if (meta?.label) {
    return meta.label;
  }
  return snapshot.channelLabels?.[id] ?? id;
}

function resolveChannelEntries(snapshot: ChannelsStatusSnapshot | null): ChannelSummaryEntry[] {
  if (!snapshot) {
    return [];
  }
  const ids = new Set<string>();
  for (const id of snapshot.channelOrder ?? []) {
    ids.add(id);
  }
  for (const entry of snapshot.channelMeta ?? []) {
    ids.add(entry.id);
  }
  for (const id of Object.keys(snapshot.channelAccounts ?? {})) {
    ids.add(id);
  }
  const ordered: string[] = [];
  const seed = snapshot.channelOrder?.length ? snapshot.channelOrder : Array.from(ids);
  for (const id of seed) {
    if (!ids.has(id)) {
      continue;
    }
    ordered.push(id);
    ids.delete(id);
  }
  for (const id of ids) {
    ordered.push(id);
  }
  return ordered.map((id) => ({
    id,
    label: resolveChannelLabel(snapshot, id),
    accounts: snapshot.channelAccounts?.[id] ?? [],
  }));
}

const CHANNEL_EXTRA_FIELDS = ["groupPolicy", "streamMode", "dmPolicy"] as const;

function resolveChannelConfigValue(
  configForm: Record<string, unknown> | null,
  channelId: string,
): Record<string, unknown> | null {
  if (!configForm) {
    return null;
  }
  const channels = (configForm.channels ?? {}) as Record<string, unknown>;
  const fromChannels = channels[channelId];
  if (fromChannels && typeof fromChannels === "object") {
    return fromChannels as Record<string, unknown>;
  }
  const fallback = configForm[channelId];
  if (fallback && typeof fallback === "object") {
    return fallback as Record<string, unknown>;
  }
  return null;
}

function formatChannelExtraValue(raw: unknown): string {
  if (raw == null) {
    return "无";
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return "无";
  }
}

function resolveChannelExtras(
  configForm: Record<string, unknown> | null,
  channelId: string,
): Array<{ label: string; value: string }> {
  const value = resolveChannelConfigValue(configForm, channelId);
  if (!value) {
    return [];
  }
  return CHANNEL_EXTRA_FIELDS.flatMap((field) => {
    if (!(field in value)) {
      return [];
    }
    return [{ label: field, value: formatChannelExtraValue(value[field]) }];
  });
}

function summarizeChannelAccounts(accounts: ChannelAccountSnapshot[]) {
  let connected = 0;
  let configured = 0;
  let enabled = 0;
  for (const account of accounts) {
    const probeOk =
      account.probe && typeof account.probe === "object" && "ok" in account.probe
        ? Boolean((account.probe as { ok?: unknown }).ok)
        : false;
    const isConnected = account.connected === true || account.running === true || probeOk;
    if (isConnected) {
      connected += 1;
    }
    if (account.configured) {
      configured += 1;
    }
    if (account.enabled) {
      enabled += 1;
    }
  }
  return {
    total: accounts.length,
    connected,
    configured,
    enabled,
  };
}

function renderAgentChannels(params: {
  agent: AgentsListResult["agents"][number];
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  snapshot: ChannelsStatusSnapshot | null;
  loading: boolean;
  error: string | null;
  lastSuccess: number | null;
  onRefresh: () => void;
}) {
  const context = buildAgentContext(
    params.agent,
    params.configForm,
    params.agentFilesList,
    params.defaultId,
    params.agentIdentity,
  );
  const entries = resolveChannelEntries(params.snapshot);
  const lastSuccessLabel = params.lastSuccess ? formatAgo(params.lastSuccess) : "从未";
  return html`
    <section class="grid grid-cols-2">
      ${renderAgentContextCard(context, "工作区、身份和模型配置。")}
      <section class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">通道</div>
            <div class="card-sub">网关级通道状态快照。</div>
          </div>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div class="muted" style="margin-top: 8px;">
          上次刷新：${lastSuccessLabel}
        </div>
        ${
          params.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
            : nothing
        }
        ${
          !params.snapshot
            ? html`
                <div class="callout info" style="margin-top: 12px">加载通道以查看实时状态。</div>
              `
            : nothing
        }
        ${
          entries.length === 0
            ? html`
                <div class="muted" style="margin-top: 16px">未找到通道。</div>
              `
            : html`
              <div class="list" style="margin-top: 16px;">
                ${entries.map((entry) => {
                  const summary = summarizeChannelAccounts(entry.accounts);
                  const status = summary.total
                    ? `${summary.connected}/${summary.total} 已连接`
                    : "无账户";
                  const config = summary.configured ? `已配置 ${summary.configured} 个` : "未配置";
                  const enabled = summary.total ? `已启用 ${summary.enabled} 个` : "已禁用";
                  const extras = resolveChannelExtras(params.configForm, entry.id);
                  return html`
                    <div class="list-item">
                      <div class="list-main">
                        <div class="list-title">${entry.label}</div>
                        <div class="list-sub mono">${entry.id}</div>
                      </div>
                      <div class="list-meta">
                        <div>${status}</div>
                        <div>${config}</div>
                        <div>${enabled}</div>
                        ${
                          extras.length > 0
                            ? extras.map((extra) => html`<div>${extra.label}: ${extra.value}</div>`)
                            : nothing
                        }
                      </div>
                    </div>
                  `;
                })}
              </div>
            `
        }
      </section>
    </section>
  `;
}

function renderAgentCron(params: {
  agent: AgentsListResult["agents"][number];
  defaultId: string | null;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentIdentity: AgentIdentityResult | null;
  jobs: CronJob[];
  status: CronStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const context = buildAgentContext(
    params.agent,
    params.configForm,
    params.agentFilesList,
    params.defaultId,
    params.agentIdentity,
  );
  const jobs = params.jobs.filter((job) => job.agentId === params.agent.id);
  return html`
    <section class="grid grid-cols-2">
      ${renderAgentContextCard(context, "工作区和调度目标。")}
      <section class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">调度器</div>
            <div class="card-sub">网关定时任务状态。</div>
          </div>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">已启用</div>
            <div class="stat-value">
              ${params.status ? (params.status.enabled ? "是" : "否") : "无"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">任务</div>
            <div class="stat-value">${params.status?.jobs ?? "无"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">下次唤醒</div>
            <div class="stat-value">${formatNextRun(params.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        ${
          params.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
            : nothing
        }
      </section>
    </section>
    <section class="card">
      <div class="card-title">代理定时任务</div>
      <div class="card-sub">针对此代理的定时任务。</div>
      ${
        jobs.length === 0
          ? html`
              <div class="muted" style="margin-top: 16px">未分配任务。</div>
            `
          : html`
              <div class="list" style="margin-top: 16px;">
                ${jobs.map(
                  (job) => html`
                  <div class="list-item">
                    <div class="list-main">
                      <div class="list-title">${job.name}</div>
                      ${job.description ? html`<div class="list-sub">${job.description}</div>` : nothing}
                      <div class="chip-row" style="margin-top: 6px;">
                        <span class="chip">${formatCronSchedule(job)}</span>
                        <span class="chip ${job.enabled ? "chip-ok" : "chip-warn"}">
                          ${job.enabled ? "已启用" : "已禁用"}
                        </span>
                        <span class="chip">${job.sessionTarget}</span>
                      </div>
                    </div>
                    <div class="list-meta">
                      <div class="mono">${formatCronState(job)}</div>
                      <div class="muted">${formatCronPayload(job)}</div>
                    </div>
                  </div>
                `,
                )}
              </div>
            `
      }
    </section>
  `;
}

function renderAgentFiles(params: {
  agentId: string;
  agentFilesList: AgentsFilesListResult | null;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
}) {
  const list = params.agentFilesList?.agentId === params.agentId ? params.agentFilesList : null;
  const files = list?.files ?? [];
  const active = params.agentFileActive ?? null;
  const activeEntry = active ? (files.find((file) => file.name === active) ?? null) : null;
  const baseContent = active ? (params.agentFileContents[active] ?? "") : "";
  const draft = active ? (params.agentFileDrafts[active] ?? baseContent) : "";
  const isDirty = active ? draft !== baseContent : false;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">核心文件</div>
          <div class="card-sub">引导人格、身份和工具指导。</div>
        </div>
        <button
          class="btn btn--sm"
          ?disabled=${params.agentFilesLoading}
          @click=${() => params.onLoadFiles(params.agentId)}
        >
          ${params.agentFilesLoading ? "加载中…" : "刷新"}
        </button>
      </div>
      ${list ? html`<div class="muted mono" style="margin-top: 8px;">工作区：${list.workspace}</div>` : nothing}
      ${
        params.agentFilesError
          ? html`<div class="callout danger" style="margin-top: 12px;">${
              params.agentFilesError
            }</div>`
          : nothing
      }
      ${
        !list
          ? html`
              <div class="callout info" style="margin-top: 12px">加载代理工作区文件以编辑核心指令。</div>
            `
          : html`
              <div class="agent-files-grid" style="margin-top: 16px;">
                <div class="agent-files-list">
                  ${
                    files.length === 0
                      ? html`
                          <div class="muted">未找到文件。</div>
                        `
                      : files.map((file) =>
                          renderAgentFileRow(file, active, () => params.onSelectFile(file.name)),
                        )
                  }
                </div>
                <div class="agent-files-editor">
                  ${
                    !activeEntry
                      ? html`
                          <div class="muted">选择一个文件进行编辑。</div>
                        `
                      : html`
                          <div class="agent-file-header">
                            <div>
                              <div class="agent-file-title mono">${activeEntry.name}</div>
                              <div class="agent-file-sub mono">${activeEntry.path}</div>
                            </div>
                            <div class="agent-file-actions">
                              <button
                                class="btn btn--sm"
                                ?disabled=${!isDirty}
                                @click=${() => params.onFileReset(activeEntry.name)}
                              >
                                重置
                              </button>
                              <button
                                class="btn btn--sm primary"
                                ?disabled=${params.agentFileSaving || !isDirty}
                                @click=${() => params.onFileSave(activeEntry.name)}
                              >
                                ${params.agentFileSaving ? "保存中…" : "保存"}
                              </button>
                            </div>
                          </div>
                          ${
                            activeEntry.missing
                              ? html`
                                  <div class="callout info" style="margin-top: 10px">此文件不存在。保存将在代理工作区中创建它。</div>
                                `
                              : nothing
                          }
                          <label class="field" style="margin-top: 12px;">
                            <span>内容</span>
                            <textarea
                              .value=${draft}
                              @input=${(e: Event) =>
                                params.onFileDraftChange(
                                  activeEntry.name,
                                  (e.target as HTMLTextAreaElement).value,
                                )}
                            ></textarea>
                          </label>
                        `
                  }
                </div>
              </div>
            `
      }
    </section>
  `;
}

function renderAgentFileRow(file: AgentFileEntry, active: string | null, onSelect: () => void) {
  const status = file.missing
    ? "缺失"
    : `${formatBytes(file.size)} · ${formatAgo(file.updatedAtMs ?? null)}`;
  return html`
    <button
      type="button"
      class="agent-file-row ${active === file.name ? "active" : ""}"
      @click=${onSelect}
    >
      <div>
        <div class="agent-file-name mono">${file.name}</div>
        <div class="agent-file-meta">${status}</div>
      </div>
      ${
        file.missing
          ? html`
              <span class="agent-pill warn">缺失</span>
            `
          : nothing
      }
    </button>
  `;
}

function renderAgentTools(params: {
  agentId: string;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  onProfileChange: (agentId: string, profile: string | null, clearAllow: boolean) => void;
  onOverridesChange: (agentId: string, alsoAllow: string[], deny: string[]) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const agentTools = config.entry?.tools ?? {};
  const globalTools = config.globalTools ?? {};
  const profile = agentTools.profile ?? globalTools.profile ?? "full";
  const profileSource = agentTools.profile ? "代理覆盖" : globalTools.profile ? "全局默认" : "默认";
  const hasAgentAllow = Array.isArray(agentTools.allow) && agentTools.allow.length > 0;
  const hasGlobalAllow = Array.isArray(globalTools.allow) && globalTools.allow.length > 0;
  const editable =
    Boolean(params.configForm) && !params.configLoading && !params.configSaving && !hasAgentAllow;
  const alsoAllow = hasAgentAllow
    ? []
    : Array.isArray(agentTools.alsoAllow)
      ? agentTools.alsoAllow
      : [];
  const deny = hasAgentAllow ? [] : Array.isArray(agentTools.deny) ? agentTools.deny : [];
  const basePolicy = hasAgentAllow
    ? { allow: agentTools.allow ?? [], deny: agentTools.deny ?? [] }
    : (resolveToolProfilePolicy(profile) ?? undefined);
  const toolIds = TOOL_SECTIONS.flatMap((section) => section.tools.map((tool) => tool.id));

  const resolveAllowed = (toolId: string) => {
    const baseAllowed = isAllowedByPolicy(toolId, basePolicy);
    const extraAllowed = matchesList(toolId, alsoAllow);
    const denied = matchesList(toolId, deny);
    const allowed = (baseAllowed || extraAllowed) && !denied;
    return {
      allowed,
      baseAllowed,
      denied,
    };
  };
  const enabledCount = toolIds.filter((toolId) => resolveAllowed(toolId).allowed).length;

  const updateTool = (toolId: string, nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const baseAllowed = resolveAllowed(toolId).baseAllowed;
    const normalized = normalizeToolName(toolId);
    if (nextEnabled) {
      nextDeny.delete(normalized);
      if (!baseAllowed) {
        nextAllow.add(normalized);
      }
    } else {
      nextAllow.delete(normalized);
      nextDeny.add(normalized);
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  const updateAll = (nextEnabled: boolean) => {
    const nextAllow = new Set(
      alsoAllow.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    const nextDeny = new Set(
      deny.map((entry) => normalizeToolName(entry)).filter((entry) => entry.length > 0),
    );
    for (const toolId of toolIds) {
      const baseAllowed = resolveAllowed(toolId).baseAllowed;
      const normalized = normalizeToolName(toolId);
      if (nextEnabled) {
        nextDeny.delete(normalized);
        if (!baseAllowed) {
          nextAllow.add(normalized);
        }
      } else {
        nextAllow.delete(normalized);
        nextDeny.add(normalized);
      }
    }
    params.onOverridesChange(params.agentId, [...nextAllow], [...nextDeny]);
  };

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">工具访问</div>
          <div class="card-sub">
            此代理的配置文件及逐工具覆盖。
            <span class="mono">${enabledCount}/${toolIds.length}</span> 已启用。
          </div>
        </div>
        <div class="row" style="gap: 8px;">
          <button
            class="btn btn--sm"
            ?disabled=${!editable}
            @click=${() => updateAll(true)}
          >
            全部启用
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${!editable}
            @click=${() => updateAll(false)}
          >
            全部禁用
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${params.configLoading}
            @click=${params.onConfigReload}
          >
            重新加载配置
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      ${
        !params.configForm
          ? html`
              <div class="callout info" style="margin-top: 12px">加载网关配置以调整工具配置。</div>
            `
          : nothing
      }
      ${
        hasAgentAllow
          ? html`
              <div class="callout info" style="margin-top: 12px">
                此代理在配置中使用了显式允许列表。工具覆盖在配置选项卡中管理。
              </div>
            `
          : nothing
      }
      ${
        hasGlobalAllow
          ? html`
              <div class="callout info" style="margin-top: 12px">
                已设置全局 tools.allow。代理覆盖无法启用被全局阻止的工具。
              </div>
            `
          : nothing
      }

      <div class="agent-tools-meta" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">配置文件</div>
          <div class="mono">${profile}</div>
        </div>
        <div class="agent-kv">
          <div class="label">来源</div>
          <div>${profileSource}</div>
        </div>
        ${
          params.configDirty
            ? html`
                <div class="agent-kv">
                  <div class="label">状态</div>
                  <div class="mono">未保存</div>
                </div>
              `
            : nothing
        }
      </div>

      <div class="agent-tools-presets" style="margin-top: 16px;">
        <div class="label">快速预设</div>
        <div class="agent-tools-buttons">
          ${PROFILE_OPTIONS.map(
            (option) => html`
              <button
                class="btn btn--sm ${profile === option.id ? "active" : ""}"
                ?disabled=${!editable}
                @click=${() => params.onProfileChange(params.agentId, option.id, true)}
              >
                ${option.label}
              </button>
            `,
          )}
          <button
            class="btn btn--sm"
            ?disabled=${!editable}
            @click=${() => params.onProfileChange(params.agentId, null, false)}
          >
            继承
          </button>
        </div>
      </div>

      <div class="agent-tools-grid" style="margin-top: 20px;">
        ${TOOL_SECTIONS.map(
          (section) =>
            html`
            <div class="agent-tools-section">
              <div class="agent-tools-header">${section.label}</div>
              <div class="agent-tools-list">
                ${section.tools.map((tool) => {
                  const { allowed } = resolveAllowed(tool.id);
                  return html`
                    <div class="agent-tool-row">
                      <div>
                        <div class="agent-tool-title mono">${tool.label}</div>
                        <div class="agent-tool-sub">${tool.description}</div>
                      </div>
                      <label class="cfg-toggle">
                        <input
                          type="checkbox"
                          .checked=${allowed}
                          ?disabled=${!editable}
                          @change=${(e: Event) =>
                            updateTool(tool.id, (e.target as HTMLInputElement).checked)}
                        />
                        <span class="cfg-toggle__track"></span>
                      </label>
                    </div>
                  `;
                })}
              </div>
            </div>
          `,
        )}
      </div>
    </section>
  `;
}

type SkillGroup = {
  id: string;
  label: string;
  skills: SkillStatusEntry[];
};

const SKILL_SOURCE_GROUPS: Array<{ id: string; label: string; sources: string[] }> = [
  { id: "workspace", label: "工作区技能", sources: ["openclaw-workspace"] },
  { id: "built-in", label: "内置技能", sources: ["openclaw-bundled"] },
  { id: "installed", label: "已安装技能", sources: ["openclaw-managed"] },
  { id: "extra", label: "额外技能", sources: ["openclaw-extra"] },
];

function groupSkills(skills: SkillStatusEntry[]): SkillGroup[] {
  const groups = new Map<string, SkillGroup>();
  for (const def of SKILL_SOURCE_GROUPS) {
    groups.set(def.id, { id: def.id, label: def.label, skills: [] });
  }
  const other: SkillGroup = { id: "other", label: "其他技能", skills: [] };
  for (const skill of skills) {
    const match = SKILL_SOURCE_GROUPS.find((group) => group.sources.includes(skill.source));
    if (match) {
      groups.get(match.id)?.skills.push(skill);
    } else {
      other.skills.push(skill);
    }
  }
  const ordered = SKILL_SOURCE_GROUPS.map((group) => groups.get(group.id)).filter(
    (group): group is SkillGroup => Boolean(group && group.skills.length > 0),
  );
  if (other.skills.length > 0) {
    ordered.push(other);
  }
  return ordered;
}

function renderAgentSkills(params: {
  agentId: string;
  report: SkillStatusReport | null;
  loading: boolean;
  error: string | null;
  activeAgentId: string | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  filter: string;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  onClear: (agentId: string) => void;
  onDisableAll: (agentId: string) => void;
  onConfigReload: () => void;
  onConfigSave: () => void;
}) {
  const editable = Boolean(params.configForm) && !params.configLoading && !params.configSaving;
  const config = resolveAgentConfig(params.configForm, params.agentId);
  const allowlist = Array.isArray(config.entry?.skills) ? config.entry?.skills : undefined;
  const allowSet = new Set((allowlist ?? []).map((name) => name.trim()).filter(Boolean));
  const usingAllowlist = allowlist !== undefined;
  const reportReady = Boolean(params.report && params.activeAgentId === params.agentId);
  const rawSkills = reportReady ? (params.report?.skills ?? []) : [];
  const filter = params.filter.trim().toLowerCase();
  const filtered = filter
    ? rawSkills.filter((skill) =>
        [skill.name, skill.description, skill.source].join(" ").toLowerCase().includes(filter),
      )
    : rawSkills;
  const groups = groupSkills(filtered);
  const enabledCount = usingAllowlist
    ? rawSkills.filter((skill) => allowSet.has(skill.name)).length
    : rawSkills.length;
  const totalCount = rawSkills.length;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">技能</div>
          <div class="card-sub">
            代理级技能允许列表和工作区技能。
            ${totalCount > 0 ? html`<span class="mono">${enabledCount}/${totalCount}</span>` : nothing}
          </div>
        </div>
        <div class="row" style="gap: 8px;">
          <button class="btn btn--sm" ?disabled=${!editable} @click=${() => params.onClear(params.agentId)}>
            使用全部
          </button>
          <button class="btn btn--sm" ?disabled=${!editable} @click=${() => params.onDisableAll(params.agentId)}>
            全部禁用
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${params.configLoading}
            @click=${params.onConfigReload}
          >
            重新加载配置
          </button>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "加载中…" : "刷新"}
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${params.configSaving || !params.configDirty}
            @click=${params.onConfigSave}
          >
            ${params.configSaving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      ${
        !params.configForm
          ? html`
              <div class="callout info" style="margin-top: 12px">加载网关配置以设置代理级技能。</div>
            `
          : nothing
      }
      ${
        usingAllowlist
          ? html`
              <div class="callout info" style="margin-top: 12px">此代理使用自定义技能允许列表。</div>
            `
          : html`
              <div class="callout info" style="margin-top: 12px">
                所有技能已启用。禁用任何技能将创建代理级允许列表。
              </div>
            `
      }
      ${
        !reportReady && !params.loading
          ? html`
              <div class="callout info" style="margin-top: 12px">加载此代理的技能以查看工作区特定条目。</div>
            `
          : nothing
      }
      ${
        params.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
          : nothing
      }

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>过滤</span>
          <input
            .value=${params.filter}
            @input=${(e: Event) => params.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="搜索技能"
          />
        </label>
        <div class="muted">${filtered.length} 个显示</div>
      </div>

      ${
        filtered.length === 0
          ? html`
              <div class="muted" style="margin-top: 16px">未找到技能。</div>
            `
          : html`
              <div class="agent-skills-groups" style="margin-top: 16px;">
                ${groups.map((group) =>
                  renderAgentSkillGroup(group, {
                    agentId: params.agentId,
                    allowSet,
                    usingAllowlist,
                    editable,
                    onToggle: params.onToggle,
                  }),
                )}
              </div>
            `
      }
    </section>
  `;
}

function renderAgentSkillGroup(
  group: SkillGroup,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const collapsedByDefault = group.id === "workspace" || group.id === "built-in";
  return html`
    <details class="agent-skills-group" ?open=${!collapsedByDefault}>
      <summary class="agent-skills-header">
        <span>${group.label}</span>
        <span class="muted">${group.skills.length}</span>
      </summary>
      <div class="list skills-grid">
        ${group.skills.map((skill) =>
          renderAgentSkillRow(skill, {
            agentId: params.agentId,
            allowSet: params.allowSet,
            usingAllowlist: params.usingAllowlist,
            editable: params.editable,
            onToggle: params.onToggle,
          }),
        )}
      </div>
    </details>
  `;
}

function renderAgentSkillRow(
  skill: SkillStatusEntry,
  params: {
    agentId: string;
    allowSet: Set<string>;
    usingAllowlist: boolean;
    editable: boolean;
    onToggle: (agentId: string, skillName: string, enabled: boolean) => void;
  },
) {
  const enabled = params.usingAllowlist ? params.allowSet.has(skill.name) : true;
  const missing = [
    ...skill.missing.bins.map((b) => `bin:${b}`),
    ...skill.missing.env.map((e) => `env:${e}`),
    ...skill.missing.config.map((c) => `config:${c}`),
    ...skill.missing.os.map((o) => `os:${o}`),
  ];
  const reasons: string[] = [];
  if (skill.disabled) {
    reasons.push("已禁用");
  }
  if (skill.blockedByAllowlist) {
    reasons.push("被允许列表阻止");
  }
  return html`
    <div class="list-item agent-skill-row">
      <div class="list-main">
        <div class="list-title">
          ${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}
        </div>
        <div class="list-sub">${skill.description}</div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">${skill.source}</span>
          <span class="chip ${skill.eligible ? "chip-ok" : "chip-warn"}">
            ${skill.eligible ? "可用" : "已阻止"}
          </span>
          ${
            skill.disabled
              ? html`
                  <span class="chip chip-warn">已禁用</span>
                `
              : nothing
          }
        </div>
        ${
          missing.length > 0
            ? html`<div class="muted" style="margin-top: 6px;">缺失：${missing.join(", ")}</div>`
            : nothing
        }
        ${
          reasons.length > 0
            ? html`<div class="muted" style="margin-top: 6px;">原因：${reasons.join(", ")}</div>`
            : nothing
        }
      </div>
      <div class="list-meta">
        <label class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${enabled}
            ?disabled=${!params.editable}
            @change=${(e: Event) =>
              params.onToggle(params.agentId, skill.name, (e.target as HTMLInputElement).checked)}
          />
          <span class="cfg-toggle__track"></span>
        </label>
      </div>
    </div>
  `;
}
