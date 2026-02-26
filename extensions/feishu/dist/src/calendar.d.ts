import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createFeishuClient } from "./client.js";
/** Get the primary calendar */
export declare function getPrimaryCalendar(client: ReturnType<typeof createFeishuClient>): Promise<{
    calendar_id: any;
    summary: any;
    type: any;
}>;
/** Create a calendar event */
export declare function createCalendarEvent(client: ReturnType<typeof createFeishuClient>, calendarId: string, summary: string, startTime: string, endTime: string, description?: string, attendees?: Array<{
    type?: string;
    id: string;
}>, location?: string): Promise<{
    event: {
        event_id: string;
        organizer_calendar_id?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        start_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        end_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        vchat?: {
            vc_type?: "unknown" | "third_party" | "vc" | "no_meeting" | "lark_live" | "third_party_meeting" | undefined;
            icon_type?: "default" | "vc" | "live" | undefined;
            description?: string | undefined;
            meeting_url?: string | undefined;
            live_link?: string | undefined;
            vc_info?: {
                unique_id: string;
                meeting_no: string;
            } | undefined;
            meeting_settings?: {
                owner_id?: string | undefined;
                join_meeting_permission?: "anyone_can_join" | "only_organization_employees" | "only_event_attendees" | undefined;
                password?: string | undefined;
                assign_hosts?: string[] | undefined;
                auto_record?: boolean | undefined;
                open_lobby?: boolean | undefined;
                allow_attendees_start?: boolean | undefined;
            } | undefined;
            third_party_meeting_settings?: {
                meeting_type?: string | undefined;
                meeting_id?: string | undefined;
                meeting_no?: string | undefined;
                password?: string | undefined;
                meeting_descriptions?: {
                    lang?: string | undefined;
                    description?: string | undefined;
                }[] | undefined;
            } | undefined;
        } | undefined;
        visibility?: "default" | "private" | "public" | undefined;
        attendee_ability?: "none" | "can_see_others" | "can_invite_others" | "can_modify_event" | undefined;
        free_busy_status?: "free" | "busy" | undefined;
        location?: {
            name?: string | undefined;
            address?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        } | undefined;
        color?: number | undefined;
        reminders?: {
            minutes?: number | undefined;
        }[] | undefined;
        recurrence?: string | undefined;
        status?: "tentative" | "confirmed" | "cancelled" | undefined;
        is_exception?: boolean | undefined;
        recurring_event_id?: string | undefined;
        create_time?: string | undefined;
        schemas?: {
            ui_name?: string | undefined;
            ui_status?: "unknown" | "hide" | "readonly" | "editable" | undefined;
            app_link?: string | undefined;
        }[] | undefined;
        event_organizer?: {
            user_id?: string | undefined;
            display_name?: string | undefined;
        } | undefined;
        app_link?: string | undefined;
        attachments?: {
            file_token?: string | undefined;
            file_size?: string | undefined;
            is_deleted?: boolean | undefined;
            name?: string | undefined;
        }[] | undefined;
        event_check_in?: {
            enable_check_in: boolean;
            check_in_start_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            check_in_end_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            need_notify_attendees?: boolean | undefined;
        } | undefined;
        source?: string | undefined;
    };
}>;
/** Get a calendar event */
export declare function getCalendarEvent(client: ReturnType<typeof createFeishuClient>, calendarId: string, eventId: string): Promise<{
    event: {
        event_id: string;
        organizer_calendar_id?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        start_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        end_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        vchat?: {
            vc_type?: "unknown" | "third_party" | "vc" | "no_meeting" | "lark_live" | "third_party_meeting" | undefined;
            icon_type?: "default" | "vc" | "live" | undefined;
            description?: string | undefined;
            meeting_url?: string | undefined;
            live_link?: string | undefined;
            vc_info?: {
                unique_id: string;
                meeting_no: string;
            } | undefined;
            meeting_settings?: {
                owner_id?: string | undefined;
                join_meeting_permission?: "anyone_can_join" | "only_organization_employees" | "only_event_attendees" | undefined;
                password?: string | undefined;
                assign_hosts?: string[] | undefined;
                auto_record?: boolean | undefined;
                open_lobby?: boolean | undefined;
                allow_attendees_start?: boolean | undefined;
            } | undefined;
            third_party_meeting_settings?: {
                meeting_type?: string | undefined;
                meeting_id?: string | undefined;
                meeting_no?: string | undefined;
                password?: string | undefined;
                meeting_descriptions?: {
                    lang?: string | undefined;
                    description?: string | undefined;
                }[] | undefined;
            } | undefined;
        } | undefined;
        visibility?: "default" | "private" | "public" | undefined;
        attendee_ability?: "none" | "can_see_others" | "can_invite_others" | "can_modify_event" | undefined;
        free_busy_status?: "free" | "busy" | undefined;
        location?: {
            name?: string | undefined;
            address?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        } | undefined;
        color?: number | undefined;
        reminders?: {
            minutes?: number | undefined;
        }[] | undefined;
        recurrence?: string | undefined;
        status?: "tentative" | "confirmed" | "cancelled" | undefined;
        is_exception?: boolean | undefined;
        recurring_event_id?: string | undefined;
        create_time?: string | undefined;
        schemas?: {
            ui_name?: string | undefined;
            ui_status?: "unknown" | "hide" | "readonly" | "editable" | undefined;
            app_link?: string | undefined;
        }[] | undefined;
        event_organizer?: {
            user_id?: string | undefined;
            display_name?: string | undefined;
        } | undefined;
        app_link?: string | undefined;
        attendees?: {
            type?: "user" | "chat" | "resource" | "third_party" | undefined;
            attendee_id?: string | undefined;
            rsvp_status?: "accept" | "decline" | "tentative" | "needs_action" | "removed" | undefined;
            is_optional?: boolean | undefined;
            is_organizer?: boolean | undefined;
            is_external?: boolean | undefined;
            display_name?: string | undefined;
            chat_members?: {
                rsvp_status?: "accept" | "decline" | "tentative" | "needs_action" | "removed" | undefined;
                is_optional?: boolean | undefined;
                display_name?: string | undefined;
                is_organizer?: boolean | undefined;
                is_external?: boolean | undefined;
            }[] | undefined;
            user_id?: string | undefined;
            chat_id?: string | undefined;
            room_id?: string | undefined;
            third_party_email?: string | undefined;
            operate_id?: string | undefined;
        }[] | undefined;
        has_more_attendee?: boolean | undefined;
        attachments?: {
            file_token?: string | undefined;
            file_size?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        event_check_in?: {
            enable_check_in: boolean;
            check_in_start_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            check_in_end_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            need_notify_attendees?: boolean | undefined;
        } | undefined;
        source?: string | undefined;
    };
}>;
/** Update a calendar event */
export declare function updateCalendarEvent(client: ReturnType<typeof createFeishuClient>, calendarId: string, eventId: string, updates: {
    summary?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
}): Promise<{
    event: {
        event_id: string;
        organizer_calendar_id?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        start_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        end_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        vchat?: {
            vc_type?: "unknown" | "third_party" | "vc" | "no_meeting" | "lark_live" | "third_party_meeting" | undefined;
            icon_type?: "default" | "vc" | "live" | undefined;
            description?: string | undefined;
            meeting_url?: string | undefined;
            live_link?: string | undefined;
            vc_info?: {
                unique_id: string;
                meeting_no: string;
            } | undefined;
            meeting_settings?: {
                owner_id?: string | undefined;
                join_meeting_permission?: "anyone_can_join" | "only_organization_employees" | "only_event_attendees" | undefined;
                password?: string | undefined;
                assign_hosts?: string[] | undefined;
                auto_record?: boolean | undefined;
                open_lobby?: boolean | undefined;
                allow_attendees_start?: boolean | undefined;
            } | undefined;
            third_party_meeting_settings?: {
                meeting_type?: string | undefined;
                meeting_id?: string | undefined;
                meeting_no?: string | undefined;
                password?: string | undefined;
                meeting_descriptions?: {
                    lang?: string | undefined;
                    description?: string | undefined;
                }[] | undefined;
            } | undefined;
        } | undefined;
        visibility?: "default" | "private" | "public" | undefined;
        attendee_ability?: "none" | "can_see_others" | "can_invite_others" | "can_modify_event" | undefined;
        free_busy_status?: "free" | "busy" | undefined;
        location?: {
            name?: string | undefined;
            address?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        } | undefined;
        color?: number | undefined;
        reminders?: {
            minutes?: number | undefined;
        }[] | undefined;
        recurrence?: string | undefined;
        status?: "tentative" | "confirmed" | "cancelled" | undefined;
        is_exception?: boolean | undefined;
        recurring_event_id?: string | undefined;
        create_time?: string | undefined;
        schemas?: {
            ui_name?: string | undefined;
            ui_status?: "unknown" | "hide" | "readonly" | "editable" | undefined;
            app_link?: string | undefined;
        }[] | undefined;
        event_organizer?: {
            user_id?: string | undefined;
            display_name?: string | undefined;
        } | undefined;
        app_link?: string | undefined;
        attachments?: {
            file_token?: string | undefined;
            file_size?: string | undefined;
            is_deleted?: boolean | undefined;
            name?: string | undefined;
        }[] | undefined;
        event_check_in?: {
            enable_check_in: boolean;
            check_in_start_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            check_in_end_time?: {
                time_type: "before_event_start" | "after_event_start" | "after_event_end";
                duration: number;
            } | undefined;
            need_notify_attendees?: boolean | undefined;
        } | undefined;
        source?: string | undefined;
    };
}>;
/** Delete a calendar event */
export declare function deleteCalendarEvent(client: ReturnType<typeof createFeishuClient>, calendarId: string, eventId: string): Promise<{
    success: boolean;
}>;
/** List calendar events */
export declare function listCalendarEvents(client: ReturnType<typeof createFeishuClient>, calendarId: string, startTime?: string, endTime?: string, pageSize?: number, pageToken?: string): Promise<{
    events: {
        event_id: string;
        organizer_calendar_id?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        start_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        end_time: {
            date?: string;
            timestamp?: string;
            timezone?: string;
        };
        vchat?: {
            vc_type?: "unknown" | "third_party" | "vc" | "no_meeting" | "lark_live" | "third_party_meeting" | undefined;
            icon_type?: "default" | "vc" | "live" | undefined;
            description?: string | undefined;
            meeting_url?: string | undefined;
            live_link?: string | undefined;
            vc_info?: {
                unique_id: string;
                meeting_no: string;
            } | undefined;
        } | undefined;
        visibility?: "default" | "private" | "public" | undefined;
        attendee_ability?: "none" | "can_see_others" | "can_invite_others" | "can_modify_event" | undefined;
        free_busy_status?: "free" | "busy" | undefined;
        location?: {
            name?: string | undefined;
            address?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
        } | undefined;
        color?: number | undefined;
        reminders?: {
            minutes?: number | undefined;
        }[] | undefined;
        recurrence?: string | undefined;
        status?: "tentative" | "confirmed" | "cancelled" | undefined;
        is_exception?: boolean | undefined;
        recurring_event_id?: string | undefined;
        create_time?: string | undefined;
        schemas?: {
            ui_name?: string | undefined;
            ui_status?: "unknown" | "hide" | "readonly" | "editable" | undefined;
            app_link?: string | undefined;
        }[] | undefined;
        event_organizer?: {
            user_id?: string | undefined;
            display_name?: string | undefined;
        } | undefined;
        app_link?: string | undefined;
        attachments?: {
            file_token?: string | undefined;
            file_size?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        source?: string | undefined;
    }[];
    has_more: boolean;
    page_token: string;
}>;
/** Add attendees to an event */
export declare function addEventAttendees(client: ReturnType<typeof createFeishuClient>, calendarId: string, eventId: string, attendees: Array<{
    type?: string;
    id: string;
}>): Promise<{
    attendees: {
        type?: "user" | "chat" | "resource" | "third_party" | undefined;
        attendee_id?: string | undefined;
        rsvp_status?: "accept" | "decline" | "tentative" | "needs_action" | "removed" | undefined;
        is_optional?: boolean | undefined;
        is_organizer?: boolean | undefined;
        is_external?: boolean | undefined;
        display_name?: string | undefined;
        chat_members?: {
            rsvp_status?: "accept" | "decline" | "tentative" | "needs_action" | "removed" | undefined;
            is_optional?: boolean | undefined;
            display_name?: string | undefined;
            is_organizer?: boolean | undefined;
            is_external?: boolean | undefined;
        }[] | undefined;
        user_id?: string | undefined;
        chat_id?: string | undefined;
        room_id?: string | undefined;
        third_party_email?: string | undefined;
        operate_id?: string | undefined;
        resource_customization?: {
            index_key: string;
            input_content?: string | undefined;
            options?: {
                option_key?: string | undefined;
                others_content?: string | undefined;
            }[] | undefined;
        }[] | undefined;
        approval_reason?: string | undefined;
    }[];
}>;
/** Query free/busy status */
export declare function queryFreebusy(client: ReturnType<typeof createFeishuClient>, timeMin: string, timeMax: string, userIds: string[]): Promise<{
    freebusy_list: {
        start_time: string;
        end_time: string;
    }[];
}>;
export declare function registerFeishuCalendarTools(api: OpenClawPluginApi): void;
//# sourceMappingURL=calendar.d.ts.map