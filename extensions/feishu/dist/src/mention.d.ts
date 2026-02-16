import type { FeishuMessageEvent } from "./bot.js";
/**
 * Mention target user info
 */
export type MentionTarget = {
    openId: string;
    name: string;
    key: string;
};
/**
 * Extract mention targets from message event (excluding the bot itself)
 */
export declare function extractMentionTargets(event: FeishuMessageEvent, botOpenId?: string): MentionTarget[];
/**
 * Check if message is a mention forward request
 * Rules:
 * - Group: message mentions bot + at least one other user
 * - DM: message mentions any user (no need to mention bot)
 */
export declare function isMentionForwardRequest(event: FeishuMessageEvent, botOpenId?: string): boolean;
/**
 * Extract message body from text (remove @ placeholders)
 */
export declare function extractMessageBody(text: string, allMentionKeys: string[]): string;
/**
 * Format @mention for text message
 */
export declare function formatMentionForText(target: MentionTarget): string;
/**
 * Format @everyone for text message
 */
export declare function formatMentionAllForText(): string;
/**
 * Format @mention for card message (lark_md)
 */
export declare function formatMentionForCard(target: MentionTarget): string;
/**
 * Format @everyone for card message
 */
export declare function formatMentionAllForCard(): string;
/**
 * Build complete message with @mentions (text format)
 */
export declare function buildMentionedMessage(targets: MentionTarget[], message: string): string;
/**
 * Build card content with @mentions (Markdown format)
 */
export declare function buildMentionedCardContent(targets: MentionTarget[], message: string): string;
//# sourceMappingURL=mention.d.ts.map