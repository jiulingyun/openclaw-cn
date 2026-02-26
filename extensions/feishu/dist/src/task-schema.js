import { Type } from "@sinclair/typebox";
import { optionalStringEnum, stringEnum } from "openclaw/plugin-sdk";
// ============ Task Tool Schema ============
const TASK_ACTIONS = [
    "create",
    "get",
    "update",
    "complete",
    "add_members",
    "add_reminder",
    "list",
    "add_comment",
];
const MEMBER_ROLES = ["assignee", "follower"];
export const FeishuTaskSchema = Type.Object({
    action: stringEnum(TASK_ACTIONS, { description: "操作类型" }),
    // --- create ---
    summary: Type.Optional(Type.String({ description: "[create/update] 任务标题" })),
    description: Type.Optional(Type.String({ description: "[create/update] 任务描述" })),
    due: Type.Optional(Type.String({
        description: "[create/update] 截止时间。格式: ISO 8601 (2025-03-01T10:00:00+08:00) 或 Unix 秒级时间戳",
    })),
    members: Type.Optional(Type.Array(Type.Object({
        id: Type.String({ description: "成员 open_id (ou_xxx)" }),
        role: optionalStringEnum(MEMBER_ROLES, {
            description: "角色: assignee(负责人) 或 follower(关注者)，默认 assignee",
        }),
    }), { description: "[create] 初始成员列表" })),
    // --- get / update / complete ---
    task_guid: Type.Optional(Type.String({
        description: "[get/update/complete/add_members/add_reminder/add_comment] 任务 GUID",
    })),
    // --- add_members ---
    member_ids: Type.Optional(Type.Array(Type.String(), {
        description: "[add_members] 要添加的成员 open_id 列表",
    })),
    role: optionalStringEnum(MEMBER_ROLES, {
        description: "[add_members] 角色: assignee(负责人) 或 follower(关注者)",
    }),
    // --- add_reminder ---
    relative_fire_minutes: Type.Optional(Type.Number({
        description: "[add_reminder] 提醒时间（相对于截止时间的分钟数，负数表示提前）。如 -30 表示截止前30分钟提醒",
    })),
    // --- list ---
    page_size: Type.Optional(Type.Number({ description: "[list] 每页数量 (1-100, 默认 50)", minimum: 1, maximum: 100 })),
    page_token: Type.Optional(Type.String({ description: "[list] 分页标记" })),
    // --- create: auto-assign sender ---
    sender_open_id: Type.Optional(Type.String({
        description: "[create] The open_id (ou_xxx) of the message sender. When provided, the sender will automatically be added as an assignee of the new task.",
    })),
    // --- add_comment ---
    content: Type.Optional(Type.String({ description: "[add_comment] 评论内容" })),
});
//# sourceMappingURL=task-schema.js.map