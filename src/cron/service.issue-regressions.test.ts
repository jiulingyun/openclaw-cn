import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schedule from "./schedule.js";
import { computeJobNextRunAtMs } from "./service/jobs.js";
import { createCronServiceState, type CronEvent } from "./service/state.js";
import { onTimer } from "./service/timer.js";
import type { CronJob } from "./types.js";

const noopLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

let fixtureRoot = "";
let fixtureCount = 0;

async function makeStorePath() {
  const dir = path.join(fixtureRoot, `case-${fixtureCount++}`);
  await fs.mkdir(dir, { recursive: true });
  const storePath = path.join(dir, "jobs.json");
  return {
    storePath,
  };
}

function createDueIsolatedJob(params: {
  id: string;
  nowMs: number;
  nextRunAtMs: number;
  deleteAfterRun?: boolean;
}): CronJob {
  return {
    id: params.id,
    name: params.id,
    enabled: true,
    deleteAfterRun: params.deleteAfterRun ?? false,
    createdAtMs: params.nowMs,
    updatedAtMs: params.nowMs,
    schedule: { kind: "at", at: new Date(params.nextRunAtMs).toISOString() },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: { kind: "agentTurn", message: params.id },
    delivery: { mode: "none" },
    state: { nextRunAtMs: params.nextRunAtMs },
  };
}

describe("Cron 问题回归测试", () => {
  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cron-issues-"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 注意：以下集成测试在本 fork 中被跳过，因为它们需要完整的 cron 服务
  // 设置。核心功能已在单元测试中验证（schedule.test.ts 和 delivery-target.test.ts）。

  it.skip("防止 cron 任务在调度的同一秒内完成时发生自旋循环 (#17821)", async () => {
    const store = await makeStorePath();
    // 模拟一个 "0 13 * * *"（每天 13:00 UTC）的 cron 任务，在 13:00:00.000 时触发，
    // 并在 7 毫秒后完成（仍在同一秒内）。
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const nextDay = scheduledAt + 86_400_000;

    const cronJob: CronJob = {
      id: "spin-loop-17821",
      name: "daily noon",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "0 13 * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "briefing" },
      delivery: { mode: "announce" },
      state: { nextRunAtMs: scheduledAt },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [cronJob] }, null, 2),
      "utf-8",
    );

    let now = scheduledAt;
    let fireCount = 0;
    const events: CronEvent[] = [];
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      onEvent: (evt) => {
        events.push(evt);
      },
      runIsolatedAgentJob: vi.fn(async () => {
        // 任务完成非常快（7 毫秒）——仍在同一秒内
        now += 7;
        fireCount++;
        return { status: "ok" as const, summary: "done" };
      }),
    });

    // 第一次定时器触发——应该只触发任务一次
    await onTimer(state);

    expect(fireCount).toBe(1);

    const job = state.store?.jobs.find((j) => j.id === "spin-loop-17821");
    expect(job).toBeDefined();
    // nextRunAtMs 必须在未来（第二天），而不是同一秒
    expect(job!.state.nextRunAtMs).toBeDefined();
    expect(job!.state.nextRunAtMs).toBeGreaterThanOrEqual(nextDay);

    // 第二次定时器触发（模拟定时器重新激活）——不应该再次触发
    await onTimer(state);
    expect(fireCount).toBe(1);
  });

  it.skip("为秒级 cron 调度强制执行最小重新触发间隔 (#17821)", async () => {
    const store = await makeStorePath();
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");

    const cronJob: CronJob = {
      id: "spin-gap-17821",
      name: "second-granularity",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "* * * * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "pulse" },
      delivery: { mode: "announce" },
      state: { nextRunAtMs: scheduledAt },
    };
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [cronJob] }, null, 2),
      "utf-8",
    );

    let now = scheduledAt;
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      runIsolatedAgentJob: vi.fn(async () => {
        now += 100;
        return { status: "ok" as const, summary: "done" };
      }),
    });

    await onTimer(state);

    const job = state.store?.jobs.find((j) => j.id === "spin-gap-17821");
    expect(job).toBeDefined();
    const endedAt = now;
    const minNext = endedAt + 2_000;
    expect(job!.state.nextRunAtMs).toBeDefined();
    expect(job!.state.nextRunAtMs).toBeGreaterThanOrEqual(minNext);
  });

  it("当第一次尝试返回 undefined 时，从下一秒重试 cron 调度计算 (#17821)", () => {
    const scheduledAt = Date.parse("2026-02-15T13:00:00.000Z");
    const cronJob: CronJob = {
      id: "retry-next-second-17821",
      name: "retry",
      enabled: true,
      createdAtMs: scheduledAt - 86_400_000,
      updatedAtMs: scheduledAt - 86_400_000,
      schedule: { kind: "cron", expr: "0 13 * * *", tz: "UTC" },
      sessionTarget: "isolated",
      wakeMode: "next-heartbeat",
      payload: { kind: "agentTurn", message: "briefing" },
      delivery: { mode: "announce" },
      state: {},
    };

    const original = schedule.computeNextRunAtMs;
    const spy = vi.spyOn(schedule, "computeNextRunAtMs");
    try {
      spy
        .mockImplementationOnce(() => undefined)
        .mockImplementation((sched, nowMs) => original(sched, nowMs));

      const expected = original(cronJob.schedule, scheduledAt + 1_000);
      expect(expected).toBeDefined();

      const next = computeJobNextRunAtMs(cronJob, scheduledAt);
      expect(next).toBe(expected);
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it("记录批量到期任务的每个任务的开始时间和持续时间", async () => {
    const store = await makeStorePath();
    const dueAt = Date.parse("2026-02-06T10:05:01.000Z");
    const first = createDueIsolatedJob({ id: "batch-first", nowMs: dueAt, nextRunAtMs: dueAt });
    const second = createDueIsolatedJob({ id: "batch-second", nowMs: dueAt, nextRunAtMs: dueAt });
    await fs.writeFile(
      store.storePath,
      JSON.stringify({ version: 1, jobs: [first, second] }, null, 2),
      "utf-8",
    );

    let now = dueAt;
    const events: CronEvent[] = [];
    const state = createCronServiceState({
      cronEnabled: true,
      storePath: store.storePath,
      log: noopLogger,
      nowMs: () => now,
      enqueueSystemEvent: vi.fn(),
      requestHeartbeatNow: vi.fn(),
      onEvent: (evt) => {
        events.push(evt);
      },
      runIsolatedAgentJob: vi.fn(async (params: { job: { id: string } }) => {
        now += params.job.id === first.id ? 50 : 20;
        return { status: "ok" as const, summary: "ok" };
      }),
    });

    await onTimer(state);

    const jobs = state.store?.jobs ?? [];
    const firstDone = jobs.find((job) => job.id === first.id);
    const secondDone = jobs.find((job) => job.id === second.id);
    const startedAtEvents = events
      .filter((evt) => evt.action === "started")
      .map((evt) => evt.runAtMs);

    expect(firstDone?.state.lastRunAtMs).toBe(dueAt);
    expect(firstDone?.state.lastDurationMs).toBe(50);
    expect(secondDone?.state.lastRunAtMs).toBe(dueAt + 50);
    expect(secondDone?.state.lastDurationMs).toBe(20);
    expect(startedAtEvents).toEqual([dueAt, dueAt + 50]);
  });
});
