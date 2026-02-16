import type { OpenClawConfig as ClawdbotConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import { type HistoryEntry } from "openclaw/plugin-sdk";
import type { FeishuMessageContext } from "./types.js";
export type FeishuMessageEvent = {
    sender: {
        sender_id: {
            open_id?: string;
            user_id?: string;
            union_id?: string;
        };
        sender_type?: string;
        tenant_key?: string;
    };
    message: {
        message_id: string;
        root_id?: string;
        parent_id?: string;
        chat_id: string;
        chat_type: "p2p" | "group";
        message_type: string;
        content: string;
        mentions?: Array<{
            key: string;
            id: {
                open_id?: string;
                user_id?: string;
                union_id?: string;
            };
            name: string;
            tenant_key?: string;
        }>;
    };
};
export type FeishuBotAddedEvent = {
    chat_id: string;
    operator_id: {
        open_id?: string;
        user_id?: string;
        union_id?: string;
    };
    external: boolean;
    operator_tenant_key?: string;
};
export declare function parseFeishuMessageEvent(event: FeishuMessageEvent, botOpenId?: string): FeishuMessageContext;
export declare function handleFeishuMessage(params: {
    cfg: ClawdbotConfig;
    event: FeishuMessageEvent;
    botOpenId?: string;
    runtime?: RuntimeEnv;
    chatHistories?: Map<string, HistoryEntry[]>;
    accountId?: string;
}): Promise<void>;
//# sourceMappingURL=bot.d.ts.map