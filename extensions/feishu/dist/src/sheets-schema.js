import { Type } from "@sinclair/typebox";
import { stringEnum } from "openclaw/plugin-sdk";
// ============ Sheets Tool Schema ============
const SHEETS_ACTIONS = [
    "get_meta",
    "read_range",
    "write_range",
    "append",
    "insert_rows",
    "add_sheet",
    "list_sheets",
];
export const FeishuSheetsSchema = Type.Object({
    action: stringEnum(SHEETS_ACTIONS, { description: "操作类型" }),
    // --- 共用 ---
    spreadsheet_token: Type.String({
        description: "电子表格 token (从 URL 或 Drive 获取)",
    }),
    // --- read_range / write_range / append ---
    range: Type.Optional(Type.String({
        description: "[read_range/write_range/append] 范围。格式: SheetId!A1:C10 或 SheetId!A:C。SheetId 可通过 list_sheets 获取",
    })),
    // --- write_range / append ---
    values: Type.Optional(Type.Array(Type.Array(Type.Any(), { description: "行数据" }), {
        description: "[write_range/append] 二维数组，每个子数组是一行",
    })),
    // --- insert_rows ---
    sheet_id: Type.Optional(Type.String({ description: "[insert_rows/add_sheet] Sheet ID" })),
    start_index: Type.Optional(Type.Number({ description: "[insert_rows] 插入位置（行索引，从 0 开始）" })),
    count: Type.Optional(Type.Number({ description: "[insert_rows] 插入行数" })),
    // --- add_sheet ---
    title: Type.Optional(Type.String({ description: "[add_sheet] 新 Sheet 的标题" })),
    index: Type.Optional(Type.Number({ description: "[add_sheet] 新 Sheet 的位置索引" })),
});
//# sourceMappingURL=sheets-schema.js.map