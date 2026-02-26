import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createFeishuClient } from "./client.js";
export declare function registerFeishuBitableTools(api: OpenClawPluginApi): void;
/** Search records with filter conditions */
export declare function searchRecords(client: ReturnType<typeof createFeishuClient>, appToken: string, tableId: string, filter?: unknown, sort?: unknown, fieldNames?: string[], pageSize?: number, pageToken?: string): Promise<{
    records: {
        fields: Record<string, string | number | number | number | boolean | {
            text?: string;
            link?: string;
        } | {
            location?: string;
            pname?: string;
            cityname?: string;
            adname?: string;
            address?: string;
            name?: string;
            full_address?: string;
        } | Array<{
            id?: string;
            name?: string;
            avatar_url?: string;
        }> | Array<string> | Array<{
            id?: string;
            name?: string;
            en_name?: string;
            email?: string;
            avatar_url?: string;
        }> | Array<{
            file_token?: string;
            name?: string;
            type?: string;
            size?: number;
            url?: string;
            tmp_url?: string;
        }>>;
        record_id?: string | undefined;
        created_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        created_time?: number | undefined;
        last_modified_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        last_modified_time?: number | undefined;
        shared_url?: string | undefined;
        record_url?: string | undefined;
    }[];
    has_more: boolean;
    page_token: string;
    total: number;
}>;
/** Batch create records */
export declare function batchCreateRecords(client: ReturnType<typeof createFeishuClient>, appToken: string, tableId: string, records: Array<{
    fields: Record<string, unknown>;
}>): Promise<{
    records: {
        fields: Record<string, string | number | number | number | boolean | {
            text?: string;
            link?: string;
        } | {
            location?: string;
            pname?: string;
            cityname?: string;
            adname?: string;
            address?: string;
            name?: string;
            full_address?: string;
        } | Array<{
            id?: string;
            name?: string;
            avatar_url?: string;
        }> | Array<string> | Array<{
            id?: string;
            name?: string;
            en_name?: string;
            email?: string;
            avatar_url?: string;
        }> | Array<{
            file_token?: string;
            name?: string;
            type?: string;
            size?: number;
            url?: string;
            tmp_url?: string;
        }>>;
        record_id?: string | undefined;
        created_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        created_time?: number | undefined;
        last_modified_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        last_modified_time?: number | undefined;
        shared_url?: string | undefined;
        record_url?: string | undefined;
    }[];
    total: number;
}>;
/** Batch update records */
export declare function batchUpdateRecords(client: ReturnType<typeof createFeishuClient>, appToken: string, tableId: string, records: Array<{
    record_id: string;
    fields: Record<string, unknown>;
}>): Promise<{
    records: {
        fields: Record<string, string | number | number | number | boolean | {
            text?: string;
            link?: string;
        } | {
            location?: string;
            pname?: string;
            cityname?: string;
            adname?: string;
            address?: string;
            name?: string;
            full_address?: string;
        } | Array<{
            id?: string;
            name?: string;
            avatar_url?: string;
        }> | Array<string> | Array<{
            id?: string;
            name?: string;
            en_name?: string;
            email?: string;
            avatar_url?: string;
        }> | Array<{
            file_token?: string;
            name?: string;
            type?: string;
            size?: number;
            url?: string;
            tmp_url?: string;
        }>>;
        record_id?: string | undefined;
        created_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        created_time?: number | undefined;
        last_modified_by?: {
            id?: string | undefined;
            name?: string | undefined;
            en_name?: string | undefined;
            email?: string | undefined;
            avatar_url?: string | undefined;
        } | undefined;
        last_modified_time?: number | undefined;
        shared_url?: string | undefined;
        record_url?: string | undefined;
    }[];
    total: number;
}>;
/** List all tables in a Bitable app */
export declare function listBitableTables(client: ReturnType<typeof createFeishuClient>, appToken: string, pageSize?: number, pageToken?: string): Promise<{
    tables: {
        table_id: string;
        name: string;
        revision: number;
    }[];
    has_more: boolean;
    page_token: string;
    total: number;
}>;
/** Create a new table in a Bitable app */
export declare function createBitableTable(client: ReturnType<typeof createFeishuClient>, appToken: string, name: string, fields?: Array<{
    field_name: string;
    type: number;
}>): Promise<{
    table_id: string;
    name: string;
}>;
/** Create a new field in a Bitable table */
export declare function createBitableField(client: ReturnType<typeof createFeishuClient>, appToken: string, tableId: string, fieldName: string, type: number, property?: unknown): Promise<{
    field_id: string;
    field_name: string;
    type: number;
    type_name: string;
}>;
/** Create a new view for a Bitable table */
export declare function createBitableView(client: ReturnType<typeof createFeishuClient>, appToken: string, tableId: string, viewName: string, viewType?: string): Promise<{
    view_id: string;
    view_name: string;
    view_type: string;
}>;
/** List all dashboards in a Bitable app */
export declare function listBitableDashboards(client: ReturnType<typeof createFeishuClient>, appToken: string, pageSize?: number, pageToken?: string): Promise<{
    dashboards: any;
    has_more: any;
    page_token: any;
}>;
//# sourceMappingURL=bitable.d.ts.map