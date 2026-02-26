import { diagnosticLogger as diag, logLaneDequeue, logLaneEnqueue } from "../logging/diagnostic.js";
import { CommandLane } from "./lanes.js";
import { queueBackend } from "./queue-backend.js";

export class CommandLaneClearedError extends Error {
  constructor(lane?: string) {
    super(lane ? `Command lane "${lane}" cleared` : "Command lane cleared");
    this.name = "CommandLaneClearedError";
  }
}

type LaneState = {
  lane: string;
  activeTaskIds: Set<number>;
  maxConcurrent: number;
  draining: boolean;
  generation: number;
};

export type TaskHandler<T = any> = (payload: T) => Promise<unknown>;

const handlers = new Map<string, TaskHandler>();

let isShuttingDown = false;

/**
 * Mark the command queue as shutting down. When set, active tasks will NOT be
 * resolved (marked COMPLETED) so that they remain in RUNNING state and can be
 * recovered on the next startup.
 */
export function markShuttingDown(): void {
  isShuttingDown = true;
}

export function isShuttingDownState(): boolean {
  return isShuttingDown;
}

// Ensure the flag is set as early as possible when the process receives a
// termination signal, BEFORE any other listener can trigger abort callbacks
// that cause handlers to return and resolve tasks.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.prependListener(sig, () => {
    isShuttingDown = true;
  });
}

export function registerCommandHandler<T>(taskType: string, handler: TaskHandler<T>) {
  if (handlers.has(taskType)) {
    diag.warn(`Command handler for task type "${taskType}" is being overwritten.`);
  }
  handlers.set(taskType, handler);
}

type ResolverEntry = {
  resolve: (val: unknown) => void;
  reject: (err: unknown) => void;
  warnAfterMs: number;
  enqueuedAt: number;
  lane: string;
  onWait?: (waitMs: number, queuedAhead: number) => void;
  originalPayload?: any;
};

const memoryResolvers = new Map<number, ResolverEntry>();

const lanes = new Map<string, LaneState>();
let nextMemoryTaskId = 1;

function getLaneState(lane: string): LaneState {
  const existing = lanes.get(lane);
  if (existing) {
    return existing;
  }
  const created: LaneState = {
    lane,
    activeTaskIds: new Set(),
    maxConcurrent: 1,
    draining: false,
    generation: 0,
  };
  lanes.set(lane, created);
  return created;
}

function completeTask(state: LaneState, memTaskId: number, taskGeneration: number): boolean {
  if (taskGeneration !== state.generation) {
    return false;
  }
  state.activeTaskIds.delete(memTaskId);
  return true;
}

function drainLane(lane: string) {
  const state = getLaneState(lane);
  if (state.draining) {
    return;
  }
  state.draining = true;
  const backend = queueBackend();

  const pump = () => {
    while (state.activeTaskIds.size < state.maxConcurrent) {
      const dbTask = backend.claimNextPendingTask(lane);
      if (!dbTask) {
        break;
      }

      const memTaskId = nextMemoryTaskId++;
      const taskGeneration = state.generation;
      state.activeTaskIds.add(memTaskId);

      const qAhead = backend.countQueueByStatus(lane, "PENDING");
      const resolvers = memoryResolvers.get(dbTask.id);

      if (resolvers) {
        const waitedMs = Date.now() - resolvers.enqueuedAt;
        if (waitedMs >= resolvers.warnAfterMs) {
          resolvers.onWait?.(waitedMs, qAhead);
          diag.warn(`lane wait exceeded: lane=${lane} waitedMs=${waitedMs} queueAhead=${qAhead}`);
        }
        logLaneDequeue(lane, waitedMs, qAhead);
      } else {
        logLaneDequeue(lane, Date.now() - dbTask.created_at, qAhead);
      }

      void (async () => {
        const startTime = Date.now();
        try {
          const handler = handlers.get(dbTask.task_type);
          if (!handler) {
            throw new Error(`No handler registered for task type: ${dbTask.task_type}`);
          }
          const parsedPayload = JSON.parse(dbTask.payload);
          const finalPayload = resolvers?.originalPayload ?? parsedPayload;
          const result = await handler(finalPayload);

          // Yield to the event loop so that any pending SIGINT/SIGTERM signal
          // handlers (which set isShuttingDown) get a chance to execute before
          // we resolve the task. Without this, the abort return from the handler
          // and resolveTask() can race in the same microtask queue.
          await new Promise((r) => setImmediate(r));

          // During shutdown, skip resolving so the task stays RUNNING.
          // On next startup, recoverRunningTasks() will detect and re-queue it.
          if (isShuttingDown) return;

          backend.resolveTask(dbTask.id, result);

          const completedCurrentGeneration = completeTask(state, memTaskId, taskGeneration);
          if (completedCurrentGeneration) {
            diag.debug(
              `lane task done: lane=${lane} durationMs=${Date.now() - startTime} active=${state.activeTaskIds.size} queued=${qAhead}`,
            );
            pump();
          }

          if (resolvers) {
            resolvers.resolve(result);
            memoryResolvers.delete(dbTask.id);
          }
        } catch (err) {
          // During shutdown, skip rejecting so the task stays RUNNING for recovery.
          if (isShuttingDown) return;

          backend.rejectTask(dbTask.id, String(err));

          const completedCurrentGeneration = completeTask(state, memTaskId, taskGeneration);
          const isProbeLane = lane.startsWith("auth-probe:") || lane.startsWith("session:probe-");
          if (!isProbeLane) {
            diag.error(
              `lane task error: lane=${lane} durationMs=${Date.now() - startTime} error="${String(err)}"`,
            );
          }
          if (completedCurrentGeneration) {
            pump();
          }

          if (resolvers) {
            resolvers.reject(err);
            memoryResolvers.delete(dbTask.id);
          }
        }
      })();
    }
    state.draining = false;
  };

  pump();
}

