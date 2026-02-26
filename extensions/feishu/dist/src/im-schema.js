import { Type } from "@sinclair/typebox";
import { optionalStringEnum, stringEnum } from "openclaw/plugin-sdk";
// ============ IM Tool Schemas ============
const RECEIVE_ID_TYPES = ["chat_id", "open_id", "user_id", "union_id", "email"];
const MSG_TYPES = ["text", "post", "interactive"];
const SORT_TYPES = ["ByCreateTimeAsc", "ByCreateTimeDesc"];
const CHAT_MODES = ["group", "topic"];
export const ListChatsSchema = Type.Object({
    page_size: Type.Optional(Type.Number({
        description: "每页数量 (1-100, 默认 20)",
        minimum: 1,
        maximum: 100,
    })),
    page_token: Type.Optional(Type.String({ description: "分页标记，首次请求不填" })),
});
export const GetChatSchema = Type.Object({
    chat_id: Type.String({ description: "群聊 ID (oc_xxxx)" }),
});
export const ListMembersSchema = Type.Object({
    chat_id: Type.String({ description: "群聊 ID (oc_xxxx)" }),
    page_size: Type.Optional(Type.Number({
        description: "每页数量 (1-100, 默认 20)",
        minimum: 1,
        maximum: 100,
    })),
    page_token: Type.Optional(Type.String({ description: "分页标记，首次请求不填" })),
});
export const SendMessageSchema = Type.Object({
    receive_id: Type.String({
        description: "接收方 ID，可以是 chat_id (oc_xxx)、open_id (ou_xxx) 或 user_id",
    }),
    receive_id_type: optionalStringEnum(RECEIVE_ID_TYPES, {
        description: "接收方 ID 类型，默认自动识别 (oc_ 开头为 chat_id，ou_ 开头为 open_id)",
    }),
    msg_type: stringEnum(MSG_TYPES, {
        description: "消息类型: text(纯文本), post(富文本), interactive(卡片)",
    }),
    content: Type.String({
        description: '消息内容。text 类型: JSON 字符串 {"text":"hello"}; post 类型: 富文本 JSON; interactive 类型: 卡片 JSON。发送 @mention 请使用 <at user_id="ou_xxx">名字</at> 语法。',
    }),
});
export const ReplyMessageSchema = Type.Object({
    message_id: Type.String({ description: "要回复的消息 ID (om_xxx)" }),
    msg_type: stringEnum(MSG_TYPES, {
        description: "消息类型: text(纯文本), post(富文本), interactive(卡片)",
    }),
    content: Type.String({ description: "消息内容 (格式同 send_message)" }),
});
export const GetMessagesSchema = Type.Object({
    container_id: Type.String({ description: "群聊 ID (oc_xxxx)" }),
    start_time: Type.Optional(Type.String({ description: "起始时间 (Unix 秒级时间戳)" })),
    end_time: Type.Optional(Type.String({ description: "结束时间 (Unix 秒级时间戳)" })),
    page_size: Type.Optional(Type.Number({
        description: "每页数量 (1-50, 默认 20)",
        minimum: 1,
        maximum: 50,
    })),
    page_token: Type.Optional(Type.String({ description: "分页标记，首次请求不填" })),
    sort_type: optionalStringEnum(SORT_TYPES, {
        description: "排序方式，默认 ByCreateTimeAsc",
    }),
});
export const CreateChatSchema = Type.Object({
    name: Type.String({ description: "群聊名称" }),
    description: Type.Optional(Type.String({ description: "群聊描述" })),
    user_ids: Type.Optional(Type.Array(Type.String(), {
        description: "初始成员 open_id 列表",
    })),
    chat_mode: optionalStringEnum(CHAT_MODES, {
        description: "群模式: group(普通群), topic(话题群)，默认 group",
    }),
});
//# sourceMappingURL=im-schema.js.map