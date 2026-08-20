export { CHANNEL_MESSAGE_ACTION_NAMES } from "../channels/plugins/message-action-names.js";
export {
  BLUEBUBBLES_ACTIONS,
  BLUEBUBBLES_ACTION_NAMES,
  BLUEBUBBLES_GROUP_ACTIONS,
} from "../channels/plugins/bluebubbles-actions.js";
export type {
  ChannelAccountSnapshot,
  ChannelAccountState,
  ChannelAgentTool,
  ChannelAgentToolFactory,
  ChannelAuthAdapter,
  ChannelCapabilities,
  ChannelCommandAdapter,
  ChannelConfigAdapter,
  ChannelDirectoryAdapter,
  ChannelDirectoryEntry,
  ChannelDirectoryEntryKind,
  ChannelElevatedAdapter,
  ChannelGatewayAdapter,
  ChannelGatewayContext,
  ChannelGroupAdapter,
  ChannelGroupContext,
  ChannelHeartbeatAdapter,
  ChannelHeartbeatDeps,
  ChannelId,
  ChannelLogSink,
  ChannelLoginWithQrStartResult,
  ChannelLoginWithQrWaitResult,
  ChannelLogoutContext,
  ChannelLogoutResult,
  ChannelMentionAdapter,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelMessagingAdapter,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelOutboundTargetMode,
  ChannelPairingAdapter,
  ChannelPollContext,
  ChannelPollResult,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelResolverAdapter,
  ChannelSecurityAdapter,
  ChannelSecurityContext,
  ChannelSecurityDmPolicy,
  ChannelSetupAdapter,
  ChannelSetupInput,
  ChannelStatusAdapter,
  ChannelStatusIssue,
  ChannelStreamingAdapter,
  ChannelThreadingAdapter,
  ChannelThreadingContext,
  ChannelThreadingToolContext,
  ChannelToolSend,
} from "../channels/plugins/types.js";
export type { ChannelConfigSchema, ChannelPlugin } from "../channels/plugins/types.plugin.js";
export type {
  ClawdbotPluginApi,
  ClawdbotPluginService,
  ClawdbotPluginServiceContext,
} from "../plugins/types.js";
export type {
  GatewayRequestHandler,
  GatewayRequestHandlerOptions,
  RespondFn,
} from "../gateway/server-methods/types.js";
export type { PluginRuntime } from "../plugins/runtime/types.js";
export { normalizePluginHttpPath } from "../plugins/http-path.js";
export { registerPluginHttpRoute } from "../plugins/http-registry.js";
export { emptyPluginConfigSchema } from "../plugins/config-schema.js";
export type { ClawdbotConfig } from "../config/config.js";
export type { ChannelDock } from "../channels/dock.js";
export { getChatChannelMeta } from "../channels/registry.js";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  DmConfig,
  GroupPolicy,
  GroupToolPolicyConfig,
  MarkdownConfig,
  MarkdownTableMode,
  GoogleChatAccountConfig,
  GoogleChatConfig,
  GoogleChatDmConfig,
  GoogleChatGroupConfig,
  GoogleChatActionConfig,
  MSTeamsChannelConfig,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
} from "../config/types.js";
export {
  DiscordConfigSchema,
  GoogleChatConfigSchema,
  IMessageConfigSchema,
  MSTeamsConfigSchema,
  SignalConfigSchema,
  SlackConfigSchema,
  TelegramConfigSchema,
} from "../config/zod-schema.providers-core.js";
export { WhatsAppConfigSchema } from "../config/zod-schema.providers-whatsapp.js";
export {
  BlockStreamingCoalesceSchema,
  DmConfigSchema,
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
  MarkdownTableModeSchema,
  normalizeAllowFrom,
  requireOpenAllowFrom,
} from "../config/zod-schema.core.js";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime.js";
export type { RuntimeEnv } from "../runtime.js";
export type { WizardPrompter } from "../wizard/prompts.js";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";
export { resolveAckReaction } from "../agents/identity.js";
export type { ReplyPayload } from "../auto-reply/types.js";
export type { ChunkMode } from "../auto-reply/chunk.js";
export { SILENT_REPLY_TOKEN, isSilentReplyText } from "../auto-reply/tokens.js";
export {
  buildPendingHistoryContextFromMap,
  clearHistoryEntries,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
  recordPendingHistoryEntry,
  recordPendingHistoryEntryIfEnabled,
} from "../auto-reply/reply/history.js";
export type { HistoryEntry } from "../auto-reply/reply/history.js";
export { mergeAllowlist, summarizeMapping } from "../channels/allowlists/resolve-utils.js";
export {
  resolveMentionGating,
  resolveMentionGatingWithBypass,
} from "../channels/mention-gating.js";
export type {
  AckReactionGateParams,
  AckReactionScope,
  WhatsAppAckReactionMode,
} from "../channels/ack-reactions.js";
export {
  removeAckReactionAfterReply,
  shouldAckReaction,
  shouldAckReactionForWhatsApp,
} from "../channels/ack-reactions.js";
export { createTypingCallbacks } from "../channels/typing.js";
export { createReplyPrefixContext, createReplyPrefixOptions } from "../channels/reply-prefix.js";
export { logAckFailure, logInboundDrop, logTypingFailure } from "../channels/logging.js";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits.js";
export type { NormalizedLocation } from "../channels/location.js";
export { formatLocationText, toLocationContext } from "../channels/location.js";
export { resolveControlCommandGate } from "../channels/command-gating.js";
export {
  resolveBlueBubblesGroupRequireMention,
  resolveDiscordGroupRequireMention,
  resolveGoogleChatGroupRequireMention,
  resolveIMessageGroupRequireMention,
  resolveSlackGroupRequireMention,
  resolveTelegramGroupRequireMention,
  resolveWhatsAppGroupRequireMention,
  resolveBlueBubblesGroupToolPolicy,
  resolveDiscordGroupToolPolicy,
  resolveGoogleChatGroupToolPolicy,
  resolveIMessageGroupToolPolicy,
  resolveSlackGroupToolPolicy,
  resolveTelegramGroupToolPolicy,
  resolveWhatsAppGroupToolPolicy,
} from "../channels/plugins/group-mentions.js";
export { recordInboundSession } from "../channels/session.js";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatch,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "../channels/plugins/channel-config.js";
export {
  listDiscordDirectoryGroupsFromConfig,
  listDiscordDirectoryPeersFromConfig,
  listSlackDirectoryGroupsFromConfig,
  listSlackDirectoryPeersFromConfig,
  listTelegramDirectoryGroupsFromConfig,
  listTelegramDirectoryPeersFromConfig,
  listWhatsAppDirectoryGroupsFromConfig,
  listWhatsAppDirectoryPeersFromConfig,
} from "../channels/plugins/directory-config.js";
export type { AllowlistMatch } from "../channels/plugins/allowlist-match.js";
export { formatAllowlistMatchMeta } from "../channels/plugins/allowlist-match.js";
export { optionalStringEnum, stringEnum } from "../agents/schema/typebox.js";
export type { PollInput } from "../polls.js";

