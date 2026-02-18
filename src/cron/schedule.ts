import { Cron } from "croner";
import type { CronSchedule } from "./types.js";
import { parseAbsoluteTimeMs } from "./parse.js";

export function computeNextRunAtMs(schedule: CronSchedule, nowMs: number): number | undefined {
  if (schedule.kind === "at") {
    const atMs = parseAbsoluteTimeMs(schedule.at);
    if (atMs === null) {
      return undefined;
    }
    return atMs > nowMs ? atMs : undefined;
  }

  if (schedule.kind === "every") {
    const everyMs = Math.max(1, Math.floor(schedule.everyMs));
    const anchor = Math.max(0, Math.floor(schedule.anchorMs ?? nowMs));
    if (nowMs < anchor) {
      return anchor;
    }
    const elapsed = nowMs - anchor;
    const steps = Math.max(1, Math.floor((elapsed + everyMs - 1) / everyMs));
    return anchor + steps * everyMs;
  }

  const expr = schedule.expr.trim();
  if (!expr) {
    return undefined;
  }
  const cron = new Cron(expr, {
    timezone: schedule.tz?.trim() || undefined,
    catch: false,
  });
  const next = cron.nextRun(new Date(nowMs));
  if (!next) {
    return undefined;
  }
  const nextMs = next.getTime();
  if (!Number.isFinite(nextMs)) {
    return undefined;
  }
  if (nextMs > nowMs) {
    return nextMs;
  }

  // 防止同秒重新调度循环：如果 croner 返回"now"（或更早的时刻），
  // 从下一个整秒重试。
  const nextSecondMs = Math.floor(nowMs / 1000) * 1000 + 1000;
  const retry = cron.nextRun(new Date(nextSecondMs));
  if (!retry) {
    return undefined;
  }
  const retryMs = retry.getTime();
  return Number.isFinite(retryMs) && retryMs > nowMs ? retryMs : undefined;
}
