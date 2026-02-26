import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createFeishuClient } from "./client.js";
/** Create a new task */
export declare function createTask(client: ReturnType<typeof createFeishuClient>, summary: string, description?: string, due?: string, members?: Array<{
    id: string;
    role?: string;
}>): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** Get task by GUID */
export declare function getTask(client: ReturnType<typeof createFeishuClient>, taskGuid: string): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** Update a task */
export declare function updateTask(client: ReturnType<typeof createFeishuClient>, taskGuid: string, updates: {
    summary?: string;
    description?: string;
    due?: string;
}): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** Complete a task */
export declare function completeTask(client: ReturnType<typeof createFeishuClient>, taskGuid: string): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** Add members to a task */
export declare function addTaskMembers(client: ReturnType<typeof createFeishuClient>, taskGuid: string, memberIds: string[], role?: string): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** Add a reminder to a task */
export declare function addTaskReminder(client: ReturnType<typeof createFeishuClient>, taskGuid: string, relativeFireMinutes: number): Promise<{
    task: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    };
}>;
/** List tasks */
export declare function listTasks(client: ReturnType<typeof createFeishuClient>, pageSize?: number, pageToken?: string): Promise<{
    tasks: {
        guid?: string | undefined;
        summary?: string | undefined;
        description?: string | undefined;
        due?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
        creator?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        } | undefined;
        members?: {
            id?: string | undefined;
            type?: string | undefined;
            role?: string | undefined;
            name?: string | undefined;
        }[] | undefined;
        completed_at?: string | undefined;
        attachments?: {
            guid?: string | undefined;
            file_token?: string | undefined;
            name?: string | undefined;
            size?: number | undefined;
            resource?: {
                type?: string | undefined;
                id?: string | undefined;
            } | undefined;
            uploader?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            } | undefined;
            is_cover?: boolean | undefined;
            uploaded_at?: string | undefined;
        }[] | undefined;
        origin?: {
            platform_i18n_name?: {
                en_us?: string | undefined;
                zh_cn?: string | undefined;
                zh_hk?: string | undefined;
                zh_tw?: string | undefined;
                ja_jp?: string | undefined;
                fr_fr?: string | undefined;
                it_it?: string | undefined;
                de_de?: string | undefined;
                ru_ru?: string | undefined;
                th_th?: string | undefined;
                es_es?: string | undefined;
                ko_kr?: string | undefined;
            } | undefined;
            href?: {
                url?: string | undefined;
                title?: string | undefined;
            } | undefined;
        } | undefined;
        extra?: string | undefined;
        tasklists?: {
            tasklist_guid?: string | undefined;
            section_guid?: string | undefined;
        }[] | undefined;
        repeat_rule?: string | undefined;
        parent_task_guid?: string | undefined;
        mode?: number | undefined;
        source?: number | undefined;
        custom_complete?: {
            pc?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            ios?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
            android?: {
                href?: string | undefined;
                tip?: {
                    en_us?: string | undefined;
                    zh_cn?: string | undefined;
                    zh_hk?: string | undefined;
                    zh_tw?: string | undefined;
                    ja_jp?: string | undefined;
                    fr_fr?: string | undefined;
                    it_it?: string | undefined;
                    de_de?: string | undefined;
                    ru_ru?: string | undefined;
                    th_th?: string | undefined;
                    es_es?: string | undefined;
                    ko_kr?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        task_id?: string | undefined;
        created_at?: string | undefined;
        updated_at?: string | undefined;
        status?: string | undefined;
        url?: string | undefined;
        start?: {
            timestamp?: string | undefined;
            is_all_day?: boolean | undefined;
        } | undefined;
        subtask_count?: number | undefined;
        is_milestone?: boolean | undefined;
        custom_fields?: {
            guid?: string | undefined;
            type?: string | undefined;
            number_value?: string | undefined;
            datetime_value?: string | undefined;
            member_value?: {
                id?: string | undefined;
                type?: string | undefined;
                role?: string | undefined;
                name?: string | undefined;
            }[] | undefined;
            single_select_value?: string | undefined;
            multi_select_value?: string[] | undefined;
            name?: string | undefined;
            text_value?: string | undefined;
        }[] | undefined;
        dependencies?: {
            type: "prev" | "next";
            task_guid: string;
        }[] | undefined;
        assignee_related?: {
            id?: string | undefined;
            completed_at?: string | undefined;
        }[] | undefined;
        positive_reminders?: {
            id?: string | undefined;
            relative_fire_minute: number;
        }[] | undefined;
    }[];
    has_more: boolean;
    page_token: string;
}>;
/** Add a comment to a task */
export declare function addTaskComment(client: ReturnType<typeof createFeishuClient>, taskGuid: string, content: string): Promise<{
    comment: any;
}>;
export declare function registerFeishuTaskTools(api: OpenClawPluginApi): void;
//# sourceMappingURL=task.d.ts.map