export { buildChannelConfigSchema } from "../channels/plugins/config-schema.js";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers.js";
export {
  applyAccountNameToChannelSection,
  migrateBaseNameToDefaultAccount,
} from "../channels/plugins/setup-helpers.js";
export { formatPairingApproveHint } from "../channels/plugins/helpers.js";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message.js";

export type {
  ChannelOnboardingAdapter,
  ChannelOnboardingDmPolicy,
} from "../channels/plugins/onboarding-types.js";
export { addWildcardAllowFrom, promptAccountId } from "../channels/plugins/onboarding/helpers.js";
export { promptChannelAccessConfig } from "../channels/plugins/onboarding/channel-access.js";

export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "../agents/tools/common.js";
export { formatDocsLink } from "../terminal/links.js";
export type { HookEntry } from "../hooks/types.js";
export { normalizeE164 } from "../utils.js";
export { missingTargetError } from "../infra/outbound/target-errors.js";
export { registerLogTransport } from "../logging/logger.js";
export type { LogTransport, LogTransportRecord } from "../logging/logger.js";
export {
  emitDiagnosticEvent,
  isDiagnosticsEnabled,
  onDiagnosticEvent,
} from "../infra/diagnostic-events.js";
export type {
  DiagnosticEventPayload,
  DiagnosticHeartbeatEvent,
  DiagnosticLaneDequeueEvent,
  DiagnosticLaneEnqueueEvent,
  DiagnosticMessageProcessedEvent,
  DiagnosticMessageQueuedEvent,
  DiagnosticRunAttemptEvent,
  DiagnosticSessionState,
  DiagnosticSessionStateEvent,
  DiagnosticSessionStuckEvent,
  DiagnosticUsageEvent,
  DiagnosticWebhookErrorEvent,
  DiagnosticWebhookProcessedEvent,
  DiagnosticWebhookReceivedEvent,
} from "../infra/diagnostic-events.js";
export { detectMime, extensionForMime, getFileExtension } from "../media/mime.js";
export { extractOriginalFilename } from "../media/store.js";
export { resolvePreferredOpenClawTmpDir } from "../infra/tmp-openclaw-dir.js";

