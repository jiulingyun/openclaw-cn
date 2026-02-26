import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Mock Setup ============

const mockClient = {
  bitable: {
    app: { get: vi.fn() },
    appTable: { list: vi.fn(), create: vi.fn() },
    appTableRecord: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      search: vi.fn(),
      batchCreate: vi.fn(),
      batchUpdate: vi.fn(),
    },
    appTableField: { list: vi.fn(), create: vi.fn() },
    appTableView: { create: vi.fn() },
    appDashboard: { list: vi.fn() },
  },
  wiki: {
    space: { getNode: vi.fn() },
  },
};

vi.mock("./client.js", () => ({
  createFeishuClient: vi.fn(() => mockClient),
}));

import {
  searchRecords,
  batchCreateRecords,
  batchUpdateRecords,
  listBitableTables,
  createBitableTable,
  createBitableField,
  createBitableView,
  listBitableDashboards,
} from "./bitable.js";

// ============ Tests ============

describe("Bitable Enhanced Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- searchRecords ---
  describe("searchRecords", () => {
    it("should search with filter conditions", async () => {
      mockClient.bitable.appTableRecord.search.mockResolvedValue({
        code: 0,
        data: {
          items: [{ record_id: "rec1", fields: { Name: "Test", Status: "Done" } }],
          has_more: false,
          total: 1,
        },
      });

      const filter = {
        conjunction: "and",
        conditions: [{ field_name: "Status", operator: "is", value: ["Done"] }],
      };

      const result = await searchRecords(mockClient as any, "app_token", "table_id", filter);

      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should pass sort and field_names", async () => {
      mockClient.bitable.appTableRecord.search.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false, total: 0 },
      });

      const sort = [{ field_name: "Created", desc: true }];
      await searchRecords(mockClient as any, "app_token", "table_id", undefined, sort, [
        "Name",
        "Status",
      ]);

      expect(mockClient.bitable.appTableRecord.search).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sort,
            field_names: ["Name", "Status"],
          }),
        }),
      );
    });

    it("should throw on API error", async () => {
      mockClient.bitable.appTableRecord.search.mockResolvedValue({
        code: 1254043,
        msg: "Permission denied",
      });

      await expect(searchRecords(mockClient as any, "app", "table")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  // --- batchCreateRecords ---
  describe("batchCreateRecords", () => {
    it("should create multiple records", async () => {
      mockClient.bitable.appTableRecord.batchCreate.mockResolvedValue({
        code: 0,
        data: {
          records: [
            { record_id: "rec1", fields: { Name: "A" } },
            { record_id: "rec2", fields: { Name: "B" } },
          ],
        },
      });

      const records = [{ fields: { Name: "A" } }, { fields: { Name: "B" } }];

      const result = await batchCreateRecords(mockClient as any, "app_token", "table_id", records);

      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should throw on API error", async () => {
      mockClient.bitable.appTableRecord.batchCreate.mockResolvedValue({
        code: 99991,
        msg: "Batch create failed",
      });

      await expect(batchCreateRecords(mockClient as any, "app", "table", [])).rejects.toThrow(
        "Batch create failed",
      );
    });
  });

  // --- batchUpdateRecords ---
  describe("batchUpdateRecords", () => {
    it("should update multiple records", async () => {
      mockClient.bitable.appTableRecord.batchUpdate.mockResolvedValue({
        code: 0,
        data: {
          records: [{ record_id: "rec1", fields: { Status: "Done" } }],
        },
      });

      const records = [{ record_id: "rec1", fields: { Status: "Done" } }];

      const result = await batchUpdateRecords(mockClient as any, "app_token", "table_id", records);

      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // --- listBitableTables ---
  describe("listBitableTables", () => {
    it("should list tables with pagination", async () => {
      mockClient.bitable.appTable.list.mockResolvedValue({
        code: 0,
        data: {
          items: [
            { table_id: "tbl_1", name: "数据表1", revision: 10 },
            { table_id: "tbl_2", name: "数据表2", revision: 5 },
          ],
          has_more: false,
          total: 2,
        },
      });

      const result = await listBitableTables(mockClient as any, "app_token");

      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].name).toBe("数据表1");
      expect(result.total).toBe(2);
    });

    it("should handle empty table list", async () => {
      mockClient.bitable.appTable.list.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false, total: 0 },
      });

      const result = await listBitableTables(mockClient as any, "app_token");
      expect(result.tables).toHaveLength(0);
    });
  });

  // --- createBitableTable ---
  describe("createBitableTable", () => {
    it("should create a table with fields", async () => {
      mockClient.bitable.appTable.create.mockResolvedValue({
        code: 0,
        data: { table_id: "tbl_new" },
      });

      const result = await createBitableTable(mockClient as any, "app_token", "新表", [
        { field_name: "名称", type: 1 },
        { field_name: "状态", type: 3 },
      ]);

      expect(result.table_id).toBe("tbl_new");
      expect(result.name).toBe("新表");
    });

    it("should create a table without fields", async () => {
      mockClient.bitable.appTable.create.mockResolvedValue({
        code: 0,
        data: { table_id: "tbl_empty" },
      });

      const result = await createBitableTable(mockClient as any, "app_token", "空表");
      expect(result.table_id).toBe("tbl_empty");
    });
  });

  // --- createBitableField ---
  describe("createBitableField", () => {
    it("should create a text field", async () => {
      mockClient.bitable.appTableField.create.mockResolvedValue({
        code: 0,
        data: {
          field: {
            field_id: "fld_1",
            field_name: "备注",
            type: 1,
          },
        },
      });

      const result = await createBitableField(
        mockClient as any,
        "app_token",
        "table_id",
        "备注",
        1,
      );

      expect(result.field_id).toBe("fld_1");
      expect(result.field_name).toBe("备注");
      expect(result.type_name).toBe("Text");
    });

    it("should create a field with property", async () => {
      mockClient.bitable.appTableField.create.mockResolvedValue({
        code: 0,
        data: {
          field: { field_id: "fld_2", field_name: "状态", type: 3 },
        },
      });

      const property = { options: [{ name: "待办" }, { name: "完成" }] };
      const result = await createBitableField(
        mockClient as any,
        "app_token",
        "table_id",
        "状态",
        3,
        property,
      );

      expect(result.field_id).toBe("fld_2");
      expect(result.type_name).toBe("SingleSelect");
    });
  });

  // --- createBitableView ---
  describe("createBitableView", () => {
    it("should create a grid view by default", async () => {
      mockClient.bitable.appTableView.create.mockResolvedValue({
        code: 0,
        data: {
          view: { view_id: "vw_1", view_name: "默认视图", view_type: "grid" },
        },
      });

      const result = await createBitableView(
        mockClient as any,
        "app_token",
        "table_id",
        "默认视图",
      );

      expect(result.view_id).toBe("vw_1");
      expect(result.view_type).toBe("grid");
    });

    it("should create a kanban view", async () => {
      mockClient.bitable.appTableView.create.mockResolvedValue({
        code: 0,
        data: {
          view: { view_id: "vw_2", view_name: "看板", view_type: "kanban" },
        },
      });

      const result = await createBitableView(
        mockClient as any,
        "app_token",
        "table_id",
        "看板",
        "kanban",
      );

      expect(result.view_type).toBe("kanban");
    });
  });

  // --- listBitableDashboards ---
  describe("listBitableDashboards", () => {
    it("should list dashboards", async () => {
      mockClient.bitable.appDashboard.list.mockResolvedValue({
        code: 0,
        data: {
          dashboards: [
            { block_id: "dash_1", name: "总览" },
            { block_id: "dash_2", name: "统计" },
          ],
          has_more: false,
        },
      });

      const result = await listBitableDashboards(mockClient as any, "app_token");

      expect(result.dashboards).toHaveLength(2);
      expect(result.dashboards[0].name).toBe("总览");
    });

    it("should handle empty dashboards", async () => {
      mockClient.bitable.appDashboard.list.mockResolvedValue({
        code: 0,
        data: { dashboards: [], has_more: false },
      });

      const result = await listBitableDashboards(mockClient as any, "app_token");
      expect(result.dashboards).toHaveLength(0);
    });
  });
});
