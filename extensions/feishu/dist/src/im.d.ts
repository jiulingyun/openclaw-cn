import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createFeishuClient } from "./client.js";
/** List all chats the bot has joined */
export declare function listChats(client: ReturnType<typeof createFeishuClient>, pageSize?: number, pageToken?: string): Promise<{
    chats: {
        chat_id: string;
        name: string;
        description: string;
        owner_id: string;
        chat_mode: any;
        chat_type: any;
        member_count: any;
    }[];
    has_more: boolean;
    page_token: string;
}>;
/** Get detailed info about a specific chat */
export declare function getChatInfo(client: ReturnType<typeof createFeishuClient>, chatId: string): Promise<{
    chat_id: any;
    name: string;
    description: string;
    owner_id: string;
    chat_mode: any;
    chat_type: any;
    member_count: any;
    bot_name: any;
}>;
/** List members of a chat */
export declare function listChatMembers(client: ReturnType<typeof createFeishuClient>, chatId: string, pageSize?: number, pageToken?: string): Promise<{
    members: {
        member_id: string;
        member_id_type: string;
        name: string;
        tenant_key: string;
    }[];
    has_more: boolean;
    page_token: string;
    member_total: number;
}>;
/** Send a message to a chat or user */
export declare function sendMessage(client: ReturnType<typeof createFeishuClient>, receiveId: string, msgType: string, content: string, receiveIdType?: "chat_id" | "open_id" | "user_id" | "union_id" | "email"): Promise<{
    message_id: string;
    chat_id: string;
}>;
/** Reply to a specific message */
export declare function replyMessage(client: ReturnType<typeof createFeishuClient>, messageId: string, msgType: string, content: string): Promise<{
    message_id: string;
    chat_id: string;
}>;
/** List messages in a chat */
export declare function listMessages(client: ReturnType<typeof createFeishuClient>, containerId: string, startTime?: string, endTime?: string, pageSize?: number, pageToken?: string, sortType?: string): Promise<{
    messages: {
        message_id: string;
        msg_type: string;
        content: string;
        sender_id: string;
        sender_type: string;
        create_time: string;
        chat_id: string;
    }[];
    has_more: boolean;
    page_token: string;
}>;
/** Create a new chat group */
export declare function createChat(client: ReturnType<typeof createFeishuClient>, name: string, description?: string, userIds?: string[], chatMode?: string): Promise<{
    chat_id: string;
    name: string;
}>;
export declare function registerFeishuImTools(api: OpenClawPluginApi): void;
//# sourceMappingURL=im.d.ts.map