export function setCommandLaneConcurrency(lane: string, maxConcurrent: number) {
  const cleaned = lane.trim() || CommandLane.Main;
  const state = getLaneState(cleaned);
  state.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
  drainLane(cleaned);
}

export function enqueueCommandInLane<T>(
  lane: string,
  taskType: string,
  payload: any,
  opts?: {
    warnAfterMs?: number;
    onWait?: (waitMs: number, queuedAhead: number) => void;
  },
): Promise<T> {
  const cleaned = lane.trim() || CommandLane.Main;
  const warnAfterMs = opts?.warnAfterMs ?? 2_000;
  const backend = queueBackend();

  const dbId = backend.insertTask(cleaned, taskType, payload);

  return new Promise<T>((resolve, reject) => {
    memoryResolvers.set(dbId, {
      resolve: (val) => resolve(val as T),
      reject,
      warnAfterMs,
      enqueuedAt: Date.now(),
      lane: cleaned,
      onWait: opts?.onWait,
      originalPayload: payload,
    });

    const qSize = backend.countQueueByStatus(cleaned);
    logLaneEnqueue(cleaned, qSize);
    drainLane(cleaned);
  });
}

export function enqueueCommand<T>(
  taskType: string,
  payload: any,
  opts?: {
    warnAfterMs?: number;
    onWait?: (waitMs: number, queuedAhead: number) => void;
  },
): Promise<T> {
  return enqueueCommandInLane(CommandLane.Main, taskType, payload, opts);
}

export function getQueueSize(lane: string = CommandLane.Main) {
  const resolved = lane.trim() || CommandLane.Main;
  return queueBackend().countQueueByStatus(resolved);
}

export function getTotalQueueSize() {
  return queueBackend().countTotalQueue();
}

export function clearCommandLane(lane: string = CommandLane.Main) {
  const cleaned = lane.trim() || CommandLane.Main;
  const backend = queueBackend();

  // Collect IDs before deletion so we can reject their in-memory Promises
  const pendingIds = backend.getPendingTaskIdsForLane(cleaned);
  const removedCount = backend.clearLaneTasks(cleaned);

  const clearError = new CommandLaneClearedError(cleaned);
  for (const dbId of pendingIds) {
    const entry = memoryResolvers.get(dbId);
    if (entry) {
      entry.reject(clearError);
      memoryResolvers.delete(dbId);
    }
  }

  return removedCount;
}

export function scheduleLaneDrainByName(lane: string): void {
  getLaneState(lane);
  drainLane(lane);
}

export function resetAllLanes(): void {
  const backend = queueBackend();
  const affectedLanes = backend.recoverRunningTasks();
  const pendingLanes = backend.getPendingLanes();

  const lanesToDrain: string[] = Array.from(
    new Set([...affectedLanes, ...pendingLanes, ...Array.from(lanes.keys())]),
  );

  for (const state of lanes.values()) {
    state.generation += 1;
    state.activeTaskIds.clear();
    state.draining = false;
  }

  for (const lane of lanesToDrain) {
    getLaneState(lane);
    drainLane(lane);
  }
}

export function getActiveTaskCount(): number {
  let total = 0;
  for (const s of lanes.values()) {
    total += s.activeTaskIds.size;
  }
  return total;
}

export function waitForActiveTasks(timeoutMs: number): Promise<{ drained: boolean }> {
  const POLL_INTERVAL_MS = 50;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const check = () => {
      if (!queueBackend().hasActiveTasks()) {
        resolve({ drained: true });
        return;
      }
      if (Date.now() >= deadline) {
        resolve({ drained: false });
        return;
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };
    check();
  });
}

/**
 * Reset all in-memory state (handlers, resolvers, lanes). Test-only.
 */
export function _resetForTests(): void {
  handlers.clear();
  memoryResolvers.clear();
  lanes.clear();
  nextMemoryTaskId = 1;
  isShuttingDown = false;
}
