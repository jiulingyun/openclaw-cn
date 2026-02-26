import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { resolveToolsConfig } from "./tools-config.js";
import { FeishuSheetsSchema } from "./sheets-schema.js";

// ============ Helpers ============

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ============ Core Functions ============

/** Get spreadsheet metadata */
export async function getSpreadsheetMeta(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
) {
  const res = await client.sheets.v3.spreadsheet.get({
    path: { spreadsheet_token: spreadsheetToken },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    spreadsheet: res.data?.spreadsheet,
  };
}

/** List all sheets in a spreadsheet */
export async function listSheets(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
) {
  const res = await (client.sheets.v3 as any).spreadsheetSheet.list({
    path: { spreadsheet_token: spreadsheetToken },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    sheets: (res.data?.items ?? []).map((s: any) => ({
      sheet_id: s.sheet_id,
      title: s.title,
      index: s.index,
      row_count: s.grid_properties?.row_count,
      column_count: s.grid_properties?.column_count,
    })),
  };
}

/** Read a range from a sheet */
export async function readRange(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
  range: string,
) {
  const res = await (client.sheets.v3 as any).spreadsheetSheetRange.read({
    path: { spreadsheet_token: spreadsheetToken, range },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);

  // Fallback: try v2 API if v3 fails
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    values: (res.data as any)?.valueRange?.values ?? res.data?.values ?? [],
    range: (res.data as any)?.valueRange?.range ?? range,
  };
}

/** Write values to a range */
export async function writeRange(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
  range: string,
  values: unknown[][],
) {
  const res = await (client.sheets.v3 as any).spreadsheetSheetRange.write({
    path: { spreadsheet_token: spreadsheetToken, range },
    data: { values },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    updated_range: (res.data as any)?.updatedRange ?? range,
    updated_rows: (res.data as any)?.updatedRows ?? values.length,
    updated_columns: (res.data as any)?.updatedColumns,
    updated_cells: (res.data as any)?.updatedCells,
  };
}

/** Append rows to a sheet */
export async function appendData(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
  range: string,
  values: unknown[][],
) {
  const res = await (client.sheets.v3 as any).spreadsheetSheetRange.write({
    path: { spreadsheet_token: spreadsheetToken, range },
    data: { values },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    appended_rows: values.length,
    range,
  };
}

/** Insert empty rows */
export async function insertRows(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
  sheetId: string,
  startIndex: number,
  count: number,
) {
  const res = await (client.sheets.v3 as any).spreadsheetSheet.patch({
    path: { spreadsheet_token: spreadsheetToken, sheet_id: sheetId },
    data: {
      insert_range: {
        dimension: {
          sheet_id: sheetId,
          major_dimension: "ROWS",
          start_index: startIndex,
          end_index: startIndex + count,
        },
      },
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    inserted: count,
    start_index: startIndex,
  };
}

/** Add a new sheet to the spreadsheet */
export async function addSheet(
  client: ReturnType<typeof createFeishuClient>,
  spreadsheetToken: string,
  title: string,
  index?: number,
) {
  const res = await (client.sheets.v3.spreadsheetSheet as any).create({
    path: { spreadsheet_token: spreadsheetToken },
    data: {
      title,
      ...(index !== undefined && { index }),
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    sheet_id: (res.data as any)?.sheet?.sheet_id,
    title: (res.data as any)?.sheet?.title,
    index: (res.data as any)?.sheet?.index,
  };
}

// ============ Tool Registration ============

export function registerFeishuSheetsTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("feishu_sheets: No config available, skipping");
    return;
  }

  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) {
    api.logger.debug?.("feishu_sheets: No Feishu accounts configured, skipping");
    return;
  }

  const firstAccount = accounts[0];
  const toolsCfg = resolveToolsConfig(firstAccount.config.tools);

  if (!toolsCfg.sheets) {
    api.logger.debug?.("feishu_sheets: Sheets tools disabled in config");
    return;
  }

  const getClient = () => createFeishuClient(firstAccount);

  api.registerTool(
    {
      name: "feishu_sheets",
      label: "飞书 - 电子表格",
      description: `飞书电子表格操作工具。支持以下操作:
- get_meta: 获取电子表格元信息
- list_sheets: 列出所有 Sheet 页
- read_range: 读取指定范围 (格式: SheetId!A1:C10)
- write_range: 写入指定范围
- append: 在指定范围追加数据
- insert_rows: 插入空行
- add_sheet: 新增 Sheet 页`,
      parameters: FeishuSheetsSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const action = p.action as string;
        const client = getClient();
        const token = p.spreadsheet_token as string;

        try {
          switch (action) {
            case "get_meta":
              return json(await getSpreadsheetMeta(client, token));
            case "list_sheets":
              return json(await listSheets(client, token));
            case "read_range":
              return json(await readRange(client, token, p.range as string));
            case "write_range":
              return json(
                await writeRange(client, token, p.range as string, p.values as unknown[][]),
              );
            case "append":
              return json(
                await appendData(client, token, p.range as string, p.values as unknown[][]),
              );
            case "insert_rows":
              return json(
                await insertRows(
                  client,
                  token,
                  p.sheet_id as string,
                  p.start_index as number,
                  p.count as number,
                ),
              );
            case "add_sheet":
              return json(
                await addSheet(client, token, p.title as string, p.index as number | undefined),
              );
            default:
              return json({ error: `Unknown action: ${action}` });
          }
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    },
    { name: "feishu_sheets" },
  );

  api.logger.info?.("feishu_sheets: Registered feishu_sheets tool (7 actions)");
}
