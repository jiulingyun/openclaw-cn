import type { Client } from "@larksuiteoapi/node-sdk";
import { formatInboundEnvelope, resolveEnvelopeFormatOptions } from "../auto-reply/envelope.js";
import { dispatchReplyWithBufferedBlockDispatcher } from "../auto-reply/reply/provider-dispatcher.js";
import { parseTextCommand, getHelpMenuText, toSlashCommand } from "../channels/text-commands.js";
import type { ClawdbotConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { readSessionUpdatedAt, resolveStorePath } from "../config/sessions.js";
import { logVerbose } from "../globals.js";
import { getChildLogger } from "../logging.js";
import { isSenderAllowed, normalizeAllowFromWithStore, resolveSenderAllowMatch } from "./access.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import {
  resolveFeishuConfig,
  resolveFeishuGroupConfig,
  resolveFeishuGroupEnabled,
  type ResolvedFeishuConfig,
} from "./config.js";
import { resolveFeishuDocsFromMessage } from "./docs.js";
import {
  resolveFeishuMedia,
  downloadPostImages,
  extractPostImageKeys,
  type FeishuMediaRef,
} from "./download.js";
import { readFeishuAllowFromStore, upsertFeishuPairingRequest } from "./pairing-store.js";
import { sendMessageFeishu } from "./send.js";
import { FeishuStreamingSession } from "./streaming-card.js";
import { createTypingIndicatorCallbacks } from "./typing.js";
import { EmbeddedBlockChunker } from "../agents/pi-embedded-block-chunker.js";

const logger = getChildLogger({ module: "feishu-message" });

// Supported message types for processing
// - post: rich text (may contain document links)
const SUPPORTED_MSG_TYPES = ["text", "post", "image", "file", "audio", "media", "sticker"];

/** Feishu mention structure from SDK */
export type FeishuMention = {
  key?: string;
  id?: {
    union_id?: string;
    user_id?: string;
    open_id?: string;
  };
  name?: string;
  tenant_key?: string;
};

export type ProcessFeishuMessageOptions = {
  cfg?: ClawdbotConfig;
  accountId?: string;
  resolvedConfig?: ResolvedFeishuConfig;
  /** Feishu app credentials for streaming card API */
  credentials?: { appId: string; appSecret: string };
  /** Bot name for streaming card title (optional, defaults to no title) */
  botName?: string;
  /** Bot's own open_id for @mention detection in groups */
  botOpenId?: string;
};

