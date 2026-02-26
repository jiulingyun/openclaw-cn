import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { resolveToolsConfig } from "./tools-config.js";
import { ListChatsSchema, GetChatSchema, ListMembersSchema, SendMessageSchema, ReplyMessageSchema, GetMessagesSchema, CreateChatSchema, } from "./im-schema.js";
// ============ Helpers ============
function json(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        details: data,
    };
}
/** Auto-detect receive_id_type from the ID format */
function inferReceiveIdType(receiveId) {
    if (receiveId.startsWith("oc_"))
        return "chat_id";
    if (receiveId.startsWith("ou_"))
        return "open_id";
    if (receiveId.startsWith("on_"))
        return "union_id";
    if (receiveId.includes("@"))
        return "email";
    return "user_id";
}
// ============ Core Functions ============
/** List all chats the bot has joined */
export async function listChats(client, pageSize, pageToken) {
    const res = await client.im.chat.list({
        params: {
            page_size: pageSize ?? 20,
            ...(pageToken && { page_token: pageToken }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        chats: (res.data?.items ?? []).map((c) => ({
            chat_id: c.chat_id,
            name: c.name,
            description: c.description,
            owner_id: c.owner_id,
            chat_mode: c.chat_mode,
            chat_type: c.chat_type,
            member_count: c.user_count,
        })),
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
    };
}
/** Get detailed info about a specific chat */
export async function getChatInfo(client, chatId) {
    const res = await client.im.chat.get({
        path: { chat_id: chatId },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        chat_id: res.data?.chat_id,
        name: res.data?.name,
        description: res.data?.description,
        owner_id: res.data?.owner_id,
        chat_mode: res.data?.chat_mode,
        chat_type: res.data?.chat_type,
        member_count: res.data?.user_count,
        bot_name: res.data?.bot_name,
    };
}
/** List members of a chat */
export async function listChatMembers(client, chatId, pageSize, pageToken) {
    const res = await client.im.chatMembers.get({
        path: { chat_id: chatId },
        params: {
            page_size: pageSize ?? 20,
            ...(pageToken && { page_token: pageToken }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        members: (res.data?.items ?? []).map((m) => ({
            member_id: m.member_id,
            member_id_type: m.member_id_type,
            name: m.name,
            tenant_key: m.tenant_key,
        })),
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
        member_total: res.data?.member_total,
    };
}
/** Send a message to a chat or user */
export async function sendMessage(client, receiveId, msgType, content, receiveIdType) {
    const idType = receiveIdType || inferReceiveIdType(receiveId);
    const res = await client.im.message.create({
        params: {
            receive_id_type: idType,
        },
        data: {
            receive_id: receiveId,
            msg_type: msgType,
            content,
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        message_id: res.data?.message_id,
        chat_id: res.data?.chat_id,
    };
}
/** Reply to a specific message */
export async function replyMessage(client, messageId, msgType, content) {
    const res = await client.im.message.reply({
        path: { message_id: messageId },
        data: {
            msg_type: msgType,
            content,
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        message_id: res.data?.message_id,
        chat_id: res.data?.chat_id,
    };
}
/** List messages in a chat */
export async function listMessages(client, containerId, startTime, endTime, pageSize, pageToken, sortType) {
    const res = await client.im.message.list({
        params: {
            container_id_type: "chat",
            container_id: containerId,
            page_size: pageSize ?? 20,
            ...(startTime && { start_time: startTime }),
            ...(endTime && { end_time: endTime }),
            ...(pageToken && { page_token: pageToken }),
            ...(sortType && { sort_type: sortType }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        messages: (res.data?.items ?? []).map((m) => ({
            message_id: m.message_id,
            msg_type: m.msg_type,
            content: m.body?.content,
            sender_id: m.sender?.id,
            sender_type: m.sender?.sender_type,
            create_time: m.create_time,
            chat_id: m.chat_id,
        })),
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
    };
}
/** Create a new chat group */
export async function createChat(client, name, description, userIds, chatMode) {
    const res = await client.im.chat.create({
        params: {
            // 使用 open_id 类型标识成员
            ...(userIds && userIds.length > 0 && { set_bot_manager: false }),
        },
        data: {
            name,
            ...(description && { description }),
            ...(userIds &&
                userIds.length > 0 && {
                user_id_list: userIds,
            }),
            ...(chatMode && { chat_mode: chatMode }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        chat_id: res.data?.chat_id,
        name: res.data?.name,
    };
}
// ============ Tool Registration ============
export function registerFeishuImTools(api) {
    if (!api.config) {
        api.logger.debug?.("feishu_im: No config available, skipping IM tools");
        return;
    }
    const accounts = listEnabledFeishuAccounts(api.config);
    if (accounts.length === 0) {
        api.logger.debug?.("feishu_im: No Feishu accounts configured, skipping IM tools");
        return;
    }
    const firstAccount = accounts[0];
    const toolsCfg = resolveToolsConfig(firstAccount.config.tools);
    if (!toolsCfg.im) {
        api.logger.debug?.("feishu_im: IM tools disabled in config");
        return;
    }
    const getClient = () => createFeishuClient(firstAccount);
    const registered = [];
    // Tool 1: feishu_im_list_chats
    api.registerTool({
        name: "feishu_im_list_chats",
        label: "飞书 - 列出群聊",
        description: "列出机器人已加入的所有群聊，返回群名称、ID、成员数等信息",
        parameters: ListChatsSchema,
        async execute(_toolCallId, params) {
            const { page_size, page_token } = params;
            try {
                return json(await listChats(getClient(), page_size, page_token));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_list_chats" });
    registered.push("feishu_im_list_chats");
    // Tool 2: feishu_im_get_chat
    api.registerTool({
        name: "feishu_im_get_chat",
        label: "飞书 - 获取群信息",
        description: "获取指定群聊的详细信息，包括名称、描述、群主、成员数等",
        parameters: GetChatSchema,
        async execute(_toolCallId, params) {
            const { chat_id } = params;
            try {
                return json(await getChatInfo(getClient(), chat_id));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_get_chat" });
    registered.push("feishu_im_get_chat");
    // Tool 3: feishu_im_list_members
    api.registerTool({
        name: "feishu_im_list_members",
        label: "飞书 - 获取群成员",
        description: "获取指定群聊的成员列表，返回成员 ID、名称等。可用于找到要 @mention 的用户。",
        parameters: ListMembersSchema,
        async execute(_toolCallId, params) {
            const { chat_id, page_size, page_token } = params;
            try {
                return json(await listChatMembers(getClient(), chat_id, page_size, page_token));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_list_members" });
    registered.push("feishu_im_list_members");
    // Tool 4: feishu_im_send_message
    api.registerTool({
        name: "feishu_im_send_message",
        label: "飞书 - 发送消息",
        description: '主动向群聊或用户发送消息。支持 text(纯文本)、post(富文本)、interactive(卡片) 三种类型。\n发送 @mention 时使用 <at user_id="ou_xxx">名字</at> 语法。\nreceive_id 自动识别类型：oc_ 开头为群聊 ID，ou_ 开头为用户 open_id。',
        parameters: SendMessageSchema,
        async execute(_toolCallId, params) {
            const { receive_id, receive_id_type, msg_type, content } = params;
            try {
                return json(await sendMessage(getClient(), receive_id, msg_type, content, receive_id_type));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_send_message" });
    registered.push("feishu_im_send_message");
    // Tool 5: feishu_im_reply_message
    api.registerTool({
        name: "feishu_im_reply_message",
        label: "飞书 - 回复消息",
        description: "回复指定的消息。将在原消息下方产生回复。",
        parameters: ReplyMessageSchema,
        async execute(_toolCallId, params) {
            const { message_id, msg_type, content } = params;
            try {
                return json(await replyMessage(getClient(), message_id, msg_type, content));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_reply_message" });
    registered.push("feishu_im_reply_message");
    // Tool 6: feishu_im_get_messages
    api.registerTool({
        name: "feishu_im_get_messages",
        label: "飞书 - 获取历史消息",
        description: "获取指定群聊的历史消息列表。可指定时间范围和排序方式。返回消息内容、发送者、时间等信息。",
        parameters: GetMessagesSchema,
        async execute(_toolCallId, params) {
            const { container_id, start_time, end_time, page_size, page_token, sort_type } = params;
            try {
                return json(await listMessages(getClient(), container_id, start_time, end_time, page_size, page_token, sort_type));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_get_messages" });
    registered.push("feishu_im_get_messages");
    // Tool 7: feishu_im_create_chat
    api.registerTool({
        name: "feishu_im_create_chat",
        label: "飞书 - 创建群聊",
        description: "创建一个新的群聊，可指定群名称、描述和初始成员。",
        parameters: CreateChatSchema,
        async execute(_toolCallId, params) {
            const { name, description, user_ids, chat_mode } = params;
            try {
                return json(await createChat(getClient(), name, description, user_ids, chat_mode));
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_im_create_chat" });
    registered.push("feishu_im_create_chat");
    if (registered.length > 0) {
        api.logger.info?.(`feishu_im: Registered ${registered.join(", ")}`);
    }
}
//# sourceMappingURL=im.js.map