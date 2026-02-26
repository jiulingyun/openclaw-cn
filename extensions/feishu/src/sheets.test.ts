import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Mock Setup ============

const mockClient = {
  sheets: {
    v3: {
      spreadsheet: { get: vi.fn() },
      spreadsheetSheet: { list: vi.fn(), patch: vi.fn(), create: vi.fn() },
      spreadsheetSheetRange: { read: vi.fn(), write: vi.fn() },
    },
  },
};

vi.mock("./client.js", () => ({
  createFeishuClient: vi.fn(() => mockClient),
}));

vi.mock("./accounts.js", () => ({
  listEnabledFeishuAccounts: vi.fn(() => [
    {
      accountId: "default",
      enabled: true,
      configured: true,
      appId: "cli_test",
      appSecret: "secret_test",
      domain: "feishu",
      config: {},
    },
  ]),
}));

vi.mock("./tools-config.js", () => ({
  resolveToolsConfig: vi.fn(() => ({
    sheets: true,
  })),
}));

import {
  getSpreadsheetMeta,
  listSheets,
  readRange,
  writeRange,
  appendData,
  insertRows,
  addSheet,
  registerFeishuSheetsTools,
} from "./sheets.js";

// ============ Tests ============

describe("Sheets Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSpreadsheetMeta", () => {
    it("should return spreadsheet metadata", async () => {
      mockClient.sheets.v3.spreadsheet.get.mockResolvedValue({
        code: 0,
        data: {
          spreadsheet: { title: "测试表格", spreadsheet_token: "shtcn123" },
        },
      });

      const result = await getSpreadsheetMeta(mockClient as any, "shtcn123");
      expect(result.spreadsheet?.title).toBe("测试表格");
    });
  });

  describe("listSheets", () => {
    it("should list all sheets", async () => {
      mockClient.sheets.v3.spreadsheetSheet.list.mockResolvedValue({
        code: 0,
        data: {
          items: [
            {
              sheet_id: "s1",
              title: "Sheet1",
              index: 0,
              grid_properties: { row_count: 100, column_count: 26 },
            },
            {
              sheet_id: "s2",
              title: "Sheet2",
              index: 1,
              grid_properties: { row_count: 50, column_count: 10 },
            },
          ],
        },
      });

      const result = await listSheets(mockClient as any, "shtcn123");
      expect(result.sheets).toHaveLength(2);
      expect(result.sheets[0].title).toBe("Sheet1");
      expect(result.sheets[0].row_count).toBe(100);
    });
  });

  describe("readRange", () => {
    it("should read values from a range", async () => {
      mockClient.sheets.v3.spreadsheetSheetRange.read.mockResolvedValue({
        code: 0,
        data: {
          valueRange: {
            range: "s1!A1:C3",
            values: [
              ["Name", "Age", "City"],
              ["Alice", 30, "Beijing"],
            ],
          },
        },
      });

      const result = await readRange(mockClient as any, "shtcn123", "s1!A1:C3");
      expect(result.values).toHaveLength(2);
      expect(result.values[0][0]).toBe("Name");
    });

    it("should throw on API error", async () => {
      mockClient.sheets.v3.spreadsheetSheetRange.read.mockResolvedValue({
        code: 99991,
        msg: "Spreadsheet not found",
      });

      await expect(readRange(mockClient as any, "bad", "s1!A1")).rejects.toThrow(
        "Spreadsheet not found",
      );
    });
  });

  describe("writeRange", () => {
    it("should write values to a range", async () => {
      mockClient.sheets.v3.spreadsheetSheetRange.write.mockResolvedValue({
        code: 0,
        data: {
          updatedRange: "s1!A1:B2",
          updatedRows: 2,
          updatedColumns: 2,
          updatedCells: 4,
        },
      });

      const result = await writeRange(mockClient as any, "shtcn123", "s1!A1:B2", [
        ["a", "b"],
        ["c", "d"],
      ]);
      expect(result.updated_rows).toBe(2);
    });
  });

  describe("appendData", () => {
    it("should append data to a range", async () => {
      mockClient.sheets.v3.spreadsheetSheetRange.write.mockResolvedValue({
        code: 0,
        data: {},
      });

      const result = await appendData(mockClient as any, "shtcn123", "s1!A:C", [
        ["new1", "new2", "new3"],
      ]);
      expect(result.appended_rows).toBe(1);
    });
  });

  describe("insertRows", () => {
    it("should insert empty rows", async () => {
      mockClient.sheets.v3.spreadsheetSheet.patch.mockResolvedValue({
        code: 0,
        data: {},
      });

      const result = await insertRows(mockClient as any, "shtcn123", "s1", 5, 3);
      expect(result.inserted).toBe(3);
      expect(result.start_index).toBe(5);
    });
  });

  describe("addSheet", () => {
    it("should add a new sheet", async () => {
      mockClient.sheets.v3.spreadsheetSheet.create.mockResolvedValue({
        code: 0,
        data: {
          sheet: { sheet_id: "s_new", title: "新工作表", index: 2 },
        },
      });

      const result = await addSheet(mockClient as any, "shtcn123", "新工作表");
      expect(result.sheet_id).toBe("s_new");
      expect(result.title).toBe("新工作表");
    });
  });
});

describe("registerFeishuSheetsTools", () => {
  it("should register feishu_sheets tool", () => {
    const registeredTools: string[] = [];
    const mockApi = {
      config: { channels: { feishu: { appId: "cli_test", appSecret: "secret_test" } } },
      logger: { debug: vi.fn(), info: vi.fn() },
      registerTool: vi.fn((_def, opts) => {
        registeredTools.push(opts.name);
      }),
    };

    registerFeishuSheetsTools(mockApi as any);
    expect(registeredTools).toEqual(["feishu_sheets"]);
  });
});
