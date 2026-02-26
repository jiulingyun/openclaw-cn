import { createReplyPrefixContext, createTypingCallbacks, logTypingFailure, isSilentReplyText, SILENT_REPLY_TOKEN, } from "openclaw/plugin-sdk";
import { resolveFeishuAccount } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { buildMentionedCardContent } from "./mention.js";
import { getFeishuRuntime } from "./runtime.js";
import { sendMarkdownCardFeishu, sendMessageFeishu } from "./send.js";
import { FeishuStreamingSession } from "./streaming-card.js";
import { resolveReceiveIdType } from "./targets.js";
import { addTypingIndicator, removeTypingIndicator } from "./typing.js";
/** Detect if text contains markdown elements that benefit from card rendering */
function shouldUseCard(text) {
    return /```[\s\S]*?```/.test(text) || /\|.+\|[\r\n]+\|[-:| ]+\|/.test(text);
}
export function createFeishuReplyDispatcher(params) {
    const core = getFeishuRuntime();
    const { cfg, agentId, chatId, replyToMessageId, mentionTargets, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    const prefixContext = createReplyPrefixContext({ cfg, agentId });
    let typingState = null;
    const typingCallbacks = createTypingCallbacks({
        start: async () => {
            if (!replyToMessageId) {
                return;
            }
            typingState = await addTypingIndicator({ cfg, messageId: replyToMessageId, accountId });
        },
        stop: async () => {
            if (!typingState) {
                return;
            }
            await removeTypingIndicator({ cfg, state: typingState, accountId });
            typingState = null;
        },
        onStartError: (err) => logTypingFailure({
            log: (message) => params.runtime.log?.(message),
            channel: "feishu",
            action: "start",
            error: err,
        }),
        onStopError: (err) => logTypingFailure({
            log: (message) => params.runtime.log?.(message),
            channel: "feishu",
            action: "stop",
            error: err,
        }),
    });
    const textChunkLimit = core.channel.text.resolveTextChunkLimit(cfg, "feishu", accountId, {
        fallbackLimit: 4000,
    });
    const chunkMode = core.channel.text.resolveChunkMode(cfg, "feishu");
    const tableMode = core.channel.text.resolveMarkdownTableMode({ cfg, channel: "feishu" });
    const renderMode = account.config?.renderMode ?? "auto";
    const streamingEnabled = account.config?.streaming !== false && renderMode !== "raw";
    let streaming = null;
    let streamText = "";
    let lastPartial = "";
    let partialUpdateQueue = Promise.resolve();
    let streamingStartPromise = null;
    let streamingClosed = false; // Double protection: block partial updates after streaming is closed
    const startStreaming = () => {
        // Guard: If there's already an active streaming session, reuse it instead of creating new one.
        // This prevents multiple FeishuStreamingSession instances from being created for the same message.
        if (streaming && streaming.isActive()) {
            return;
        }
        if (!streamingEnabled || streamingStartPromise || streaming) {
            return;
        }
        streamingClosed = false; // Reset flag when starting new streaming session
        streamingStartPromise = (async () => {
            const creds = account.appId && account.appSecret
                ? { appId: account.appId, appSecret: account.appSecret, domain: account.domain }
                : null;
            if (!creds) {
                return;
            }
            streaming = new FeishuStreamingSession(createFeishuClient(account), creds, (message) => params.runtime.log?.(`feishu[${account.accountId}] ${message}`));
            try {
                await streaming.start(chatId, resolveReceiveIdType(chatId));
            }
            catch (error) {
                params.runtime.error?.(`feishu: streaming start failed: ${String(error)}`);
                streaming = null;
            }
        })();
    };
    const closeStreaming = async () => {
        if (streamingStartPromise) {
            await streamingStartPromise;
        }
        await partialUpdateQueue;
        if (streaming?.isActive()) {
            // Filter out NO_REPLY token — if the model replied with NO_REPLY (silent reply),
            // we must NOT display it in the streaming card. Close with empty content instead.
            // Pass empty string explicitly to override any pendingText cached inside the session.
            const isSilent = isSilentReplyText(streamText, SILENT_REPLY_TOKEN);
            let text = isSilent ? "" : streamText;
            if (text && mentionTargets?.length) {
                text = buildMentionedCardContent(mentionTargets, text);
            }
            await streaming.close(isSilent ? "" : text || undefined);
        }
        // Deep disconnect state to avoid concurrent queue overlapping
        streaming = null;
        streamingStartPromise = null;
        streamText = "";
        lastPartial = "";
        partialUpdateQueue = Promise.resolve();
        streamingClosed = true; // Set flag to block any pending partial updates
    };
    const { dispatcher, replyOptions, markDispatchIdle } = core.channel.reply.createReplyDispatcherWithTyping({
        responsePrefix: prefixContext.responsePrefix,
        responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
        humanDelay: core.channel.reply.resolveHumanDelayConfig(cfg, agentId),
        onReplyStart: () => {
            if (streamingEnabled && renderMode === "card") {
                startStreaming();
            }
            void typingCallbacks.onReplyStart?.();
        },
        deliver: async (payload, info) => {
            const text = payload.text ?? "";
            if (!text.trim() || isSilentReplyText(text, SILENT_REPLY_TOKEN)) {
                // Double guard against sending NO/NO_REPLY as final or chunk text
                if (info?.kind === "final" && streaming?.isActive()) {
                    streamText = ""; // treat as empty
                    await closeStreaming();
                }
                return;
            }
            const useCard = renderMode === "card" || (renderMode === "auto" && shouldUseCard(text));
            if ((info?.kind === "block" || info?.kind === "final") && streamingEnabled && useCard) {
                startStreaming();
                if (streamingStartPromise) {
                    await streamingStartPromise;
                }
            }
            if (streaming?.isActive()) {
                if (info?.kind === "final") {
                    streamText = text;
                    await closeStreaming();
                }
                return;
            }
            let first = true;
            if (useCard) {
                for (const chunk of core.channel.text.chunkTextWithMode(text, textChunkLimit, chunkMode)) {
                    await sendMarkdownCardFeishu({
                        cfg,
                        to: chatId,
                        text: chunk,
                        replyToMessageId,
                        mentions: first ? mentionTargets : undefined,
                        accountId,
                    });
                    first = false;
                }
            }
            else {
                const converted = core.channel.text.convertMarkdownTables(text, tableMode);
                for (const chunk of core.channel.text.chunkTextWithMode(converted, textChunkLimit, chunkMode)) {
                    await sendMessageFeishu({
                        cfg,
                        to: chatId,
                        text: chunk,
                        replyToMessageId,
                        mentions: first ? mentionTargets : undefined,
                        accountId,
                    });
                    first = false;
                }
            }
        },
        onError: async (error, info) => {
            params.runtime.error?.(`feishu[${account.accountId}] ${info.kind} reply failed: ${String(error)}`);
            await closeStreaming();
            typingCallbacks.onIdle?.();
        },
        onIdle: async () => {
            await closeStreaming();
            typingCallbacks.onIdle?.();
        },
    });
    return {
        dispatcher,
        replyOptions: {
            ...replyOptions,
            onModelSelected: prefixContext.onModelSelected,
            onPartialReply: streamingEnabled
                ? (payload) => {
                    // Double protection: block partial updates after streaming is closed
                    if (streamingClosed) {
                        return;
                    }
                    if (!payload.text || payload.text === lastPartial) {
                        return;
                    }
                    // Do NOT stream NO_REPLY token — it is a silent reply signal, not user-visible text.
                    // When we detect NO_REPLY in the stream, we must also clear any partial content
                    // already written to the card (e.g. "N", "NO" were written before full "NO_REPLY" arrived).
                    if (isSilentReplyText(payload.text, SILENT_REPLY_TOKEN)) {
                        // Clear streamText so closeStreaming also sees empty content.
                        streamText = "";
                        lastPartial = payload.text;
                        // Actively clear the card content to erase any partial "NO" already displayed.
                        partialUpdateQueue = partialUpdateQueue.then(async () => {
                            if (streamingStartPromise) {
                                await streamingStartPromise;
                            }
                            if (streaming?.isActive()) {
                                try {
                                    await streaming.update("");
                                }
                                catch {
                                    // ignore errors clearing the card
                                }
                            }
                        });
                        return;
                    }
                    lastPartial = payload.text;
                    streamText = payload.text;
                    partialUpdateQueue = partialUpdateQueue.then(async () => {
                        if (streamingStartPromise) {
                            await streamingStartPromise;
                        }
                        if (streaming?.isActive()) {
                            await streaming.update(streamText);
                        }
                    });
                }
                : undefined,
        },
        markDispatchIdle,
    };
}
//# sourceMappingURL=reply-dispatcher.js.map