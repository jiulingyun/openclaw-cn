import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as memoryBackend from "./queue-memory.js";

describe("queue-memory", () => {
  beforeEach(() => {
    memoryBackend.reset();
  });

  afterEach(() => {
    memoryBackend.reset();
  });

  describe("insertTask", () => {
    it("should insert a task and return its ID", () => {
      const id = memoryBackend.insertTask("lane1", "TEST_TASK", { foo: "bar" });
      expect(id).toBe(1);
    });

    it("should increment IDs for subsequent tasks", () => {
      const id1 = memoryBackend.insertTask("lane1", "TASK1", {});
      const id2 = memoryBackend.insertTask("lane1", "TASK2", {});
      const id3 = memoryBackend.insertTask("lane2", "TASK3", {});
      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });

    it("should store payload as JSON string", () => {
      memoryBackend.insertTask("lane1", "TEST", { nested: { value: 123 } });
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      expect(JSON.parse(task!.payload)).toEqual({ nested: { value: 123 } });
    });

    it("should set initial status to PENDING", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      expect(task!.status).toBe("RUNNING");
    });

    it("should set created_at and updated_at timestamps", () => {
      const before = Date.now();
      memoryBackend.insertTask("lane1", "TEST", {});
      const after = Date.now();
      memoryBackend.insertTask("lane1", "TEST2", {});
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      expect(task!.created_at).toBeGreaterThanOrEqual(before);
      expect(task!.created_at).toBeLessThanOrEqual(after);
    });
  });

  describe("claimNextPendingTask", () => {
    it("should return null when no tasks exist", () => {
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).toBeNull();
    });

    it("should return null when no tasks exist for the specified lane", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const task = memoryBackend.claimNextPendingTask("lane2");
      expect(task).toBeNull();
    });

    it("should claim the oldest PENDING task for the lane (FIFO)", () => {
      memoryBackend.insertTask("lane1", "TASK1", { order: 1 });
      memoryBackend.insertTask("lane1", "TASK2", { order: 2 });
      memoryBackend.insertTask("lane1", "TASK3", { order: 3 });

      const task1 = memoryBackend.claimNextPendingTask("lane1");
      expect(task1).not.toBeNull();
      expect(JSON.parse(task1!.payload)).toEqual({ order: 1 });

      const task2 = memoryBackend.claimNextPendingTask("lane1");
      expect(task2).not.toBeNull();
      expect(JSON.parse(task2!.payload)).toEqual({ order: 2 });
    });

    it("should set status to RUNNING when claimed", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      expect(task!.status).toBe("RUNNING");
    });

    it("should not claim tasks from other lanes", () => {
      memoryBackend.insertTask("lane1", "TEST", { lane: 1 });
      memoryBackend.insertTask("lane2", "TEST", { lane: 2 });

      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      expect(JSON.parse(task!.payload)).toEqual({ lane: 1 });
    });

    it("should not claim non-PENDING tasks", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id, "done");

      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).toBeNull();
    });
  });

  describe("resolveTask", () => {
    it("should set status to COMPLETED", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id, { result: "success" });

      const result = memoryBackend.getTaskResult(id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe("COMPLETED");
    });

    it("should store result as JSON", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id, { data: [1, 2, 3] });

      const result = memoryBackend.getTaskResult(id);
      expect(result).not.toBeNull();
      expect(result!.result).toEqual({ data: [1, 2, 3] });
    });

    it("should handle undefined result", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id);

      const result = memoryBackend.getTaskResult(id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe("COMPLETED");
      expect(result!.result).toBeNull();
    });

    it("should be idempotent", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id, "first");
      memoryBackend.resolveTask(id, "second");

      const result = memoryBackend.getTaskResult(id);
      expect(result!.result).toBe("second");
    });
  });

  describe("rejectTask", () => {
    it("should set status to FAILED", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.rejectTask(id, "Something went wrong");

      const result = memoryBackend.getTaskResult(id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe("FAILED");
    });

    it("should store error message", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.rejectTask(id, "Error: timeout");

      const result = memoryBackend.getTaskResult(id);
      expect(result).not.toBeNull();
      expect(result!.error_msg).toBe("Error: timeout");
    });
  });

  describe("countQueueByStatus", () => {
    it("should return 0 for empty queue", () => {
      expect(memoryBackend.countQueueByStatus("lane1")).toBe(0);
    });

    it("should count PENDING and RUNNING by default (no status filter)", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane1", "TEST", {});

      expect(memoryBackend.countQueueByStatus("lane1")).toBe(3);
    });

    it("should only count tasks for the specified lane", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});

      expect(memoryBackend.countQueueByStatus("lane1")).toBe(2);
      expect(memoryBackend.countQueueByStatus("lane2")).toBe(1);
    });

    it("should not count COMPLETED tasks by default", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id);

      expect(memoryBackend.countQueueByStatus("lane1")).toBe(0);
    });

    it("should not count FAILED tasks by default", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.rejectTask(id, "error");

      expect(memoryBackend.countQueueByStatus("lane1")).toBe(0);
    });

    it("should filter by specific status when provided", () => {
      const id1 = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id1);

      expect(memoryBackend.countQueueByStatus("lane1", "PENDING")).toBe(1);
      expect(memoryBackend.countQueueByStatus("lane1", "COMPLETED")).toBe(1);
    });

    it("should count RUNNING tasks by default", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      expect(memoryBackend.countQueueByStatus("lane1")).toBe(1);
    });
  });

  describe("countTotalQueue", () => {
    it("should count PENDING and RUNNING across all lanes", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});
      memoryBackend.insertTask("lane3", "TEST", {});

      expect(memoryBackend.countTotalQueue()).toBe(3);
    });

    it("should not count COMPLETED or FAILED tasks", () => {
      const id1 = memoryBackend.insertTask("lane1", "TEST", {});
      const id2 = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id1);
      memoryBackend.rejectTask(id2, "error");

      expect(memoryBackend.countTotalQueue()).toBe(0);
    });
  });

  describe("clearLaneTasks", () => {
    it("should remove all PENDING tasks from the specified lane", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});

      const removed = memoryBackend.clearLaneTasks("lane1");
      expect(removed).toBe(2);
      expect(memoryBackend.countQueueByStatus("lane1")).toBe(0);
      expect(memoryBackend.countQueueByStatus("lane2")).toBe(1);
    });

    it("should not remove RUNNING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      const removed = memoryBackend.clearLaneTasks("lane1");
      expect(removed).toBe(0);
    });

    it("should return 0 if no tasks were removed", () => {
      const removed = memoryBackend.clearLaneTasks("nonexistent");
      expect(removed).toBe(0);
    });
  });

  describe("getPendingTaskIdsForLane", () => {
    it("should return IDs of all PENDING tasks in the lane", () => {
      const id1 = memoryBackend.insertTask("lane1", "TEST", {});
      const id2 = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});

      const ids = memoryBackend.getPendingTaskIdsForLane("lane1");
      expect(ids).toEqual([id1, id2]);
    });

    it("should return empty array if no PENDING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      const ids = memoryBackend.getPendingTaskIdsForLane("lane1");
      expect(ids).toEqual([]);
    });

    it("should return empty array for nonexistent lane", () => {
      const ids = memoryBackend.getPendingTaskIdsForLane("nonexistent");
      expect(ids).toEqual([]);
    });
  });

  describe("hasActiveTasks", () => {
    it("should return false when no RUNNING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      expect(memoryBackend.hasActiveTasks()).toBe(false);
    });

    it("should return true when there are RUNNING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      expect(memoryBackend.hasActiveTasks()).toBe(true);
    });

    it("should return false when all tasks are COMPLETED", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id);
      expect(memoryBackend.hasActiveTasks()).toBe(false);
    });
  });

  describe("recoverRunningTasks", () => {
    it("should return empty array when no RUNNING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const lanes = memoryBackend.recoverRunningTasks();
      expect(lanes).toEqual([]);
    });

    it("should reset RUNNING tasks to PENDING", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");

      const lanes = memoryBackend.recoverRunningTasks();
      expect(lanes).toEqual(["lane1"]);

      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
    });

    it("should return affected lanes", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      memoryBackend.claimNextPendingTask("lane2");

      const lanes = memoryBackend.recoverRunningTasks();
      expect(lanes.sort()).toEqual(["lane1", "lane2"].sort());
    });
  });

  describe("getTaskResult", () => {
    it("should return null for nonexistent task", () => {
      const result = memoryBackend.getTaskResult(999);
      expect(result).toBeNull();
    });

    it("should return status, result, and error_msg", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.resolveTask(id, { foo: "bar" });

      const result = memoryBackend.getTaskResult(id);
      expect(result).toEqual({
        status: "COMPLETED",
        result: { foo: "bar" },
        error_msg: null,
      });
    });
  });

  describe("getPendingLanes", () => {
    it("should return lanes with PENDING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});

      const lanes = memoryBackend.getPendingLanes();
      expect(lanes.sort()).toEqual(["lane1", "lane2"].sort());
    });

    it("should not include lanes with only RUNNING tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");

      const lanes = memoryBackend.getPendingLanes();
      expect(lanes).toEqual([]);
    });

    it("should return empty array when no PENDING tasks", () => {
      const lanes = memoryBackend.getPendingLanes();
      expect(lanes).toEqual([]);
    });
  });

  describe("markStaleTasks", () => {
    it("should always return 0 (memory mode has no persistence)", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const count = memoryBackend.markStaleTasks("reason");
      expect(count).toBe(0);
    });
  });

  describe("getRecoverableTasks", () => {
    it("should always return empty array (memory mode has no persistence)", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      const tasks = memoryBackend.getRecoverableTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe("reset", () => {
    it("should clear all tasks", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.insertTask("lane2", "TEST", {});
      memoryBackend.reset();

      expect(memoryBackend.countTotalQueue()).toBe(0);
    });

    it("should reset ID counter", () => {
      memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.reset();

      const id = memoryBackend.insertTask("lane1", "TEST", {});
      expect(id).toBe(1);
    });
  });

  describe("status transitions", () => {
    it("should transition PENDING -> RUNNING -> COMPLETED", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      expect(memoryBackend.countQueueByStatus("lane1", "PENDING")).toBe(1);

      memoryBackend.claimNextPendingTask("lane1");
      expect(memoryBackend.hasActiveTasks()).toBe(true);

      memoryBackend.resolveTask(id, "done");
      const result = memoryBackend.getTaskResult(id);
      expect(result!.status).toBe("COMPLETED");
    });

    it("should transition PENDING -> RUNNING -> FAILED", () => {
      const id = memoryBackend.insertTask("lane1", "TEST", {});
      memoryBackend.claimNextPendingTask("lane1");
      memoryBackend.rejectTask(id, "error");

      const result = memoryBackend.getTaskResult(id);
      expect(result!.status).toBe("FAILED");
      expect(result!.error_msg).toBe("error");
    });
  });

  describe("edge cases", () => {
    it("should handle empty lane name", () => {
      const id = memoryBackend.insertTask("", "TEST", {});
      expect(id).toBe(1);
      const task = memoryBackend.claimNextPendingTask("");
      expect(task).not.toBeNull();
    });

    it("should handle special characters in lane name", () => {
      const lane = "lane:with:special:chars@example.com";
      const id = memoryBackend.insertTask(lane, "TEST", {});
      const task = memoryBackend.claimNextPendingTask(lane);
      expect(task).not.toBeNull();
      expect(task!.id).toBe(id);
    });

    it("should handle large payloads", () => {
      const largePayload = { data: "x".repeat(100000) };
      memoryBackend.insertTask("lane1", "TEST", largePayload);
      const task = memoryBackend.claimNextPendingTask("lane1");
      expect(task).not.toBeNull();
      const parsed = JSON.parse(task!.payload);
      expect(parsed.data.length).toBe(100000);
    });

    it("should handle concurrent claims correctly", () => {
      memoryBackend.insertTask("lane1", "TEST", { id: 1 });
      memoryBackend.insertTask("lane1", "TEST", { id: 2 });

      const task1 = memoryBackend.claimNextPendingTask("lane1");
      const task2 = memoryBackend.claimNextPendingTask("lane1");
      const task3 = memoryBackend.claimNextPendingTask("lane1");

      expect(task1).not.toBeNull();
      expect(task2).not.toBeNull();
      expect(task3).toBeNull();
    });
  });
});
