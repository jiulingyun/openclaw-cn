import { type OpenClawConfig as ClawdbotConfig, type RuntimeEnv } from "openclaw/plugin-sdk";
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
    dispatcher: any;
    replyOptions: any;
    markDispatchIdle: any;
};
//# sourceMappingURL=reply-dispatcher.d.ts.map