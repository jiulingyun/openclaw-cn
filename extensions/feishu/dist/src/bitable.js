import { Type } from "@sinclair/typebox";
import { createFeishuClient } from "./client.js";
// ============ Helpers ============
function json(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        details: data,
    };
}
/** Field type ID to human-readable name */
const FIELD_TYPE_NAMES = {
    1: "Text",
    2: "Number",
    3: "SingleSelect",
    4: "MultiSelect",
    5: "DateTime",
    7: "Checkbox",
    11: "User",
    13: "Phone",
    15: "URL",
    17: "Attachment",
    18: "SingleLink",
    19: "Lookup",
    20: "Formula",
    21: "DuplexLink",
    22: "Location",
    23: "GroupChat",
    1001: "CreatedTime",
    1002: "ModifiedTime",
    1003: "CreatedUser",
    1004: "ModifiedUser",
    1005: "AutoNumber",
};
// ============ Core Functions ============
/** Parse bitable URL and extract tokens */
function parseBitableUrl(url) {
    try {
        const u = new URL(url);
        const tableId = u.searchParams.get("table") ?? undefined;
        // Wiki format: /wiki/XXXXX?table=YYY
        const wikiMatch = u.pathname.match(/\/wiki\/([A-Za-z0-9]+)/);
        if (wikiMatch) {
            return { token: wikiMatch[1], tableId, isWiki: true };
        }
        // Base format: /base/XXXXX?table=YYY
        const baseMatch = u.pathname.match(/\/base\/([A-Za-z0-9]+)/);
        if (baseMatch) {
            return { token: baseMatch[1], tableId, isWiki: false };
        }
        return null;
    }
    catch {
        return null;
    }
}
/** Get app_token from wiki node_token */
async function getAppTokenFromWiki(client, nodeToken) {
    const res = await client.wiki.space.getNode({
        params: { token: nodeToken },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    const node = res.data?.node;
    if (!node) {
        throw new Error("Node not found");
    }
    if (node.obj_type !== "bitable") {
        throw new Error(`Node is not a bitable (type: ${node.obj_type})`);
    }
    return node.obj_token;
}
/** Get bitable metadata from URL (handles both /base/ and /wiki/ URLs) */
async function getBitableMeta(client, url) {
    const parsed = parseBitableUrl(url);
    if (!parsed) {
        throw new Error("Invalid URL format. Expected /base/XXX or /wiki/XXX URL");
    }
    let appToken;
    if (parsed.isWiki) {
        appToken = await getAppTokenFromWiki(client, parsed.token);
    }
    else {
        appToken = parsed.token;
    }
    // Get bitable app info
    const res = await client.bitable.app.get({
        path: { app_token: appToken },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    // List tables if no table_id specified
    let tables = [];
    if (!parsed.tableId) {
        const tablesRes = await client.bitable.appTable.list({
            path: { app_token: appToken },
        });
        if (tablesRes.code === 0) {
            tables = (tablesRes.data?.items ?? []).map((t) => ({
                table_id: t.table_id,
                name: t.name,
            }));
        }
    }
    return {
        app_token: appToken,
        table_id: parsed.tableId,
        name: res.data?.app?.name,
        url_type: parsed.isWiki ? "wiki" : "base",
        ...(tables.length > 0 && { tables }),
        hint: parsed.tableId
            ? `Use app_token="${appToken}" and table_id="${parsed.tableId}" for other bitable tools`
            : `Use app_token="${appToken}" for other bitable tools. Select a table_id from the tables list.`,
    };
}
async function listFields(client, appToken, tableId) {
    const res = await client.bitable.appTableField.list({
        path: { app_token: appToken, table_id: tableId },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    const fields = res.data?.items ?? [];
    return {
        fields: fields.map((f) => ({
            field_id: f.field_id,
            field_name: f.field_name,
            type: f.type,
            type_name: FIELD_TYPE_NAMES[f.type ?? 0] || `type_${f.type}`,
            is_primary: f.is_primary,
            ...(f.property && { property: f.property }),
        })),
        total: fields.length,
    };
}
async function listRecords(client, appToken, tableId, pageSize, pageToken) {
    const res = await client.bitable.appTableRecord.list({
        path: { app_token: appToken, table_id: tableId },
        params: {
            page_size: pageSize ?? 100,
            ...(pageToken && { page_token: pageToken }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        records: res.data?.items ?? [],
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
        total: res.data?.total,
    };
}
async function getRecord(client, appToken, tableId, recordId) {
    const res = await client.bitable.appTableRecord.get({
        path: { app_token: appToken, table_id: tableId, record_id: recordId },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        record: res.data?.record,
    };
}
async function createRecord(client, appToken, tableId, fields) {
    const res = await client.bitable.appTableRecord.create({
        path: { app_token: appToken, table_id: tableId },
        // oxlint-disable-next-line typescript/no-explicit-any
        data: { fields: fields },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        record: res.data?.record,
    };
}
async function updateRecord(client, appToken, tableId, recordId, fields) {
    const res = await client.bitable.appTableRecord.update({
        path: { app_token: appToken, table_id: tableId, record_id: recordId },
        // oxlint-disable-next-line typescript/no-explicit-any
        data: { fields: fields },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        record: res.data?.record,
    };
}
// ============ Schemas ============
const GetMetaSchema = Type.Object({
    url: Type.String({
        description: "Bitable URL. Supports both formats: /base/XXX?table=YYY or /wiki/XXX?table=YYY",
    }),
});
const ListFieldsSchema = Type.Object({
    app_token: Type.String({
        description: "Bitable app token (use feishu_bitable_get_meta to get from URL)",
    }),
    table_id: Type.String({ description: "Table ID (from URL: ?table=YYY)" }),
});
const ListRecordsSchema = Type.Object({
    app_token: Type.String({
        description: "Bitable app token (use feishu_bitable_get_meta to get from URL)",
    }),
    table_id: Type.String({ description: "Table ID (from URL: ?table=YYY)" }),
    page_size: Type.Optional(Type.Number({
        description: "Number of records per page (1-500, default 100)",
        minimum: 1,
        maximum: 500,
    })),
    page_token: Type.Optional(Type.String({ description: "Pagination token from previous response" })),
});
const GetRecordSchema = Type.Object({
    app_token: Type.String({
        description: "Bitable app token (use feishu_bitable_get_meta to get from URL)",
    }),
    table_id: Type.String({ description: "Table ID (from URL: ?table=YYY)" }),
    record_id: Type.String({ description: "Record ID to retrieve" }),
});
const CreateRecordSchema = Type.Object({
    app_token: Type.String({
        description: "Bitable app token (use feishu_bitable_get_meta to get from URL)",
    }),
    table_id: Type.String({ description: "Table ID (from URL: ?table=YYY)" }),
    fields: Type.Record(Type.String(), Type.Any(), {
        description: "Field values keyed by field name. Format by type: Text='string', Number=123, SingleSelect='Option', MultiSelect=['A','B'], DateTime=timestamp_ms, User=[{id:'ou_xxx'}], URL={text:'Display',link:'https://...'}",
    }),
});
const UpdateRecordSchema = Type.Object({
    app_token: Type.String({
        description: "Bitable app token (use feishu_bitable_get_meta to get from URL)",
    }),
    table_id: Type.String({ description: "Table ID (from URL: ?table=YYY)" }),
    record_id: Type.String({ description: "Record ID to update" }),
    fields: Type.Record(Type.String(), Type.Any(), {
        description: "Field values to update (same format as create_record)",
    }),
});
// ============ Tool Registration ============
export function registerFeishuBitableTools(api) {
    const feishuCfg = api.config?.channels?.feishu;
    if (!feishuCfg?.appId || !feishuCfg?.appSecret) {
        api.logger.debug?.("feishu_bitable: Feishu credentials not configured, skipping bitable tools");
        return;
    }
    const getClient = () => createFeishuClient(feishuCfg);
    // Tool 0: feishu_bitable_get_meta (helper to parse URLs)
    api.registerTool({
        name: "feishu_bitable_get_meta",
        label: "Feishu Bitable Get Meta",
        description: "Parse a Bitable URL and get app_token, table_id, and table list. Use this first when given a /wiki/ or /base/ URL.",
        parameters: GetMetaSchema,
        async execute(_toolCallId, params) {
            const { url } = params;
            try {
                const result = await getBitableMeta(getClient(), url);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_get_meta" });
    // Tool 1: feishu_bitable_list_fields
    api.registerTool({
        name: "feishu_bitable_list_fields",
        label: "Feishu Bitable List Fields",
        description: "List all fields (columns) in a Bitable table with their types and properties",
        parameters: ListFieldsSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id } = params;
            try {
                const result = await listFields(getClient(), app_token, table_id);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_list_fields" });
    // Tool 2: feishu_bitable_list_records
    api.registerTool({
        name: "feishu_bitable_list_records",
        label: "Feishu Bitable List Records",
        description: "List records (rows) from a Bitable table with pagination support",
        parameters: ListRecordsSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, page_size, page_token } = params;
            try {
                const result = await listRecords(getClient(), app_token, table_id, page_size, page_token);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_list_records" });
    // Tool 3: feishu_bitable_get_record
    api.registerTool({
        name: "feishu_bitable_get_record",
        label: "Feishu Bitable Get Record",
        description: "Get a single record by ID from a Bitable table",
        parameters: GetRecordSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, record_id } = params;
            try {
                const result = await getRecord(getClient(), app_token, table_id, record_id);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_get_record" });
    // Tool 4: feishu_bitable_create_record
    api.registerTool({
        name: "feishu_bitable_create_record",
        label: "Feishu Bitable Create Record",
        description: "Create a new record (row) in a Bitable table",
        parameters: CreateRecordSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, fields } = params;
            try {
                const result = await createRecord(getClient(), app_token, table_id, fields);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_create_record" });
    // Tool 5: feishu_bitable_update_record
    api.registerTool({
        name: "feishu_bitable_update_record",
        label: "Feishu Bitable Update Record",
        description: "Update an existing record (row) in a Bitable table",
        parameters: UpdateRecordSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, record_id, fields } = params;
            try {
                const result = await updateRecord(getClient(), app_token, table_id, record_id, fields);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_update_record" });
    api.logger.info?.(`feishu_bitable: Registered 6 bitable tools (original)`);
    // ============ Enhanced Tools (Phase 1B) ============
    // Tool 6: feishu_bitable_search_records
    api.registerTool({
        name: "feishu_bitable_search_records",
        label: "Feishu Bitable Search Records",
        description: "Search/filter records in a Bitable table with conditions. Supports AND/OR filters, sorting, and field selection.",
        parameters: SearchRecordsSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, filter, sort, field_names, page_size, page_token } = params;
            try {
                const result = await searchRecords(getClient(), app_token, table_id, filter, sort, field_names, page_size, page_token);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_search_records" });
    // Tool 7: feishu_bitable_batch_create
    api.registerTool({
        name: "feishu_bitable_batch_create",
        label: "Feishu Bitable Batch Create Records",
        description: "Create multiple records (rows) in a Bitable table at once",
        parameters: BatchCreateRecordsSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, records } = params;
            try {
                const result = await batchCreateRecords(getClient(), app_token, table_id, records);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_batch_create" });
    // Tool 8: feishu_bitable_batch_update
    api.registerTool({
        name: "feishu_bitable_batch_update",
        label: "Feishu Bitable Batch Update Records",
        description: "Update multiple records (rows) in a Bitable table at once",
        parameters: BatchUpdateRecordsSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, records } = params;
            try {
                const result = await batchUpdateRecords(getClient(), app_token, table_id, records);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_batch_update" });
    // Tool 9: feishu_bitable_list_tables
    api.registerTool({
        name: "feishu_bitable_list_tables",
        label: "Feishu Bitable List Tables",
        description: "List all tables in a Bitable app",
        parameters: ListTablesSchema,
        async execute(_toolCallId, params) {
            const { app_token, page_size, page_token } = params;
            try {
                const result = await listBitableTables(getClient(), app_token, page_size, page_token);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_list_tables" });
    // Tool 10: feishu_bitable_create_table
    api.registerTool({
        name: "feishu_bitable_create_table",
        label: "Feishu Bitable Create Table",
        description: "Create a new table in a Bitable app",
        parameters: CreateTableSchema,
        async execute(_toolCallId, params) {
            const { app_token, name, fields: fieldDefs, } = params;
            try {
                const result = await createBitableTable(getClient(), app_token, name, fieldDefs);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_create_table" });
    // Tool 11: feishu_bitable_create_field
    api.registerTool({
        name: "feishu_bitable_create_field",
        label: "Feishu Bitable Create Field",
        description: "Create a new field (column) in a Bitable table. Common types: 1=Text, 2=Number, 3=SingleSelect, 4=MultiSelect, 5=DateTime, 7=Checkbox, 11=User, 15=URL",
        parameters: CreateFieldSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, field_name, type, property } = params;
            try {
                const result = await createBitableField(getClient(), app_token, table_id, field_name, type, property);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_create_field" });
    // Tool 12: feishu_bitable_create_view
    api.registerTool({
        name: "feishu_bitable_create_view",
        label: "Feishu Bitable Create View",
        description: "Create a new view for a Bitable table. View types: grid(table), kanban, gallery, form, gantt",
        parameters: CreateViewSchema,
        async execute(_toolCallId, params) {
            const { app_token, table_id, view_name, view_type } = params;
            try {
                const result = await createBitableView(getClient(), app_token, table_id, view_name, view_type);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_create_view" });
    // Tool 13: feishu_bitable_list_dashboards
    api.registerTool({
        name: "feishu_bitable_list_dashboards",
        label: "Feishu Bitable List Dashboards",
        description: "List all dashboards in a Bitable app",
        parameters: ListDashboardsSchema,
        async execute(_toolCallId, params) {
            const { app_token, page_size, page_token } = params;
            try {
                const result = await listBitableDashboards(getClient(), app_token, page_size, page_token);
                return json(result);
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_bitable_list_dashboards" });
    api.logger.info?.(`feishu_bitable: Registered 14 bitable tools total`);
}
// ============ Enhanced Core Functions (Phase 1B) ============
/** Search records with filter conditions */
export async function searchRecords(client, appToken, tableId, filter, sort, fieldNames, pageSize, pageToken) {
    const res = await client.bitable.appTableRecord.search({
        path: { app_token: appToken, table_id: tableId },
        data: {
            ...(filter && { filter }),
            ...(sort && { sort }),
            ...(fieldNames && { field_names: fieldNames }),
            ...(pageSize && { page_size: pageSize }),
            ...(pageToken && { page_token: pageToken }),
            // oxlint-disable-next-line typescript/no-explicit-any
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        records: res.data?.items ?? [],
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
        total: res.data?.total,
    };
}
/** Batch create records */
export async function batchCreateRecords(client, appToken, tableId, records) {
    const res = await client.bitable.appTableRecord.batchCreate({
        path: { app_token: appToken, table_id: tableId },
        // oxlint-disable-next-line typescript/no-explicit-any
        data: { records: records },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        records: res.data?.records ?? [],
        total: (res.data?.records ?? []).length,
    };
}
/** Batch update records */
export async function batchUpdateRecords(client, appToken, tableId, records) {
    const res = await client.bitable.appTableRecord.batchUpdate({
        path: { app_token: appToken, table_id: tableId },
        // oxlint-disable-next-line typescript/no-explicit-any
        data: { records: records },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        records: res.data?.records ?? [],
        total: (res.data?.records ?? []).length,
    };
}
/** List all tables in a Bitable app */
export async function listBitableTables(client, appToken, pageSize, pageToken) {
    const res = await client.bitable.appTable.list({
        path: { app_token: appToken },
        params: {
            ...(pageSize && { page_size: pageSize }),
            ...(pageToken && { page_token: pageToken }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        tables: (res.data?.items ?? []).map((t) => ({
            table_id: t.table_id,
            name: t.name,
            revision: t.revision,
        })),
        has_more: res.data?.has_more ?? false,
        page_token: res.data?.page_token,
        total: res.data?.total,
    };
}
/** Create a new table in a Bitable app */
export async function createBitableTable(client, appToken, name, fields) {
    const table = {
        name,
        ...(fields &&
            fields.length > 0 && {
            fields: fields.map((f) => ({
                field_name: f.field_name,
                type: f.type,
            })),
        }),
    };
    const res = await client.bitable.appTable.create({
        path: { app_token: appToken },
        // oxlint-disable-next-line typescript/no-explicit-any
        data: { table },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        table_id: res.data?.table_id,
        name,
    };
}
/** Create a new field in a Bitable table */
export async function createBitableField(client, appToken, tableId, fieldName, type, property) {
    const res = await client.bitable.appTableField.create({
        path: { app_token: appToken, table_id: tableId },
        data: {
            field_name: fieldName,
            type,
            ...(property && { property }),
            // oxlint-disable-next-line typescript/no-explicit-any
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        field_id: res.data?.field?.field_id,
        field_name: res.data?.field?.field_name,
        type: res.data?.field?.type,
        type_name: FIELD_TYPE_NAMES[res.data?.field?.type ?? 0] || `type_${res.data?.field?.type}`,
    };
}
/** Create a new view for a Bitable table */
export async function createBitableView(client, appToken, tableId, viewName, viewType) {
    const res = await client.bitable.appTableView.create({
        path: { app_token: appToken, table_id: tableId },
        data: {
            view_name: viewName,
            view_type: (viewType || "grid"),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        view_id: res.data?.view?.view_id,
        view_name: res.data?.view?.view_name,
        view_type: res.data?.view?.view_type,
    };
}
/** List all dashboards in a Bitable app */
export async function listBitableDashboards(client, appToken, pageSize, pageToken) {
    const res = await client.bitable.appDashboard.list({
        path: { app_token: appToken },
        params: {
            ...(pageSize && { page_size: pageSize }),
            ...(pageToken && { page_token: pageToken }),
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    const data = res.data;
    return {
        dashboards: (data?.dashboards ?? data?.items ?? []).map((d) => ({
            dashboard_id: d.block_id,
            name: d.name,
        })),
        has_more: data?.has_more ?? false,
        page_token: data?.page_token,
    };
}
// ============ Enhanced Schemas (Phase 1B) ============
const SearchRecordsSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    table_id: Type.String({ description: "Table ID" }),
    filter: Type.Optional(Type.Any({
        description: 'Filter conditions. Example: {"conjunction":"and","conditions":[{"field_name":"Status","operator":"is","value":["Done"]}]}',
    })),
    sort: Type.Optional(Type.Any({
        description: 'Sort conditions. Example: [{"field_name":"Created","desc":true}]',
    })),
    field_names: Type.Optional(Type.Array(Type.String(), { description: "Specific field names to return (reduces data)" })),
    page_size: Type.Optional(Type.Number({ description: "Records per page (1-500, default 100)", minimum: 1, maximum: 500 })),
    page_token: Type.Optional(Type.String({ description: "Pagination token" })),
});
const BatchCreateRecordsSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    table_id: Type.String({ description: "Table ID" }),
    records: Type.Array(Type.Object({
        fields: Type.Record(Type.String(), Type.Any(), { description: "Field values" }),
    }), { description: "Array of records to create (max 500)" }),
});
const BatchUpdateRecordsSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    table_id: Type.String({ description: "Table ID" }),
    records: Type.Array(Type.Object({
        record_id: Type.String({ description: "Record ID to update" }),
        fields: Type.Record(Type.String(), Type.Any(), { description: "Field values to update" }),
    }), { description: "Array of records to update (max 500)" }),
});
const ListTablesSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    page_size: Type.Optional(Type.Number({ description: "Tables per page (default 20)", minimum: 1, maximum: 100 })),
    page_token: Type.Optional(Type.String({ description: "Pagination token" })),
});
const CreateTableSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    name: Type.String({ description: "Table name" }),
    fields: Type.Optional(Type.Array(Type.Object({
        field_name: Type.String({ description: "Field name" }),
        type: Type.Number({
            description: "Field type: 1=Text, 2=Number, 3=SingleSelect, 4=MultiSelect, 5=DateTime",
        }),
    }), { description: "Initial fields to create with the table" })),
});
const CreateFieldSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    table_id: Type.String({ description: "Table ID" }),
    field_name: Type.String({ description: "Field name" }),
    type: Type.Number({
        description: "Field type: 1=Text, 2=Number, 3=SingleSelect, 4=MultiSelect, 5=DateTime, 7=Checkbox, 11=User, 15=URL",
    }),
    property: Type.Optional(Type.Any({
        description: 'Field properties. E.g. for SingleSelect: {"options":[{"name":"Option A"}]}',
    })),
});
const CreateViewSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    table_id: Type.String({ description: "Table ID" }),
    view_name: Type.String({ description: "View name" }),
    view_type: Type.Optional(Type.String({ description: "View type: grid, kanban, gallery, form, gantt. Default: grid" })),
});
const ListDashboardsSchema = Type.Object({
    app_token: Type.String({ description: "Bitable app token" }),
    page_size: Type.Optional(Type.Number({ description: "Dashboards per page", minimum: 1, maximum: 100 })),
    page_token: Type.Optional(Type.String({ description: "Pagination token" })),
});
//# sourceMappingURL=bitable.js.map