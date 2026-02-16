import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
export type FeishuReaction = {
    reactionId: string;
    emojiType: string;
    operatorType: "app" | "user";
    operatorId: string;
};
/**
 * Add a reaction (emoji) to a message.
 * @param emojiType - Feishu emoji type, e.g., "SMILE", "THUMBSUP", "HEART"
 * @see https://open.feishu.cn/document/server-docs/im-v1/message-reaction/emojis-introduce
 */
export declare function addReactionFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    emojiType: string;
    accountId?: string;
}): Promise<{
    reactionId: string;
}>;
/**
 * Remove a reaction from a message.
 */
export declare function removeReactionFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    reactionId: string;
    accountId?: string;
}): Promise<void>;
/**
 * List all reactions for a message.
 */
export declare function listReactionsFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    emojiType?: string;
    accountId?: string;
}): Promise<FeishuReaction[]>;
/**
 * Common Feishu emoji types for convenience.
 * @see https://open.feishu.cn/document/server-docs/im-v1/message-reaction/emojis-introduce
 */
export declare const FeishuEmoji: {
    readonly THUMBSUP: "THUMBSUP";
    readonly THUMBSDOWN: "THUMBSDOWN";
    readonly HEART: "HEART";
    readonly SMILE: "SMILE";
    readonly GRINNING: "GRINNING";
    readonly LAUGHING: "LAUGHING";
    readonly CRY: "CRY";
    readonly ANGRY: "ANGRY";
    readonly SURPRISED: "SURPRISED";
    readonly THINKING: "THINKING";
    readonly CLAP: "CLAP";
    readonly OK: "OK";
    readonly FIST: "FIST";
    readonly PRAY: "PRAY";
    readonly FIRE: "FIRE";
    readonly PARTY: "PARTY";
    readonly CHECK: "CHECK";
    readonly CROSS: "CROSS";
    readonly QUESTION: "QUESTION";
    readonly EXCLAMATION: "EXCLAMATION";
};
export type FeishuEmojiType = (typeof FeishuEmoji)[keyof typeof FeishuEmoji];
//# sourceMappingURL=reactions.d.ts.map