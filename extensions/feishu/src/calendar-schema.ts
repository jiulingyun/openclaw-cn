import { Type } from "@sinclair/typebox";
import { optionalStringEnum, stringEnum } from "openclaw/plugin-sdk";

// ============ Calendar Tool Schema ============

const CALENDAR_ACTIONS = [
  "primary",
  "create_event",
  "get_event",
  "update_event",
  "delete_event",
  "list_events",
  "add_attendees",
  "freebusy",
] as const;

const ATTENDEE_TYPES = ["user", "chat", "resource"] as const;

export const FeishuCalendarSchema = Type.Object({
  action: stringEnum(CALENDAR_ACTIONS, { description: "操作类型" }),
  // --- create_event / get_event / update_event / delete_event / list_events / add_attendees ---
  calendar_id: Type.Optional(
    Type.String({
      description:
        "[create_event/get_event/update_event/delete_event/list_events/add_attendees] 日历 ID。使用 primary action 获取主日历 ID",
    }),
  ),
  // --- create_event / update_event ---
  summary: Type.Optional(Type.String({ description: "[create_event/update_event] 日程标题" })),
  description: Type.Optional(Type.String({ description: "[create_event/update_event] 日程描述" })),
  start_time: Type.Optional(
    Type.String({
      description:
        "[create_event/update_event/list_events/freebusy] 开始时间 (ISO 8601 或 Unix 秒级时间戳)",
    }),
  ),
  end_time: Type.Optional(
    Type.String({
      description:
        "[create_event/update_event/list_events/freebusy] 结束时间 (ISO 8601 或 Unix 秒级时间戳)",
    }),
  ),
  location: Type.Optional(Type.String({ description: "[create_event/update_event] 地点" })),
  // --- get_event / update_event / delete_event / add_attendees ---
  event_id: Type.Optional(
    Type.String({ description: "[get_event/update_event/delete_event/add_attendees] 日程 ID" }),
  ),
  // --- create_event / add_attendees ---
  attendees: Type.Optional(
    Type.Array(
      Type.Object({
        type: optionalStringEnum(ATTENDEE_TYPES, {
          description: "参与人类型: user(用户), chat(群聊), resource(会议室)。默认 user",
        }),
        id: Type.String({ description: "参与人 ID (open_id/chat_id/resource_id)" }),
      }),
      { description: "[create_event/add_attendees] 参与人列表" },
    ),
  ),
  // --- freebusy ---
  user_ids: Type.Optional(
    Type.Array(Type.String(), {
      description: "[freebusy] 要查询忙闲的用户 open_id 列表",
    }),
  ),
  // --- list_events ---
  page_size: Type.Optional(
    Type.Number({
      description: "[list_events] 每页数量 (1-500, 默认 50)",
      minimum: 1,
      maximum: 500,
    }),
  ),
  page_token: Type.Optional(Type.String({ description: "[list_events] 分页标记" })),
});