// Channel: Discord
export {
  listDiscordAccountIds,
  resolveDefaultDiscordAccountId,
  resolveDiscordAccount,
  type ResolvedDiscordAccount,
} from "../discord/accounts.js";
export { collectDiscordAuditChannelIds } from "../discord/audit.js";
export { discordOnboardingAdapter } from "../channels/plugins/onboarding/discord.js";
export {
  looksLikeDiscordTargetId,
  normalizeDiscordMessagingTarget,
} from "../channels/plugins/normalize/discord.js";
export { collectDiscordStatusIssues } from "../channels/plugins/status-issues/discord.js";

// Channel: iMessage
export {
  listIMessageAccountIds,
  resolveDefaultIMessageAccountId,
  resolveIMessageAccount,
  type ResolvedIMessageAccount,
} from "../imessage/accounts.js";
export { imessageOnboardingAdapter } from "../channels/plugins/onboarding/imessage.js";
export {
  looksLikeIMessageTargetId,
  normalizeIMessageMessagingTarget,
} from "../channels/plugins/normalize/imessage.js";

// Channel: Slack
export {
  listEnabledSlackAccounts,
  listSlackAccountIds,
  resolveDefaultSlackAccountId,
  resolveSlackAccount,
  resolveSlackReplyToMode,
  type ResolvedSlackAccount,
} from "../slack/accounts.js";
export { slackOnboardingAdapter } from "../channels/plugins/onboarding/slack.js";
export {
  looksLikeSlackTargetId,
  normalizeSlackMessagingTarget,
} from "../channels/plugins/normalize/slack.js";
export { buildSlackThreadingToolContext } from "../slack/threading-tool-context.js";

// Channel: Telegram
export {
  listTelegramAccountIds,
  resolveDefaultTelegramAccountId,
  resolveTelegramAccount,
  type ResolvedTelegramAccount,
} from "../telegram/accounts.js";
export { telegramOnboardingAdapter } from "../channels/plugins/onboarding/telegram.js";
export {
  looksLikeTelegramTargetId,
  normalizeTelegramMessagingTarget,
} from "../channels/plugins/normalize/telegram.js";
export { collectTelegramStatusIssues } from "../channels/plugins/status-issues/telegram.js";

// Channel: Signal
export {
  listSignalAccountIds,
  resolveDefaultSignalAccountId,
  resolveSignalAccount,
  type ResolvedSignalAccount,
} from "../signal/accounts.js";
export { signalOnboardingAdapter } from "../channels/plugins/onboarding/signal.js";
export {
  looksLikeSignalTargetId,
  normalizeSignalMessagingTarget,
} from "../channels/plugins/normalize/signal.js";

