/**
 * Compaction Health Check Module
 *
 * Monitors compaction operations and provides recovery mechanisms when
 * compaction gets stuck or fails repeatedly.
 */

import { log } from "./logger.js";

export type CompactionHealthState = {
  sessionId: string;
  sessionKey?: string;
  startTime: number;
  lastActivity: number;
  attemptCount: number;
  consecutiveFailures: number;
  lastError?: string;
  status: "idle" | "running" | "stuck" | "failed";
};

const HEALTH_CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
const COMPACTION_STUCK_THRESHOLD_MS = 600_000; // 10 minutes - compaction stuck if running longer than this
const MAX_CONSECUTIVE_FAILURES = 3; // Max consecutive failures before marking as unhealthy

const healthStateMap = new Map<string, CompactionHealthState>();
const healthCheckTimers = new Map<string, NodeJS.Timeout>();

/**
 * Start tracking a compaction operation
 */
export function startCompactionTracking(params: { sessionId: string; sessionKey?: string }): void {
  const key = params.sessionKey ?? params.sessionId;

  const existingState = healthStateMap.get(key);
  const attemptCount = (existingState?.attemptCount ?? 0) + 1;
  const consecutiveFailures = existingState?.consecutiveFailures ?? 0;

  const state: CompactionHealthState = {
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    startTime: Date.now(),
    lastActivity: Date.now(),
    attemptCount,
    consecutiveFailures,
    status: "running",
  };

  healthStateMap.set(key, state);
  log.debug(`[compaction-health] Started tracking: sessionKey=${key}, attempt=${attemptCount}`);

  // Clear any existing health check timer
  const existingTimer = healthCheckTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Start health check timer
  const timer = setInterval(() => {
    checkCompactionHealth(key);
  }, HEALTH_CHECK_INTERVAL_MS);

  healthCheckTimers.set(key, timer);
}

/**
 * Update compaction activity timestamp
 */
export function updateCompactionActivity(params: { sessionId: string; sessionKey?: string }): void {
  const key = params.sessionKey ?? params.sessionId;
  const state = healthStateMap.get(key);
  if (state) {
    state.lastActivity = Date.now();
  }
}

/**
 * Mark compaction as completed successfully
 */
export function completeCompactionTracking(params: {
  sessionId: string;
  sessionKey?: string;
}): void {
  const key = params.sessionKey ?? params.sessionId;
  const state = healthStateMap.get(key);

  if (state) {
    state.status = "idle";
    state.consecutiveFailures = 0;
    log.debug(
      `[compaction-health] Completed successfully: sessionKey=${key}, ` +
        `duration=${Date.now() - state.startTime}ms, attempts=${state.attemptCount}`,
    );
  }

  cleanupHealthCheck(key);
}

/**
 * Mark compaction as failed
 */
export function failCompactionTracking(params: {
  sessionId: string;
  sessionKey?: string;
  error?: string;
}): void {
  const key = params.sessionKey ?? params.sessionId;
  const state = healthStateMap.get(key);

  if (state) {
    state.status = "failed";
    state.consecutiveFailures = (state.consecutiveFailures ?? 0) + 1;
    state.lastError = params.error;
    log.warn(
      `[compaction-health] Failed: sessionKey=${key}, ` +
        `failures=${state.consecutiveFailures}, error=${params.error ?? "unknown"}`,
    );
  }

  cleanupHealthCheck(key);
}

/**
 * Check if compaction is healthy for a given session
 */
export function isCompactionHealthy(params: { sessionId: string; sessionKey?: string }): {
  healthy: boolean;
  reason?: string;
} {
  const key = params.sessionKey ?? params.sessionId;
  const state = healthStateMap.get(key);

  if (!state) {
    return { healthy: true }; // No tracking data, assume healthy
  }

  if (state.status === "idle") {
    return { healthy: true };
  }

  if (state.status === "stuck") {
    return { healthy: false, reason: "compaction stuck" };
  }

  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    return { healthy: false, reason: `max consecutive failures (${MAX_CONSECUTIVE_FAILURES})` };
  }

  const runningTime = Date.now() - state.startTime;
  if (runningTime > COMPACTION_STUCK_THRESHOLD_MS) {
    return { healthy: false, reason: `running too long (${Math.round(runningTime / 1000)}s)` };
  }

  return { healthy: true };
}

/**
 * Get health state for a session
 */
export function getCompactionHealthState(params: {
  sessionId: string;
  sessionKey?: string;
}): CompactionHealthState | undefined {
  const key = params.sessionKey ?? params.sessionId;
  return healthStateMap.get(key);
}

/**
 * Get all compaction health states
 */
export function getAllCompactionHealthStates(): Map<string, CompactionHealthState> {
  return new Map(healthStateMap);
}

/**
 * Check health of a specific compaction operation
 */
function checkCompactionHealth(key: string): void {
  const state = healthStateMap.get(key);
  if (!state || state.status !== "running") {
    return;
  }

  const runningTime = Date.now() - state.startTime;
  const idleTime = Date.now() - state.lastActivity;

  if (runningTime > COMPACTION_STUCK_THRESHOLD_MS) {
    state.status = "stuck";
    log.warn(
      `[compaction-health] DETECTED STUCK COMPACTION: sessionKey=${key}, ` +
        `runningTime=${Math.round(runningTime / 1000)}s, idleTime=${Math.round(idleTime / 1000)}s`,
    );

    // Emit diagnostic event for external monitoring
    emitCompactionStuckEvent(state);
  }
}

/**
 * Emit diagnostic event for stuck compaction
 */
function emitCompactionStuckEvent(state: CompactionHealthState): void {
  const key = state.sessionKey ?? state.sessionId;
  log.warn(
    `[compaction-diag] stuck compaction detected sessionKey=${key} ` +
      `startTime=${state.startTime} lastActivity=${state.lastActivity} ` +
      `attempt=${state.attemptCount} failures=${state.consecutiveFailures}`,
  );
}

/**
 * Clean up health check resources for a session
 */
function cleanupHealthCheck(key: string): void {
  const timer = healthCheckTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    healthCheckTimers.delete(key);
  }

  // Keep state for a while for debugging, then clean up
  setTimeout(() => {
    const state = healthStateMap.get(key);
    if (state && state.status !== "running") {
      healthStateMap.delete(key);
    }
  }, 60_000); // Clean up after 1 minute
}

/**
 * Reset all health tracking (for shutdown/restart scenarios)
 */
export function resetAllCompactionHealthTracking(): void {
  for (const [key, timer] of healthCheckTimers) {
    clearTimeout(timer);
    log.debug(`[compaction-health] Cleared timer for sessionKey=${key}`);
  }
  healthCheckTimers.clear();
  healthStateMap.clear();
  log.info("[compaction-health] Reset all health tracking");
}

/**
 * Get diagnostic summary of all compaction operations
 */
export function getCompactionHealthSummary(): {
  totalTracked: number;
  running: number;
  stuck: number;
  failed: number;
  idle: number;
} {
  const states = Array.from(healthStateMap.values());
  return {
    totalTracked: states.length,
    running: states.filter((s) => s.status === "running").length,
    stuck: states.filter((s) => s.status === "stuck").length,
    failed: states.filter((s) => s.status === "failed").length,
    idle: states.filter((s) => s.status === "idle").length,
  };
}
