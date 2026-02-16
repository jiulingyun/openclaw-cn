import { resolveFeishuAccount } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { buildMentionedMessage, buildMentionedCardContent } from "./mention.js";
import { getFeishuRuntime } from "./runtime.js";
import { resolveReceiveIdType, normalizeFeishuTarget } from "./targets.js";
/**
 * Get a message by its ID.
 * Useful for fetching quoted/replied message content.
 */
export async function getMessageFeishu(params) {
    const { cfg, messageId, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    if (!account.configured) {
        throw new Error(`Feishu account "${account.accountId}" not configured`);
    }
    const client = createFeishuClient(account);
    try {
        const response = (await client.im.message.get({
            path: { message_id: messageId },
        }));
        if (response.code !== 0) {
            return null;
        }
        const item = response.data?.items?.[0];
        if (!item) {
            return null;
        }
        // Parse content based on message type
        let content = item.body?.content ?? "";
        try {
            const parsed = JSON.parse(content);
            if (item.msg_type === "text" && parsed.text) {
                content = parsed.text;
            }
        }
        catch {
            // Keep raw content if parsing fails
        }
        return {
            messageId: item.message_id ?? messageId,
            chatId: item.chat_id ?? "",
            senderId: item.sender?.id,
            senderOpenId: item.sender?.id_type === "open_id" ? item.sender?.id : undefined,
            content,
            contentType: item.msg_type ?? "text",
            createTime: item.create_time ? parseInt(item.create_time, 10) : undefined,
        };
    }
    catch {
        return null;
    }
}
function buildFeishuPostMessagePayload(params) {
    const { messageText } = params;
    return {
        content: JSON.stringify({
            zh_cn: {
                content: [
                    [
                        {
                            tag: "md",
                            text: messageText,
                        },
                    ],
                ],
            },
        }),
        msgType: "post",
    };
}
export async function sendMessageFeishu(params) {
    const { cfg, to, text, replyToMessageId, mentions, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    if (!account.configured) {
        throw new Error(`Feishu account "${account.accountId}" not configured`);
    }
    const client = createFeishuClient(account);
    const receiveId = normalizeFeishuTarget(to);
    if (!receiveId) {
        throw new Error(`Invalid Feishu target: ${to}`);
    }
    const receiveIdType = resolveReceiveIdType(receiveId);
    const tableMode = getFeishuRuntime().channel.text.resolveMarkdownTableMode({
        cfg,
        channel: "feishu",
    });
    // Build message content (with @mention support)
    let rawText = text ?? "";
    if (mentions && mentions.length > 0) {
        rawText = buildMentionedMessage(mentions, rawText);
    }
    const messageText = getFeishuRuntime().channel.text.convertMarkdownTables(rawText, tableMode);
    const { content, msgType } = buildFeishuPostMessagePayload({ messageText });
    if (replyToMessageId) {
        const response = await client.im.message.reply({
            path: { message_id: replyToMessageId },
            data: {
                content,
                msg_type: msgType,
            },
        });
        if (response.code !== 0) {
            throw new Error(`Feishu reply failed: ${response.msg || `code ${response.code}`}`);
        }
        return {
            messageId: response.data?.message_id ?? "unknown",
            chatId: receiveId,
        };
    }
    const response = await client.im.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
            receive_id: receiveId,
            content,
            msg_type: msgType,
        },
    });
    if (response.code !== 0) {
        throw new Error(`Feishu send failed: ${response.msg || `code ${response.code}`}`);
    }
    return {
        messageId: response.data?.message_id ?? "unknown",
        chatId: receiveId,
    };
}
export async function sendCardFeishu(params) {
    const { cfg, to, card, replyToMessageId, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    if (!account.configured) {
        throw new Error(`Feishu account "${account.accountId}" not configured`);
    }
    const client = createFeishuClient(account);
    const receiveId = normalizeFeishuTarget(to);
    if (!receiveId) {
        throw new Error(`Invalid Feishu target: ${to}`);
    }
    const receiveIdType = resolveReceiveIdType(receiveId);
    const content = JSON.stringify(card);
    if (replyToMessageId) {
        const response = await client.im.message.reply({
            path: { message_id: replyToMessageId },
            data: {
                content,
                msg_type: "interactive",
            },
        });
        if (response.code !== 0) {
            throw new Error(`Feishu card reply failed: ${response.msg || `code ${response.code}`}`);
        }
        return {
            messageId: response.data?.message_id ?? "unknown",
            chatId: receiveId,
        };
    }
    const response = await client.im.message.create({
        params: { receive_id_type: receiveIdType },
        data: {
            receive_id: receiveId,
            content,
            msg_type: "interactive",
        },
    });
    if (response.code !== 0) {
        throw new Error(`Feishu card send failed: ${response.msg || `code ${response.code}`}`);
    }
    return {
        messageId: response.data?.message_id ?? "unknown",
        chatId: receiveId,
    };
}
export async function updateCardFeishu(params) {
    const { cfg, messageId, card, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    if (!account.configured) {
        throw new Error(`Feishu account "${account.accountId}" not configured`);
    }
    const client = createFeishuClient(account);
    const content = JSON.stringify(card);
    const response = await client.im.message.patch({
        path: { message_id: messageId },
        data: { content },
    });
    if (response.code !== 0) {
        throw new Error(`Feishu card update failed: ${response.msg || `code ${response.code}`}`);
    }
}
/**
 * Build a Feishu interactive card with markdown content.
 * Cards render markdown properly (code blocks, tables, links, etc.)
 * Uses schema 2.0 format for proper markdown rendering.
 */
export function buildMarkdownCard(text) {
    return {
        schema: "2.0",
        config: {
            wide_screen_mode: true,
        },
        body: {
            elements: [
                {
                    tag: "markdown",
                    content: text,
                },
            ],
        },
    };
}
/**
 * Send a message as a markdown card (interactive message).
 * This renders markdown properly in Feishu (code blocks, tables, bold/italic, etc.)
 */
export async function sendMarkdownCardFeishu(params) {
    const { cfg, to, text, replyToMessageId, mentions, accountId } = params;
    // Build message content (with @mention support)
    let cardText = text;
    if (mentions && mentions.length > 0) {
        cardText = buildMentionedCardContent(mentions, text);
    }
    const card = buildMarkdownCard(cardText);
    return sendCardFeishu({ cfg, to, card, replyToMessageId, accountId });
}
/**
 * Edit an existing text message.
 * Note: Feishu only allows editing messages within 24 hours.
 */
export async function editMessageFeishu(params) {
    const { cfg, messageId, text, accountId } = params;
    const account = resolveFeishuAccount({ cfg, accountId });
    if (!account.configured) {
        throw new Error(`Feishu account "${account.accountId}" not configured`);
    }
    const client = createFeishuClient(account);
    const tableMode = getFeishuRuntime().channel.text.resolveMarkdownTableMode({
        cfg,
        channel: "feishu",
    });
    const messageText = getFeishuRuntime().channel.text.convertMarkdownTables(text ?? "", tableMode);
    const { content, msgType } = buildFeishuPostMessagePayload({ messageText });
    const response = await client.im.message.update({
        path: { message_id: messageId },
        data: {
            msg_type: msgType,
            content,
        },
    });
    if (response.code !== 0) {
        throw new Error(`Feishu message edit failed: ${response.msg || `code ${response.code}`}`);
    }
}
//# sourceMappingURL=send.js.map