import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
import type { MentionTarget } from "./mention.js";
import type { FeishuSendResult } from "./types.js";
export type FeishuMessageInfo = {
    messageId: string;
    chatId: string;
    senderId?: string;
    senderOpenId?: string;
    content: string;
    contentType: string;
    createTime?: number;
};
/**
 * Get a message by its ID.
 * Useful for fetching quoted/replied message content.
 */
export declare function getMessageFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    accountId?: string;
}): Promise<FeishuMessageInfo | null>;
export type SendFeishuMessageParams = {
    cfg: ClawdbotConfig;
    to: string;
    text: string;
    replyToMessageId?: string;
    /** Mention target users */
    mentions?: MentionTarget[];
    /** Account ID (optional, uses default if not specified) */
    accountId?: string;
};
export declare function sendMessageFeishu(params: SendFeishuMessageParams): Promise<FeishuSendResult>;
export type SendFeishuCardParams = {
    cfg: ClawdbotConfig;
    to: string;
    card: Record<string, unknown>;
    replyToMessageId?: string;
    accountId?: string;
};
export declare function sendCardFeishu(params: SendFeishuCardParams): Promise<FeishuSendResult>;
export declare function updateCardFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    card: Record<string, unknown>;
    accountId?: string;
}): Promise<void>;
/**
 * Build a Feishu interactive card with markdown content.
 * Cards render markdown properly (code blocks, tables, links, etc.)
 * Uses schema 2.0 format for proper markdown rendering.
 */
export declare function buildMarkdownCard(text: string): Record<string, unknown>;
/**
 * Send a message as a markdown card (interactive message).
 * This renders markdown properly in Feishu (code blocks, tables, bold/italic, etc.)
 */
export declare function sendMarkdownCardFeishu(params: {
    cfg: ClawdbotConfig;
    to: string;
    text: string;
    replyToMessageId?: string;
    /** Mention target users */
    mentions?: MentionTarget[];
    accountId?: string;
}): Promise<FeishuSendResult>;
/**
 * Edit an existing text message.
 * Note: Feishu only allows editing messages within 24 hours.
 */
export declare function editMessageFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    text: string;
    accountId?: string;
}): Promise<void>;
//# sourceMappingURL=send.d.ts.map