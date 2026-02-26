import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createFeishuClient } from "./client.js";
/** Get spreadsheet metadata */
export declare function getSpreadsheetMeta(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string): Promise<{
    spreadsheet: {
        title?: string | undefined;
        owner_id?: string | undefined;
        token?: string | undefined;
        url?: string | undefined;
    };
}>;
/** List all sheets in a spreadsheet */
export declare function listSheets(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string): Promise<{
    sheets: any;
}>;
/** Read a range from a sheet */
export declare function readRange(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string, range: string): Promise<{
    values: any;
    range: any;
}>;
/** Write values to a range */
export declare function writeRange(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string, range: string, values: unknown[][]): Promise<{
    updated_range: any;
    updated_rows: any;
    updated_columns: any;
    updated_cells: any;
}>;
/** Append rows to a sheet */
export declare function appendData(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string, range: string, values: unknown[][]): Promise<{
    appended_rows: number;
    range: string;
}>;
/** Insert empty rows */
export declare function insertRows(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string, sheetId: string, startIndex: number, count: number): Promise<{
    inserted: number;
    start_index: number;
}>;
/** Add a new sheet to the spreadsheet */
export declare function addSheet(client: ReturnType<typeof createFeishuClient>, spreadsheetToken: string, title: string, index?: number): Promise<{
    sheet_id: any;
    title: any;
    index: any;
}>;
export declare function registerFeishuSheetsTools(api: OpenClawPluginApi): void;
//# sourceMappingURL=sheets.d.ts.map