// Channel: WhatsApp
export {
  listWhatsAppAccountIds,
  resolveDefaultWhatsAppAccountId,
  resolveWhatsAppAccount,
  type ResolvedWhatsAppAccount,
} from "../web/accounts.js";
export { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "../whatsapp/normalize.js";
export { whatsappOnboardingAdapter } from "../channels/plugins/onboarding/whatsapp.js";
export { resolveWhatsAppHeartbeatRecipients } from "../channels/plugins/whatsapp-heartbeat.js";
export {
  looksLikeWhatsAppTargetId,
  normalizeWhatsAppMessagingTarget,
} from "../channels/plugins/normalize/whatsapp.js";
export { collectWhatsAppStatusIssues } from "../channels/plugins/status-issues/whatsapp.js";

// Channel: BlueBubbles
export { collectBlueBubblesStatusIssues } from "../channels/plugins/status-issues/bluebubbles.js";

// Channel: LINE
export {
  listLineAccountIds,
  normalizeAccountId as normalizeLineAccountId,
  resolveDefaultLineAccountId,
  resolveLineAccount,
} from "../line/accounts.js";
export { LineConfigSchema } from "../line/config-schema.js";
export type {
  LineConfig,
  LineAccountConfig,
  ResolvedLineAccount,
  LineChannelData,
} from "../line/types.js";
export {
  createInfoCard,
  createListCard,
  createImageCard,
  createActionCard,
  createReceiptCard,
  type CardAction,
  type ListItem,
} from "../line/flex-templates.js";
export {
  processLineMessage,
  hasMarkdownToConvert,
  stripMarkdown,
} from "../line/markdown-to-line.js";
export type { ProcessedLineMessage } from "../line/markdown-to-line.js";

// Channel: Feishu
export type { FeishuDomain } from "../config/types.feishu.js";
export {
  listFeishuAccountIds,
  resolveDefaultFeishuAccountId,
  resolveFeishuAccount,
  type ResolvedFeishuAccount,
} from "../feishu/accounts.js";
export { feishuOutbound } from "../channels/plugins/outbound/feishu.js";
export { normalizeFeishuTarget } from "../channels/plugins/normalize/feishu.js";
export { probeFeishu, type FeishuProbe } from "../feishu/probe.js";
export { monitorFeishuProvider } from "../feishu/monitor.js";

// Media utilities
export { loadWebMedia, type WebMediaResult } from "../web/media.js";
export { fetchRemoteMedia, type MediaFetchError, type MediaFetchErrorCode } from "../media/fetch.js";

// Command authorization helpers used by external channel plugins (e.g. official Feishu plugin)
export { resolveCommandAuthorizedFromAuthorizers } from "../channels/command-gating.js";
export { shouldComputeCommandAuthorized } from "../auto-reply/command-detection.js";

/**
 * Check whether a sender ID is in a normalized allowFrom list.
 * Strips optional "feishu:" / "user:" / "open_id:" prefixes before comparison.
 */
export function isNormalizedSenderAllowed(params: {
  senderId: string;
  allowFrom: string[];
}): boolean {
  const { senderId, allowFrom } = params;
  if (!senderId || !allowFrom.length) return false;
  const normalized = senderId.trim().toLowerCase();
  return allowFrom.some((entry) => {
    const e = String(entry)
      .trim()
      .toLowerCase()
      .replace(/^(feishu|user|open_id):/i, "");
    return e === "*" || e === normalized;
  });
}

/**
 * Resolve whether a sender is authorized to run commands.
 * Used by external channel plugins that need unified DM/group command gating.
 */
export async function resolveSenderCommandAuthorization(params: {
  rawBody: string;
  cfg: import("../config/config.js").ClawdbotConfig;
  isGroup: boolean;
  dmPolicy: string;
  configuredAllowFrom: string[];
  configuredGroupAllowFrom?: string[];
  senderId: string;
  isSenderAllowed: (senderId: string, allowFrom: string[]) => boolean;
  readAllowFromStore: () => Promise<string[]>;
  shouldComputeCommandAuthorized: (
    text?: string,
    cfg?: import("../config/config.js").ClawdbotConfig,
  ) => boolean;
  resolveCommandAuthorizedFromAuthorizers: (params: {
    useAccessGroups: boolean;
    authorizers: Array<{ configured: boolean; allowed: boolean }>;
  }) => boolean;
}): Promise<{ commandAuthorized: boolean }> {
  const {
    rawBody,
    cfg,
    isGroup,
    dmPolicy,
    configuredAllowFrom,
    configuredGroupAllowFrom,
    senderId,
    isSenderAllowed: checkSender,
    readAllowFromStore,
    shouldComputeCommandAuthorized: shouldCompute,
    resolveCommandAuthorizedFromAuthorizers: resolveAuthorized,
  } = params;

  if (!shouldCompute(rawBody, cfg)) {
    return { commandAuthorized: true };
  }

  const storeAllowFrom = await readAllowFromStore().catch(() => [] as string[]);

  if (isGroup) {
    const groupAllowFrom = configuredGroupAllowFrom ?? configuredAllowFrom;
    const hasWildcard = groupAllowFrom.some((e) => String(e).trim() === "*");
    const configured = groupAllowFrom.length > 0;
    const allowed = hasWildcard || checkSender(senderId, [...groupAllowFrom, ...storeAllowFrom]);
    const commandAuthorized = resolveAuthorized({
      useAccessGroups: configured,
      authorizers: [{ configured, allowed }],
    });
    return { commandAuthorized };
  }

  // DM
  if (dmPolicy === "open") return { commandAuthorized: true };
  const dmAllowFrom = [...configuredAllowFrom, ...storeAllowFrom];
  const configured = dmAllowFrom.length > 0;
  const allowed = checkSender(senderId, dmAllowFrom);
  const commandAuthorized = resolveAuthorized({
    useAccessGroups: configured,
    authorizers: [{ configured, allowed }],
  });
  return { commandAuthorized };
}

/**
 * Like `resolveSenderCommandAuthorization` but accepts a `runtime` object
 * (the `commands` slice from `PluginRuntime["channel"]`) instead of explicit
 * `shouldComputeCommandAuthorized` / `resolveCommandAuthorizedFromAuthorizers` callbacks.
 * Also returns `senderAllowedForCommands` so callers can use it for DM gating.
 */
export async function resolveSenderCommandAuthorizationWithRuntime(params: {
  rawBody: string;
  cfg: import("../config/config.js").ClawdbotConfig;
  isGroup: boolean;
  dmPolicy: string;
  configuredAllowFrom: string[];
  configuredGroupAllowFrom?: string[];
  senderId: string;
  isSenderAllowed: (senderId: string, allowFrom: string[]) => boolean;
  readAllowFromStore: () => Promise<string[]>;
  runtime: {
    shouldComputeCommandAuthorized: (
      text?: string,
      cfg?: import("../config/config.js").ClawdbotConfig,
    ) => boolean;
    resolveCommandAuthorizedFromAuthorizers: (params: {
      useAccessGroups: boolean;
      authorizers: Array<{ configured: boolean; allowed: boolean }>;
    }) => boolean;
  };
}): Promise<{ senderAllowedForCommands: boolean; commandAuthorized: boolean }> {
  const {
    rawBody,
    cfg,
    isGroup,
    dmPolicy,
    configuredAllowFrom,
    configuredGroupAllowFrom,
    senderId,
    isSenderAllowed: checkSender,
    readAllowFromStore,
    runtime,
  } = params;

  if (!runtime.shouldComputeCommandAuthorized(rawBody, cfg)) {
    return { senderAllowedForCommands: true, commandAuthorized: true };
  }

  const storeAllowFrom = await readAllowFromStore().catch(() => [] as string[]);

  if (isGroup) {
    const groupAllowFrom = configuredGroupAllowFrom ?? configuredAllowFrom;
    const hasWildcard = groupAllowFrom.some((e) => String(e).trim() === "*");
    const configured = groupAllowFrom.length > 0;
    const allowed = hasWildcard || checkSender(senderId, [...groupAllowFrom, ...storeAllowFrom]);
    const commandAuthorized = runtime.resolveCommandAuthorizedFromAuthorizers({
      useAccessGroups: configured,
      authorizers: [{ configured, allowed }],
    });
    return { senderAllowedForCommands: allowed, commandAuthorized };
  }

  // DM
  if (dmPolicy === "open") return { senderAllowedForCommands: true, commandAuthorized: true };
  const dmAllowFrom = [...configuredAllowFrom, ...storeAllowFrom];
  const configured = dmAllowFrom.length > 0;
  const allowed = checkSender(senderId, dmAllowFrom);
  const commandAuthorized = runtime.resolveCommandAuthorizedFromAuthorizers({
    useAccessGroups: configured,
    authorizers: [{ configured, allowed }],
  });
  return { senderAllowedForCommands: allowed, commandAuthorized };
}

/**
 * Determine the DM authorization outcome based on policy and sender permission.
 * Returns "authorized", "disabled", or "unauthorized".
 */
export function resolveDirectDmAuthorizationOutcome(params: {
  isGroup: boolean;
  dmPolicy: string;
  senderAllowedForCommands: boolean;
}): "authorized" | "disabled" | "unauthorized" {
  const { isGroup, dmPolicy, senderAllowedForCommands } = params;
  if (isGroup) return "authorized";
  if (dmPolicy === "disabled") return "disabled";
  if (dmPolicy === "open") return "authorized";
  if (senderAllowedForCommands) return "authorized";
  return "unauthorized";
}
