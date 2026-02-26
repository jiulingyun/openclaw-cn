import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Mock Setup ============

const mockClient = {
  task: {
    v2: {
      task: {
        create: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
        list: vi.fn(),
        addMembers: vi.fn(),
        addReminders: vi.fn(),
      },
      taskComment: {
        create: vi.fn(),
      },
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
    task: true,
  })),
}));

import {
  createTask,
  getTask,
  updateTask,
  completeTask,
  addTaskMembers,
  addTaskReminder,
  listTasks,
  addTaskComment,
  registerFeishuTaskTools,
} from "./task.js";

// ============ Tests ============

describe("Task Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTask", () => {
    it("should create a task with summary", async () => {
      mockClient.task.v2.task.create.mockResolvedValue({
        code: 0,
        data: {
          task: { guid: "task_123", summary: "测试任务" },
        },
      });

      const result = await createTask(mockClient as any, "测试任务");
      expect(result.task?.guid).toBe("task_123");
    });

    it("should create a task with due date and members", async () => {
      mockClient.task.v2.task.create.mockResolvedValue({
        code: 0,
        data: {
          task: { guid: "task_456", summary: "带截止日期的任务" },
        },
      });

      await createTask(mockClient as any, "带截止日期的任务", "描述", "2025-03-01T10:00:00+08:00", [
        { id: "ou_user1", role: "assignee" },
      ]);

      expect(mockClient.task.v2.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            summary: "带截止日期的任务",
            description: "描述",
            due: expect.objectContaining({ is_all_day: false }),
            members: [{ id: "ou_user1", type: "user", role: "assignee" }],
          }),
        }),
      );
    });

    it("should throw on API error", async () => {
      mockClient.task.v2.task.create.mockResolvedValue({
        code: 99991,
        msg: "Failed to create task",
      });

      await expect(createTask(mockClient as any, "fail")).rejects.toThrow("Failed to create task");
    });
  });

  describe("getTask", () => {
    it("should get task by guid", async () => {
      mockClient.task.v2.task.get.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123", summary: "任务" } },
      });

      const result = await getTask(mockClient as any, "task_123");
      expect(result.task?.guid).toBe("task_123");
    });
  });

  describe("updateTask", () => {
    it("should update summary and description", async () => {
      mockClient.task.v2.task.patch.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123", summary: "更新后" } },
      });

      await updateTask(mockClient as any, "task_123", {
        summary: "更新后",
        description: "新描述",
      });

      expect(mockClient.task.v2.task.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            task: { summary: "更新后", description: "新描述" },
            update_fields: ["summary", "description"],
          },
        }),
      );
    });
  });

  describe("completeTask", () => {
    it("should mark task as completed", async () => {
      mockClient.task.v2.task.patch.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123", completed_at: "1700000000" } },
      });

      const result = await completeTask(mockClient as any, "task_123");
      expect(result.task).toBeDefined();

      expect(mockClient.task.v2.task.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            task: { completed_at: expect.any(String) },
            update_fields: ["completed_at"],
          },
        }),
      );
    });
  });

  describe("addTaskMembers", () => {
    it("should add assignees", async () => {
      mockClient.task.v2.task.addMembers.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123" } },
      });

      await addTaskMembers(mockClient as any, "task_123", ["ou_user1", "ou_user2"], "assignee");

      expect(mockClient.task.v2.task.addMembers).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            members: [
              { id: "ou_user1", type: "user", role: "assignee" },
              { id: "ou_user2", type: "user", role: "assignee" },
            ],
          },
        }),
      );
    });

    it("should add followers", async () => {
      mockClient.task.v2.task.addMembers.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123" } },
      });

      await addTaskMembers(mockClient as any, "task_123", ["ou_user1"], "follower");

      expect(mockClient.task.v2.task.addMembers).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            members: [{ id: "ou_user1", type: "user", role: "follower" }],
          },
        }),
      );
    });
  });

  describe("addTaskReminder", () => {
    it("should add a reminder", async () => {
      mockClient.task.v2.task.addReminders.mockResolvedValue({
        code: 0,
        data: { task: { guid: "task_123" } },
      });

      await addTaskReminder(mockClient as any, "task_123", -30);

      expect(mockClient.task.v2.task.addReminders).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            reminders: [{ relative_fire_minute: -30 }],
          },
        }),
      );
    });
  });

  describe("listTasks", () => {
    it("should list tasks with pagination", async () => {
      mockClient.task.v2.task.list.mockResolvedValue({
        code: 0,
        data: {
          items: [{ guid: "task_1" }, { guid: "task_2" }],
          has_more: true,
          page_token: "next",
        },
      });

      const result = await listTasks(mockClient as any);
      expect(result.tasks).toHaveLength(2);
      expect(result.has_more).toBe(true);
    });
  });

  describe("addTaskComment", () => {
    it("should add a comment", async () => {
      mockClient.task.v2.taskComment.create.mockResolvedValue({
        code: 0,
        data: { comment: { id: "cm_1", content: "评论内容" } },
      });

      const result = await addTaskComment(mockClient as any, "task_123", "评论内容");
      expect(result.comment?.id).toBe("cm_1");
    });
  });
});

describe("registerFeishuTaskTools", () => {
  it("should register feishu_task tool", () => {
    const registeredTools: string[] = [];
    const mockApi = {
      config: { channels: { feishu: { appId: "cli_test", appSecret: "secret_test" } } },
      logger: { debug: vi.fn(), info: vi.fn() },
      registerTool: vi.fn((_def, opts) => {
        registeredTools.push(opts.name);
      }),
    };

    registerFeishuTaskTools(mockApi as any);
    expect(registeredTools).toEqual(["feishu_task"]);
  });
});
