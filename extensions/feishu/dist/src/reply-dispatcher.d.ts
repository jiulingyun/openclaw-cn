import { type OpenClawConfig as ClawdbotConfig, type ReplyPayload, type RuntimeEnv } from "openclaw/plugin-sdk";
import type { MentionTarget } from "./mention.js";
export type CreateFeishuReplyDispatcherParams = {
    cfg: ClawdbotConfig;
    agentId: string;
    runtime: RuntimeEnv;
    chatId: string;
    replyToMessageId?: string;
    mentionTargets?: MentionTarget[];
    accountId?: string;
};
export declare function createFeishuReplyDispatcher(params: CreateFeishuReplyDispatcherParams): {
    dispatcher: {
        sendToolResult: (payload: ReplyPayload) => boolean;
        sendBlockReply: (payload: ReplyPayload) => boolean;
        sendFinalReply: (payload: ReplyPayload) => boolean;
        waitForIdle: () => Promise<void>;
        getQueuedCounts: () => Record<"tool" | "block" | "final", number>;
    };
    replyOptions: {
        onModelSelected: (ctx: {
            provider: string;
            model: string;
            thinkLevel: string | undefined;
        }) => void;
        onPartialReply: (payload: ReplyPayload) => void;
        onReplyStart?: () => Promise<void> | void;
        onTypingController?: (typing: {
            onReplyStart: () => Promise<void>;
            startTypingLoop: () => Promise<void>;
            startTypingOnText: (text?: string) => Promise<void>;
            refreshTypingTtl: () => void;
            isActive: () => boolean;
            markRunComplete: () => void;
            markDispatchIdle: () => void;
            cleanup: () => void;
        }) => void;
    };
    markDispatchIdle: () => void;
};
//# sourceMappingURL=reply-dispatcher.d.ts.map