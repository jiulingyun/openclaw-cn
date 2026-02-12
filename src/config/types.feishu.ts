import type {
  DmPolicy,
  GroupPolicy,
  MarkdownConfig,
  OutboundRetryConfig,
  ReplyToMode,
} from "./types.base.js";
import type { ChannelHeartbeatVisibilityConfig } from "./types.channels.js";
import type { DmConfig, ProviderCommandsConfig } from "./types.messages.js";
import type { GroupToolPolicyConfig } from "./types.tools.js";

export type FeishuGroupConfig = {
  requireMention?: boolean;
  /** Optional tool policy overrides for this group. */
  tools?: GroupToolPolicyConfig;
  /** If specified, only load these skills for this group. Omit = all skills; empty = no skills. */
  skills?: string[];
  /** If false, disable the bot for this group. */
  enabled?: boolean;
  /** Optional allowlist for group senders (open_ids). */
  allowFrom?: string[];
  /** Optional system prompt snippet for this group. */
  systemPrompt?: string;
  /**
   * Controls reply quoting behavior for this group:
   * - "off": don't quote original message
   * - "first": quote on first reply only
   * - "all": quote on all replies
   * Inherits from account-level replyToMode if not specified.
   */
  replyToMode?: ReplyToMode;
};

/** Feishu domain type: "feishu" for China (open.feishu.cn), "lark" for international (open.larksuite.com). */
export type FeishuDomain = "feishu" | "lark";

export type FeishuAccountConfig = {
  /** Optional display name for this account (used in CLI/UI lists). */
  name?: string;
  /** Feishu App ID (cli_xxx). */
  appId: string;
  /** Feishu App Secret. */
  appSecret: string;
  /**
   * API domain to use:
   * - "feishu" (default): China region (open.feishu.cn)
   * - "lark": International region (open.larksuite.com)
   */
  domain?: FeishuDomain;
  /** Path to file containing app secret (for secret managers). */
  appSecretFile?: string;
  /** Bot display name. */
  botName?: string;
  /** If false, do not start this Feishu account. Default: true. */
  enabled?: boolean;
  /** Markdown formatting overrides (tables). */
  markdown?: MarkdownConfig;
  /** Override native command registration for Feishu (bool or "auto"). */
  commands?: ProviderCommandsConfig;
  /** Allow channel-initiated config writes (default: true). */
  configWrites?: boolean;
  /**
   * Controls how Feishu direct chats (DMs) are handled:
   * - "pairing" (default): unknown senders get a pairing code; owner must approve
   * - "allowlist": only allow senders in allowFrom (or paired allow store)
   * - "open": allow all inbound DMs (requires allowFrom to include "*")
   * - "disabled": ignore all inbound DMs
   */
  dmPolicy?: DmPolicy;
  /**
   * Controls how group messages are handled:
   * - "open": groups bypass allowFrom, only mention-gating applies
   * - "disabled": block all group messages entirely
   * - "allowlist": only allow group messages from senders in groupAllowFrom/allowFrom
   */
  groupPolicy?: GroupPolicy;
  /** Allowlist for DM senders (open_id or union_id). */
  allowFrom?: string[];
  /** Optional allowlist for Feishu group senders. */
  groupAllowFrom?: string[];
  /** Max group messages to keep as history context (0 disables). */
  historyLimit?: number;
  /** Max DM turns to keep as history context. */
  dmHistoryLimit?: number;
  /** Per-DM config overrides keyed by user open_id. */
  dms?: Record<string, DmConfig>;
  /** Per-group config keyed by chat_id (oc_xxx). */
  groups?: Record<string, FeishuGroupConfig>;
  /** Outbound text chunk size (chars). Default: 2000. */
  textChunkLimit?: number;
  /** Chunking mode: "length" (default) splits by size; "newline" splits on every newline. */
  chunkMode?: "length" | "newline";
  /** Disable block streaming for this account. */
  blockStreaming?: boolean;
  /**
   * Enable streaming card mode for replies (shows typing indicator).
   * When true, replies are streamed via Feishu's CardKit API with typewriter effect.
   * Default: true.
   */
  streaming?: boolean;
  /**
   * Controls reply quoting behavior in group chats:
   * - "off": don't quote original message (default for DMs)
   * - "first": quote on first reply only
   * - "all": quote on all replies
   * Default for groups: "all".
   */
  replyToMode?: ReplyToMode;
  /** Media max size in MB. */
  mediaMaxMb?: number;
  /** Retry policy for outbound Feishu API calls. */
  retry?: OutboundRetryConfig;
  /** Heartbeat visibility settings for this channel. */
  heartbeat?: ChannelHeartbeatVisibilityConfig;
};

export type FeishuConfig = {
  /** Optional per-account Feishu configuration (multi-account). */
  accounts?: Record<string, FeishuAccountConfig>;
  /** Top-level App ID (alternative to accounts). */
  appId?: string;
  /** Top-level App Secret (alternative to accounts). */
  appSecret?: string;
} & Omit<FeishuAccountConfig, "appId" | "appSecret">;
