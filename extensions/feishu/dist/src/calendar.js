import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { resolveToolsConfig } from "./tools-config.js";
import { FeishuCalendarSchema } from "./calendar-schema.js";
// ============ Helpers ============
function json(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        details: data,
    };
}
function formatError(err) {
    console.error("[FeishuError:Raw]", err);
    // 尝试提取飞书 SDK 错误信息（有时作为数组返回）
    if (Array.isArray(err)) {
        // oxlint-disable-next-line typescript/no-explicit-any
        const feishuErr = err.find((e) => e?.code && e?.msg);
        if (feishuErr) {
            return `Feishu Error ${feishuErr.code}: ${feishuErr.msg}`;
        }
    }
    if (err instanceof Error)
        return err.message;
    if (typeof err === "string")
        return err;
    try {
        return JSON.stringify(err);
    }
    catch {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return String(err);
    }
}
/** Parse date string to Unix timestamp string (seconds) */
function toTimestamp(dateStr) {
    if (/^\d{10,13}$/.test(dateStr)) {
        return dateStr.length === 13 ? String(Math.floor(Number(dateStr) / 1000)) : dateStr;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    return String(Math.floor(d.getTime() / 1000));
}
// ============ Core Functions ============
/** Get the primary calendar */
export async function getPrimaryCalendar(client) {
    const res = await client.calendar.v4.calendar.primary({
    // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    const cal = res.data?.calendars?.[0] ?? res.data;
    return {
        calendar_id: cal?.calendar?.calendar_id ?? cal?.calendar_id,
        summary: cal?.calendar?.summary ?? cal?.summary,
        type: cal?.calendar?.type ?? cal?.type,
    };
}
/** Create a calendar event */
export async function createCalendarEvent(client, calendarId, summary, startTime, endTime, description, attendees, location) {
    const data = {
        summary,
        start_time: { timestamp: toTimestamp(startTime) },
        end_time: { timestamp: toTimestamp(endTime) },
        ...(description && { description }),
        ...(location && { location: { name: location } }),
    };
    const res = await client.calendar.v4.calendarEvent.create({
        path: { calendar_id: calendarId },
        data,
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    const event = res.data?.event;
    // Add attendees if provided
    if (attendees && attendees.length > 0 && event?.event_id) {
        await addEventAttendees(client, calendarId, event.event_id, attendees);
    }
    return { event };
}
/** Get a calendar event */
export async function getCalendarEvent(client, calendarId, eventId) {
    const res = await client.calendar.v4.calendarEvent.get({
        path: { calendar_id: calendarId, event_id: eventId },
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return { event: res.data?.event };
}
/** Update a calendar event */
export async function updateCalendarEvent(client, calendarId, eventId, updates) {
    const data = {};
    if (updates.summary)
        data.summary = updates.summary;
    if (updates.description !== undefined)
        data.description = updates.description;
    if (updates.startTime)
        data.start_time = { timestamp: toTimestamp(updates.startTime) };
    if (updates.endTime)
        data.end_time = { timestamp: toTimestamp(updates.endTime) };
    if (updates.location)
        data.location = { name: updates.location };
    const res = await client.calendar.v4.calendarEvent.patch({
        path: { calendar_id: calendarId, event_id: eventId },
        data,
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return { event: res.data?.event };
}
/** Delete a calendar event */
export async function deleteCalendarEvent(client, calendarId, eventId) {
    const res = await client.calendar.v4.calendarEvent.delete({
        path: { calendar_id: calendarId, event_id: eventId },
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return { success: true };
}
/** List calendar events */
export async function listCalendarEvents(client, calendarId, startTime, endTime, pageSize, pageToken) {
    const res = await client.calendar.v4.calendarEvent.list({
        path: { calendar_id: calendarId },
        params: {
            ...(startTime && { start_time: toTimestamp(startTime) }),
            ...(endTime && { end_time: toTimestamp(endTime) }),
            ...(pageSize && { page_size: pageSize }),
            ...(pageToken && { page_token: pageToken }),
        },
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        events: res.data?.items ?? [],
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
    };
}
/** Add attendees to an event */
export async function addEventAttendees(client, calendarId, eventId, attendees) {
    const attendeeList = attendees.map((a) => {
        const type = a.type || "user";
        if (type === "user")
            return { type: "user", user_id: a.id };
        if (type === "chat")
            return { type: "chat", chat_id: a.id };
        return { type: "resource", room_id: a.id };
    });
    const res = await client.calendar.v4.calendarEventAttendee.create({
        path: { calendar_id: calendarId, event_id: eventId },
        data: { attendees: attendeeList },
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return { attendees: res.data?.attendees ?? [] };
}
/** Query free/busy status */
export async function queryFreebusy(client, timeMin, timeMax, userIds) {
    const res = await client.calendar.v4.freebusy.list({
        data: {
            time_min: toTimestamp(timeMin),
            time_max: toTimestamp(timeMax),
            user_id: { user_ids: userIds, id_type: "open_id" },
        },
        // oxlint-disable-next-line typescript/no-explicit-any
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        freebusy_list: res.data?.freebusy_list ?? [],
    };
}
// ============ Tool Registration ============
export function registerFeishuCalendarTools(api) {
    // Lazy resolve client to allow config loading after registration
    const getClient = () => {
        if (!api.config)
            throw new Error("No configuration available");
        const accounts = listEnabledFeishuAccounts(api.config);
        if (accounts.length === 0)
            throw new Error("No Feishu accounts configured");
        const account = accounts[0];
        const toolsCfg = resolveToolsConfig(account.config.tools);
        if (!toolsCfg.calendar)
            throw new Error("Calendar tools are disabled in configuration");
        return createFeishuClient(account);
    };
    api.registerTool({
        name: "feishu_calendar",
        label: "飞书 - 日历管理",
        description: `飞书日历管理工具。支持以下操作:
- primary: 获取主日历 ID（使用其他操作前先调用此操作获取 calendar_id）
- create_event: 创建日程（可设置标题、时间、描述、地点、参与人）
- get_event: 获取日程详情
- update_event: 更新日程
- delete_event: 删除日程
- list_events: 列出日程（可按时间范围筛选）
- add_attendees: 添加参与人（用户/群聊/会议室）
- freebusy: 查询用户忙闲状态`,
        parameters: FeishuCalendarSchema,
        async execute(_toolCallId, params) {
            console.log("[FeishuTool:execute] Params:", JSON.stringify(params));
            try {
                const client = getClient();
                const p = params;
                const action = p.action;
                switch (action) {
                    case "primary":
                        return json(await getPrimaryCalendar(client));
                    case "create_event":
                        return json(await createCalendarEvent(client, p.calendar_id, p.summary, p.start_time, p.end_time, p.description, p.attendees, p.location));
                    case "get_event":
                        return json(await getCalendarEvent(client, p.calendar_id, p.event_id));
                    case "update_event":
                        return json(await updateCalendarEvent(client, p.calendar_id, p.event_id, {
                            summary: p.summary,
                            description: p.description,
                            startTime: p.start_time,
                            endTime: p.end_time,
                            location: p.location,
                        }));
                    case "delete_event":
                        return json(await deleteCalendarEvent(client, p.calendar_id, p.event_id));
                    case "list_events":
                        return json(await listCalendarEvents(client, p.calendar_id, p.start_time, p.end_time, p.page_size, p.page_token));
                    case "add_attendees":
                        return json(await addEventAttendees(client, p.calendar_id, p.event_id, p.attendees));
                    case "freebusy":
                        return json(await queryFreebusy(client, p.start_time, p.end_time, p.user_ids));
                    default:
                        return json({ error: `Unknown action: ${action}` });
                }
            }
            catch (err) {
                console.error("[FeishuTool:execute] Error:", err);
                return json({ error: formatError(err) });
            }
        },
    }, { name: "feishu_calendar" });
    api.logger.info?.("feishu_calendar: Registered feishu_calendar tool (8 actions)");
}
//# sourceMappingURL=calendar.js.map