export async function processFeishuMessage(
  client: Client,
  data: any,
  appId: string,
  options: ProcessFeishuMessageOptions = {},
) {
  const cfg = options.cfg ?? loadConfig();
  const accountId = options.accountId ?? appId;
  const feishuCfg = options.resolvedConfig ?? resolveFeishuConfig({ cfg, accountId });

  // SDK 2.0 schema: data directly contains message, sender, etc.
  const message = data.message ?? data.event?.message;
  const sender = data.sender ?? data.event?.sender;

  if (!message) {
    logger.warn(`Received event without message field`);
    return;
  }

  const chatId = message.chat_id;
  const isGroup = message.chat_type === "group";
  const msgType = message.message_type;
  const senderId = sender?.sender_id?.open_id || sender?.sender_id?.user_id || "unknown";
  const senderUnionId = sender?.sender_id?.union_id;
  const maxMediaBytes = feishuCfg.mediaMaxMb * 1024 * 1024;

  // Resolve agent route
  const route = resolveAgentRoute({
    cfg,
    channel: "feishu",
    accountId,
    peer: {
      kind: isGroup ? "group" : "dm",
      id: isGroup ? chatId : senderId,
    },
  });

  // Check if this is a supported message type
  if (!SUPPORTED_MSG_TYPES.includes(msgType)) {
    logger.debug(`Skipping unsupported message type: ${msgType}`);
    return;
  }

  // Load allowlist from store
  const storeAllowFrom = await readFeishuAllowFromStore().catch(() => []);

  // ===== Access Control =====

  // Group access control
  if (isGroup) {
    // Check if group is enabled
    if (!resolveFeishuGroupEnabled({ cfg, accountId, chatId })) {
      logVerbose(`Blocked feishu group ${chatId} (group disabled)`);
      return;
    }

    const { groupConfig } = resolveFeishuGroupConfig({ cfg, accountId, chatId });

    // Check group-level allowFrom override
    if (groupConfig?.allowFrom) {
      const groupAllow = normalizeAllowFromWithStore({
        allowFrom: groupConfig.allowFrom,
        storeAllowFrom,
      });
      if (!isSenderAllowed({ allow: groupAllow, senderId })) {
        logVerbose(`Blocked feishu group sender ${senderId} (group allowFrom override)`);
        return;
      }
    }

    // Apply groupPolicy
    const groupPolicy = feishuCfg.groupPolicy;
    if (groupPolicy === "disabled") {
      logVerbose(`Blocked feishu group message (groupPolicy: disabled)`);
      return;
    }

    if (groupPolicy === "allowlist") {
      const groupAllow = normalizeAllowFromWithStore({
        allowFrom:
          feishuCfg.groupAllowFrom.length > 0 ? feishuCfg.groupAllowFrom : feishuCfg.allowFrom,
        storeAllowFrom,
      });
      if (!groupAllow.hasEntries) {
        logVerbose(`Blocked feishu group message (groupPolicy: allowlist, no entries)`);
        return;
      }
      if (!isSenderAllowed({ allow: groupAllow, senderId })) {
        logVerbose(`Blocked feishu group sender ${senderId} (groupPolicy: allowlist)`);
        return;
      }
    }
  }

  // DM access control
  if (!isGroup) {
    const dmPolicy = feishuCfg.dmPolicy;

    if (dmPolicy === "disabled") {
      logVerbose(`Blocked feishu DM (dmPolicy: disabled)`);
      return;
    }

    if (dmPolicy !== "open") {
      const dmAllow = normalizeAllowFromWithStore({
        allowFrom: feishuCfg.allowFrom,
        storeAllowFrom,
      });
      const allowMatch = resolveSenderAllowMatch({ allow: dmAllow, senderId });
      const allowed = dmAllow.hasWildcard || (dmAllow.hasEntries && allowMatch.allowed);

      if (!allowed) {
        if (dmPolicy === "pairing") {
          // Generate pairing code for unknown sender
          try {
            const { code, created } = await upsertFeishuPairingRequest({
              openId: senderId,
              unionId: senderUnionId,
              name: sender?.sender_id?.user_id,
            });
            if (created) {
              logger.info({ openId: senderId, unionId: senderUnionId }, "feishu pairing request");
              await sendMessageFeishu(
                client,
                senderId,
                {
                  text: [
                    "Clawdbot: 访问未配置。",
                    "",
                    `您的飞书 Open ID: ${senderId}`,
                    "",
                    `配对码: ${code}`,
                    "",
                    "请让机器人管理员执行以下命令批准:",
                    `openclaw-cn pairing approve feishu ${code}`,
                  ].join("\n"),
                },
                { receiveIdType: "open_id" },
              );
            }
          } catch (err) {
            logger.error(`Failed to create pairing request: ${err}`);
          }
          return;
        }

        // allowlist policy: silently block
        logVerbose(`Blocked feishu DM from ${senderId} (dmPolicy: allowlist)`);
        return;
      }
    }
  }

  // Handle @mentions for group chats
  const mentions: FeishuMention[] = message.mentions ?? data.mentions ?? [];
  const botOpenId = options.botOpenId;
  // Check if the bot itself was mentioned, not just any @mention
  const wasMentioned = botOpenId
    ? mentions.some((m) => m.id?.open_id === botOpenId)
    : mentions.length > 0; // Fallback if botOpenId not available

  // In group chat, check requireMention setting
  if (isGroup) {
    const { groupConfig } = resolveFeishuGroupConfig({ cfg, accountId, chatId });
    const requireMention = groupConfig?.requireMention ?? true;
    if (requireMention && !wasMentioned) {
      logger.debug(`Ignoring group message without @mention (requireMention: true)`);
      return;
    }
  }

  // Extract text content (for text messages or rich text)
  let text = "";
  if (msgType === "text") {
    try {
      const content = JSON.parse(message.content);
      text = content.text || "";
    } catch (e) {
      logger.error(`Failed to parse text message content: ${e}`);
    }
  } else if (msgType === "post") {
    // Extract text from rich text (post) message
    // Handles both direct format { title, content } and locale-wrapped format { post: { zh_cn: { title, content } } }
    try {
      const content = JSON.parse(message.content);
      const parts: string[] = [];

      // Try to find the actual post content
      // Format 1: { post: { zh_cn: { title, content } } }
      // Format 2: { title, content } (direct)
      let postData = content;
      if (content.post && typeof content.post === "object") {
        // Find the first locale key (zh_cn, en_us, etc.)
        const localeKey = Object.keys(content.post).find(
          (key) => content.post[key]?.content || content.post[key]?.title,
        );
        if (localeKey) {
          postData = content.post[localeKey];
        }
      }

      // Include title if present
      if (postData.title) {
        parts.push(postData.title);
      }

      // Extract text from content elements
      if (Array.isArray(postData.content)) {
        for (const line of postData.content) {
          if (!Array.isArray(line)) continue;
          const lineParts: string[] = [];
          for (const element of line) {
            if (element.tag === "text" && element.text) {
              lineParts.push(element.text);
            } else if (element.tag === "a" && element.text) {
              lineParts.push(element.text);
            } else if (element.tag === "at" && element.user_name) {
              lineParts.push(`@${element.user_name}`);
            }
          }
          if (lineParts.length > 0) {
            parts.push(lineParts.join(""));
          }
        }
      }

      text = parts.join("\n");
    } catch (e) {
      logger.error(`Failed to parse post message content: ${e}`);
    }
  }

  // Remove @mention placeholders from text
  for (const mention of mentions) {
    if (mention.key) {
      text = text.replace(mention.key, "").trim();
    }
  }

  // ===== Text Command Detection =====
  // Detect help triggers and Chinese command aliases
  const textCommandResult = parseTextCommand(text);

  if (textCommandResult.type === "help") {
    // Respond with help menu
    logger.debug(`Text command detected: help trigger`);
    await sendMessageFeishu(
      client,
      chatId,
      { text: getHelpMenuText() },
      {
        msgType: "text",
        receiveIdType: "chat_id",
      },
    );
    return;
  }

  // Convert Chinese command alias to slash command
  if (textCommandResult.type === "command") {
    const slashCommand = toSlashCommand(textCommandResult);
    if (slashCommand) {
      logger.debug(`Text command detected: ${text} -> ${slashCommand}`);
      text = slashCommand;
    }
  }

  // Resolve media if present (for image, file, audio, media, sticker types)
  let media: FeishuMediaRef | null = null;
  let postImages: FeishuMediaRef[] = [];
  if (!["text", "post"].includes(msgType)) {
    try {
      media = await resolveFeishuMedia(client, message, maxMediaBytes);
    } catch (err) {
      logger.error(`Failed to download media: ${err}`);
    }
  } else if (msgType === "post") {
    // Download embedded images from post (rich text) message
    try {
      const content = JSON.parse(message.content);
      const imageKeys = extractPostImageKeys(content);
      if (imageKeys.length > 0) {
        logger.debug(`Found ${imageKeys.length} embedded images in post message`);
        postImages = await downloadPostImages(
          client,
          message.message_id,
          imageKeys,
          maxMediaBytes,
          5, // max 5 images
        );
        logger.debug(`Downloaded ${postImages.length} embedded images`);
      }
    } catch (err) {
      logger.error(`Failed to download post images: ${err}`);
    }
  }

  // Resolve document content if message contains Feishu doc links
  let docContent: string | null = null;
  if (msgType === "text" || msgType === "post") {
    try {
      docContent = await resolveFeishuDocsFromMessage(client, message, {
        maxDocsPerMessage: 3,
        maxTotalLength: 100000,
      });
      if (docContent) {
        logger.debug(`Resolved ${docContent.length} chars of document content`);
      }
    } catch (err) {
      logger.error(`Failed to resolve document content: ${err}`);
    }
  }

  // Build body text
  let bodyText = text;
  if (!bodyText && media) {
    bodyText = media.placeholder;
  }
  // If we have embedded images from post message, add placeholders
  if (postImages.length > 0 && !media) {
    const imagePlaceholders = postImages.map(() => "<media:image>").join(" ");
    bodyText = bodyText ? `${bodyText}\n${imagePlaceholders}` : imagePlaceholders;
  }

  // Append document content if available
  if (docContent) {
    bodyText = bodyText ? `${bodyText}\n\n${docContent}` : docContent;
  }

  // Skip if no content
  if (!bodyText && !media && postImages.length === 0) {
    logger.debug(`Empty message after processing, skipping`);
    return;
  }

  // Build sender label (similar to Telegram format)
  const senderName = sender?.sender_id?.user_id || "unknown";
  const senderOpenId = sender?.sender_id?.open_id;
  // For DM: use sender info as conversation label
  // For group: use group title + id
  const groupTitle = message.chat?.title || message.chat_type === "group" ? "Group" : undefined;
  const conversationLabel = isGroup
    ? `${groupTitle} id:${chatId}`
    : senderOpenId
      ? `${senderName} id:${senderOpenId}`
      : senderName;

  // Resolve envelope options and previous timestamp for elapsed time
  const envelopeOptions = resolveEnvelopeFormatOptions(cfg);
  const storePath = resolveStorePath(cfg.session?.store, {
    agentId: route.agentId,
  });
  const previousTimestamp = readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });

  // Resolve reply-to mode for group chats
  // In group chats, we quote the original message to provide context
  const { groupConfig } = isGroup
    ? resolveFeishuGroupConfig({ cfg, accountId, chatId })
    : { groupConfig: undefined };
  const replyToMode = isGroup ? (groupConfig?.replyToMode ?? feishuCfg.replyToMode) : "off";
  const originalMessageId = message.message_id;
  let hasReplied = false; // Track if we've sent at least one reply (for "first" mode)

  // Streaming mode support
  const streamingEnabled = feishuCfg.streaming !== false && options.credentials; // Default to true if credentials available
  const streamingSession =
    streamingEnabled && options.credentials
      ? new FeishuStreamingSession(client, options.credentials)
      : null;
  let streamingStarted = false;
  let lastPartialText = "";
  // Chunker for throttling streaming updates (minimize API calls)
  const streamingChunker = streamingSession
    ? new EmbeddedBlockChunker({ minChars: 80, maxChars: 400, breakPreference: "sentence" })
    : null;

  // Typing indicator callbacks (for non-streaming mode)
  const typingCallbacks = createTypingIndicatorCallbacks(client, message.message_id);

  // Format body with standardized envelope (consistent with Telegram/WhatsApp)
  const formattedBody = formatInboundEnvelope({
    channel: "Feishu",
    from: conversationLabel,
    timestamp: message.create_time ? Number(message.create_time) * 1000 : undefined,
    body: bodyText,
    chatType: isGroup ? "group" : "direct",
    sender: {
      name: senderName,
      id: senderOpenId || senderId,
    },
    previousTimestamp,
    envelope: envelopeOptions,
  });

  // Context construction
  const ctx = {
    Body: formattedBody,
    RawBody: text || media?.placeholder || "",
    From: senderId,
    To: chatId,
    SessionKey: route.sessionKey,
    SenderId: senderId,
    SenderName: senderName,
    ChatType: isGroup ? "group" : "direct",
    Provider: "feishu",
    Surface: "feishu",
    Timestamp: Number(message.create_time),
    MessageSid: message.message_id,
    AccountId: route.accountId,
    OriginatingChannel: "feishu",
    OriginatingTo: chatId,
    // Media fields (similar to Telegram)
    MediaPath: media?.path ?? postImages[0]?.path,
    MediaType: media?.contentType ?? postImages[0]?.contentType,
    MediaUrl: media?.path ?? postImages[0]?.path,
    // Multiple media from post messages
    MediaPaths: postImages.length > 0 ? postImages.map((img) => img.path) : undefined,
    MediaUrls: postImages.length > 0 ? postImages.map((img) => img.path) : undefined,
    WasMentioned: isGroup ? wasMentioned : undefined,
    // Command authorization - if message passed access control, sender is authorized
    CommandAuthorized: true,
  };

  await dispatchReplyWithBufferedBlockDispatcher({
    ctx,
    cfg,
    dispatcherOptions: {
      deliver: async (payload, info) => {
        const hasMedia = payload.mediaUrl || (payload.mediaUrls && payload.mediaUrls.length > 0);
        if (!payload.text && !hasMedia) return;

        // Block replies are handled by onPartialReply with chunking/throttling
        // Only skip block payloads when streaming is active (otherwise they need normal delivery)
        if (info?.kind === "block" && streamingSession?.isActive()) return;

        // If streaming was active, close it with the final text
        if (streamingSession?.isActive() && info?.kind === "final") {
          // Use payload.text if available, otherwise fallback to lastPartialText
          const finalText = payload.text || lastPartialText;
          const closed = await streamingSession.close(finalText);
          streamingStarted = false;
          if (closed) return; // Card successfully contains the final text
          // Streaming card failed — fall through to send as regular message
          logger.warn("Streaming card close failed, falling back to regular message");
        }

        // Handle media URLs
        const mediaUrls = payload.mediaUrls?.length
          ? payload.mediaUrls
          : payload.mediaUrl
            ? [payload.mediaUrl]
            : [];

        // Determine if this reply should quote the original message
        const shouldQuote = replyToMode === "all" || (replyToMode === "first" && !hasReplied);
        const replyToMessageId = shouldQuote ? originalMessageId : undefined;

        if (mediaUrls.length > 0) {
          // Close streaming session before sending media
          if (streamingSession?.isActive()) {
            await streamingSession.close();
            streamingStarted = false;
          }
          // Remove typing indicator before sending media
          await typingCallbacks.onIdle();
          // Send each media item
          for (let i = 0; i < mediaUrls.length; i++) {
            const mediaUrl = mediaUrls[i];
            const caption = i === 0 ? payload.text || "" : "";
            // Only quote on the first media item
            const mediaReplyTo = i === 0 ? replyToMessageId : undefined;
            await sendMessageFeishu(
              client,
              chatId,
              { text: caption },
              {
                mediaUrl,
                receiveIdType: "chat_id",
                replyToMessageId: mediaReplyTo,
              },
            );
            if (i === 0) hasReplied = true;
          }
        } else if (payload.text) {
          // If streaming wasn't used, send as regular message
          if (!streamingSession?.isActive()) {
            // Remove typing indicator before sending final reply
            await typingCallbacks.onIdle();
            await sendMessageFeishu(
              client,
              chatId,
              { text: payload.text },
              {
                msgType: "text",
                receiveIdType: "chat_id",
                replyToMessageId,
              },
            );
            hasReplied = true;
          }
        }
      },
      onError: (err) => {
        const msg = String(err);
        if (
          msg.includes("permission") ||
          msg.includes("forbidden") ||
          msg.includes("code: 99991660")
        ) {
          logger.error(
            `Reply error: ${msg} (Check if "im:message" or "im:resource" permissions are enabled in Feishu Console)`,
          );
        } else {
          logger.error(`Reply error: ${msg}`);
        }
        // Clean up streaming session on error
        if (streamingSession?.isActive()) {
          streamingSession.close().catch(() => {});
        }
        // Clean up typing indicator on error
        typingCallbacks.onIdle().catch(() => {});
      },
      onReplyStart: async () => {
        // Start streaming card when reply generation begins
        if (streamingSession && !streamingStarted) {
          try {
            await streamingSession.start(chatId, "chat_id", options.botName);
            streamingStarted = true;
            logger.debug(`Started streaming card for chat ${chatId}`);
          } catch (err) {
            const msg = String(err);
            if (msg.includes("permission") || msg.includes("forbidden")) {
              logger.warn(
                `Failed to start streaming card: ${msg} (Check if "im:resource:msg:send" or card permissions are enabled)`,
              );
            } else {
              logger.warn(`Failed to start streaming card: ${msg}`);
            }
            // Continue without streaming
          }
        } else if (!streamingSession) {
          // Non-streaming mode: use typing indicator
          await typingCallbacks.onReplyStart();
        }
      },
    },
    replyOptions: {
      disableBlockStreaming: !feishuCfg.blockStreaming,
      onPartialReply: streamingSession
        ? async (payload) => {
            if (!streamingSession.isActive() || !payload.text) return;
            if (payload.text === lastPartialText) return;
            // Calculate delta from cumulative text
            const delta = payload.text.slice(lastPartialText.length);
            lastPartialText = payload.text;
            if (!delta) return;
            // Capture current text for the emit callback
            const currentText = payload.text;
            // Use chunker to throttle updates
            streamingChunker?.append(delta);
            streamingChunker?.drain({
              force: false,
              emit: () => {
                // Update card with cumulative text (not just the chunk)
                streamingSession.update(currentText).catch((err) => {
                  logger.warn(`Streaming update failed: ${err}`);
                });
              },
            });
          }
        : undefined,
      onReasoningStream: streamingSession
        ? async (payload) => {
            // Also update on reasoning stream for extended thinking models
            if (!streamingSession.isActive() || !payload.text) return;
            if (payload.text === lastPartialText) return;
            const delta = payload.text.slice(lastPartialText.length);
            lastPartialText = payload.text;
            if (!delta) return;
            const currentText = payload.text;
            streamingChunker?.append(delta);
            streamingChunker?.drain({
              force: false,
              emit: () => {
                streamingSession.update(currentText).catch((err) => {
                  logger.warn(`Reasoning stream update failed: ${err}`);
                });
              },
            });
          }
        : undefined,
    },
  });

  // Flush any remaining buffered content and close streaming session
  if (streamingSession?.isActive()) {
    // Force drain remaining buffer before closing
    if (streamingChunker?.hasBuffered()) {
      streamingChunker.drain({
        force: true,
        emit: () => {
          streamingSession.update(lastPartialText).catch(() => {});
        },
      });
    }
    // Always close with the complete accumulated text
    await streamingSession.close(lastPartialText || undefined);
  }
}
