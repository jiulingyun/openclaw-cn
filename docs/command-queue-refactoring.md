# Command Queue Persistence Refactoring

> **Status**: Completed (v2.0 configuration iteration)  
> **Date**: 2026-02-22  
> **Scope**: `src/process/command-queue.ts`, `src/process/queue-db.ts`, `src/process/queue-memory.ts`, `src/process/queue-backend.ts`, `src/agents/handlers.ts`, `src/cli/program/preaction.ts`, `src/config/types.openclaw.ts`, and all business code calling `enqueueCommand` / `enqueueCommandInLane`

---

## 1. Background & Motivation

### 1.1 Problem Statement

The original Command Queue used a **pure in-memory queue** (`Array<QueueEntry>`) implementation. Tasks were enqueued as **closure functions**, meaning that if the process crashed, was hot-restarted via SIGUSR1, or terminated due to OOM, all pending or in-flight tasks would be **permanently lost** with no possibility of recovery.

### 1.2 Design Goals

| Goal                    | Description                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Task Persistence**    | In persistent mode, all enqueued tasks are stored in a local SQLite database and can be recovered after process restarts |
| **Crash Recovery**      | On process restart, automatically reset interrupted `RUNNING` tasks to `PENDING` and re-execute them                     |
| **Serializable Tasks**  | Tasks are no longer closure functions but described by `taskType + JSON payload`, naturally supporting disk persistence  |
| **Result Retrieval**    | Task execution results are persisted to the DB and can be queried via `getTaskResult(taskId)` after restart              |
| **Configurable**        | Support switching queue mode (`memory` / `persistent`) via `openclaw.json` or environment variables                      |
| **Backward Compatible** | Default `memory` mode preserves original behavior; Lane concurrency model, `onWait` callback, `clearCommandLane`, etc.   |

---

## 2. Architecture Overview

### 2.1 Architecture Before Refactoring

```
┌─────────────────────────────────────────────────┐
│          Business Callers (run.ts / compact.ts)  │
│   enqueueCommand(() => runAgent(params))         │
└────────────────────┬────────────────────────────┘
                     │  Closure function (not serializable)
                     ▼
┌─────────────────────────────────────────────────┐
│           Command Queue (In-Memory)              │
│                                                   │
│  LaneState {                                      │
│    queue: QueueEntry[]  ← closure + resolve/reject│
│    activeTaskIds: Set<number>                     │
│    maxConcurrent: number                          │
│  }                                                │
│                                                   │
│  pump() → entry.task() → entry.resolve(result)   │
└─────────────────────────────────────────────────┘
         ⚠️ Process exit → All tasks lost
```

### 2.2 Architecture After Refactoring

```
┌─────────────────────────────────────────────────┐
│          Business Callers (run.ts / compact.ts)  │
│  enqueueCommand("EMBEDDED_PI_RUN", params)       │
└────────────────────┬────────────────────────────┘
                     │  taskType (string) + payload (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│         Command Queue Manager (In-Memory Sched.) │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │        queue-backend.ts (Unified Router)  │   │
│  │  mode = 'memory':     → queue-memory.ts  │   │
│  │  mode = 'persistent': → queue-db.ts      │   │
│  └──────────────────────────────────────────┘   │
│         │                                        │
│         ▼                                        │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │ insertTask() │───▶│ Backend (Memory/SQLite) │  │
│  │ (enqueue)    │    │  status = 'PENDING'    │  │
│  └──────────────┘    └────────────────────────┘  │
│         │                        │               │
│         ▼                        │               │
│  memoryResolvers.set(dbId, {     │               │
│    resolve, reject, ...          │               │
│  })                              │               │
│         │                        │               │
│         ▼                        ▼               │
│  ┌──────────────────────────────────────────┐   │
│  │             drainLane(lane)                │   │
│  │  claimNextPendingTask(lane) ← atomic txn  │   │
│  │  status: PENDING → RUNNING                │   │
│  │                                            │   │
│  │  handler = handlers.get(task_type)         │   │
│  │  result = await handler(JSON.parse(payload))│  │
│  │                                            │   │
│  │  resolveTask(dbId, result)                 │   │
│  │    → status = 'COMPLETED'                  │   │
│  │    → result written to backend (queryable  │   │
│  │      in persistent mode)                   │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │       Task Handler Registry               │   │
│  │  "EMBEDDED_PI_RUN"    → runEmbeddedPi…   │   │
│  │  "EMBEDDED_PI_COMPACT"→ compactEmbed…    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
  memory mode:     Zero dependencies, tasks lost on exit
  persistent mode: PENDING tasks stored in SQLite
                   On restart: RUNNING → PENDING, auto-recover
                   Results queryable via getTaskResult()
```

---

## 3. Configuration

### 3.1 Config File (`~/.openclaw/openclaw.json`)

```json5
{
  queue: {
    // Queue storage mode, options: "memory" (default), "persistent"
    mode: "persistent",

    // Custom SQLite database path (only effective in persistent mode)
    // Default: ~/.openclaw/command-queue.db
    dbPath: "~/.openclaw/command-queue.db",

    // Whether to auto-recover RUNNING tasks on startup (default: true)
    autoRecover: true,
  },
}
```

### 3.2 Environment Variables (higher priority than config file)

| Environment Variable          | Description                              | Default                        |
| ----------------------------- | ---------------------------------------- | ------------------------------ |
| `OPENCLAW_QUEUE_MODE`         | Queue mode: `memory` / `persistent`      | `memory`                       |
| `OPENCLAW_QUEUE_DB_PATH`      | Custom database file path                | `~/.openclaw/command-queue.db` |
| `OPENCLAW_QUEUE_AUTO_RECOVER` | Auto-recover on startup (`true`/`false`) | `true`                         |

### 3.3 CLI Switch Example

```bash
# Temporarily enable persistent mode via environment variable
OPENCLAW_QUEUE_MODE=persistent openclaw gateway start

# Permanently enable (write to config file)
cat >> ~/.openclaw/openclaw.json << 'EOF'
{
  "queue": {
    "mode": "persistent"
  }
}
EOF
```

### 3.4 Priority Rules

```
Environment variable > openclaw.json config > Default value (memory)
```

### 3.5 TypeScript Type Definition

```typescript
// src/config/types.openclaw.ts
export type ClawdbotConfig = {
  // ... other fields ...

  /** Command queue configuration. */
  queue?: {
    mode?: "memory" | "persistent";
    dbPath?: string;
    autoRecover?: boolean;
  };
};
```

---

## 4. Core Module Reference

### 4.1 `queue-backend.ts` — Unified Backend Router (New)

**Responsibility**: Routes all queue operations to the correct backend implementation based on the runtime `queue.mode` configuration.

```typescript
import * as memoryBackend from "./queue-memory.js";

let currentMode: QueueMode = "memory"; // Default: in-memory mode
let persistentBackend: QueueBackendAPI | null = null;

// Called at startup to set the mode based on configuration
export function setQueueMode(mode: QueueMode, dbPath?: string): void;

// Get the current backend instance
export function queueBackend(): QueueBackendAPI;
```

**Auto-fallback**: If the `better-sqlite3` native module is unavailable (e.g., in a pure JS environment), it will automatically fall back to memory mode with a warning.

### 4.2 `queue-memory.ts` — In-Memory Backend (New)

**Responsibility**: Provides an interface identical to `queue-db.ts`, but data exists only in process memory.

This is the default backend with **zero external dependencies**; behavior is identical to the pre-refactoring queue (data lost on process exit).

### 4.3 `queue-db.ts` — SQLite Persistent Backend

**Responsibility**: Provides SQLite-based persistent storage, loaded only in `persistent` mode.

#### Database Schema

```sql
CREATE TABLE IF NOT EXISTS task_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lane        TEXT    NOT NULL,
  task_type   TEXT    NOT NULL,
  payload     TEXT    NOT NULL,       -- JSON serialized
  status      TEXT    NOT NULL,       -- PENDING | RUNNING | COMPLETED | FAILED
  error_msg   TEXT,
  result      TEXT,                   -- Task execution result (JSON serialized)
  retry_count INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,       -- Unix millisecond timestamp
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_queue_lane_status ON task_queue(lane, status);
```

#### Key Functions

| Function                              | Description                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| `initQueueDB(customDbPath?)`          | Lazy-initialize DB connection, supports custom path, enables WAL   |
| `insertTask(lane, taskType, payload)` | Insert a `PENDING` task record                                     |
| `claimNextPendingTask(lane)`          | **Transactionally** claim the oldest PENDING task and mark RUNNING |
| `resolveTask(id, result?)`            | Mark `COMPLETED` and **store execution result**                    |
| `rejectTask(id, errorMsg)`            | Mark `FAILED` and record error message                             |
| `getTaskResult(id)`                   | **Query task result** (available even after process restart)       |
| `getRecentResults(taskType, limit?)`  | Query the latest N completed tasks of a given type                 |
| `recoverRunningTasks()`               | `RUNNING` → `PENDING`, returns list of affected lanes              |
| `clearLaneTasks(lane)`                | Delete all PENDING tasks for a specified lane                      |
| `hasActiveTasks()`                    | Whether any RUNNING tasks exist                                    |

#### Database File Location

```
~/.openclaw/command-queue.db    (default path)
```

Can be customized via `queue.dbPath` or `OPENCLAW_QUEUE_DB_PATH`.

### 4.4 `command-queue.ts` — Queue Scheduling Core

**Responsibility**: Manages Lane state, task scheduling, Handler invocation, and bridges with in-memory Resolvers.

All backend operations are routed through `queueBackend()`, abstracting away whether the underlying storage is memory or SQLite.

#### API Comparison (Before vs After)

```typescript
// ❌ Before (closure-based)
enqueueCommandInLane<T>(
  lane: string,
  task: () => Promise<T>,              // Non-serializable closure
  opts?: { warnAfterMs?; onWait? }
): Promise<T>

// ✅ After (serializable)
enqueueCommandInLane<T>(
  lane: string,
  taskType: string,                    // Task type identifier
  payload: any,                        // JSON-serializable parameters
  opts?: { warnAfterMs?; onWait? }
): Promise<T>
```

### 4.5 `handlers.ts` — Task Handler Registry

```typescript
export function initializeAgentHandlers() {
  registerCommandHandler("EMBEDDED_PI_RUN", async (payload) => {
    return runEmbeddedPiAgent(payload);
  });

  registerCommandHandler("EMBEDDED_PI_COMPACT", async (payload) => {
    return compactEmbeddedPiSessionDirect(payload);
  });
}
```

### 4.6 `preaction.ts` — Startup Initialization

```typescript
// Initialize command queue mode
// Priority: environment variable > openclaw.json > default (memory)
const cfg = loadConfig();
const queueConfig = cfg?.queue;
const queueMode = process.env.OPENCLAW_QUEUE_MODE?.trim() || queueConfig?.mode || "memory";

setQueueMode(queueMode as "memory" | "persistent", customDbPath);

if (queueMode === "persistent") {
  initializeAgentHandlers();
  // Auto-recover RUNNING tasks
  if (autoRecover) {
    const affectedLanes = queueBackend().recoverRunningTasks();
    if (affectedLanes.length > 0) {
      resetAllLanes();
    }
  }
}
```

---

## 5. Result Retrieval Mechanism

### 5.1 Overview

In persistent mode, task execution results are simultaneously written to the SQLite `result` field. Even if the original Promise is lost after a process restart, results can be queried via `getTaskResult(taskId)` or `getRecentResults(taskType)`.

### 5.2 Usage Example

```typescript
import { queueBackend } from "./process/queue-backend.js";

// The taskId is obtained at enqueue time (returned by the underlying insertTask)
// Callers can query results by this id after a restart
const result = queueBackend().getTaskResult(taskId);
if (result) {
  if (result.status === "COMPLETED") {
    console.log("Task result:", result.result);
  } else if (result.status === "FAILED") {
    console.log("Task failed:", result.error_msg);
  }
}

// Batch query recent results of a specific task type
const recentRuns = queueBackend().getRecentResults("EMBEDDED_PI_RUN", 10);
```

### 5.3 Result Storage Format

```json
{
  "id": 42,
  "status": "COMPLETED",
  "result": { "sessionId": "abc123", "tokensUsed": 1500 },
  "error_msg": null,
  "created_at": 1708646400000
}
```

---

## 6. Task State Machine

```
                    ┌──────────┐
    insertTask() ──▶│  PENDING  │
                    └────┬─────┘
                         │
          claimNextPendingTask() (atomic txn)
                         │
                    ┌────▼─────┐
                    │  RUNNING  │
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         handler success       handler failure
              │                     │
        ┌─────▼─────┐        ┌─────▼────┐
        │ COMPLETED  │        │  FAILED   │
        │ + result   │        │ + error   │
        └───────────┘        └──────────┘

    Special path: process crash
        RUNNING ──recoverRunningTasks()──▶ PENDING (re-consumed)

    Result query (persistent mode):
        COMPLETED/FAILED ──getTaskResult(id)──▶ { status, result, error_msg }
```

---

## 7. New Dependencies

| Package                 | Version   | Purpose          | Required                  |
| ----------------------- | --------- | ---------------- | ------------------------- |
| `better-sqlite3`        | `^12.6.2` | SQLite engine    | Only in `persistent` mode |
| `@types/better-sqlite3` | `^7.6.13` | TypeScript types | Development only          |

> **Note**: `memory` mode (default) does not depend on any native modules.

---

## 8. Changed Files

| File                                          | Operation     | Description                                                 |
| --------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `src/process/queue-backend.ts`                | **Added**     | Unified backend router (memory/persistent switching)        |
| `src/process/queue-memory.ts`                 | **Added**     | In-memory backend implementation (default, zero-dependency) |
| `src/process/queue-db.ts`                     | **Added**     | SQLite persistent backend with `result` field and query API |
| `src/agents/handlers.ts`                      | **Added**     | Task handler registry                                       |
| `src/process/command-queue.ts`                | **Rewritten** | Core queue logic, routed via `queueBackend()`               |
| `src/config/types.openclaw.ts`                | **Modified**  | Added `queue` config section definition                     |
| `src/config/types.clawdbot.ts`                | **Modified**  | Synced `queue` config section                               |
| `src/agents/pi-embedded-runner/run.ts`        | **Modified**  | Calling convention changed from closure to taskType+payload |
| `src/agents/pi-embedded-runner/compact.ts`    | **Modified**  | Same as above                                               |
| `src/agents/pi-embedded-runner/run/params.ts` | **Modified**  | `enqueue` type signature updated                            |
| `src/cli/program/preaction.ts`                | **Modified**  | Read queue config, initialize backend mode                  |
| `package.json`                                | **Modified**  | Added `better-sqlite3` dependency                           |

---

## 9. Testing

### 9.1 TypeScript Compilation Check

```bash
pnpm tsc --noEmit
# ✅ Should pass with 0 errors
```

### 9.2 Integration Test: Persistence Verification

```bash
# 1. Start the application in persistent mode
OPENCLAW_QUEUE_MODE=persistent openclaw gateway start

# 2. Trigger an Agent request

# 3. Verify the database file was created
ls -la ~/.openclaw/command-queue.db

# 4. Inspect database contents (including the result field)
sqlite3 ~/.openclaw/command-queue.db \
  "SELECT id, lane, task_type, status, result FROM task_queue ORDER BY id DESC LIMIT 10;"

# 5. Verify task results
sqlite3 ~/.openclaw/command-queue.db \
  "SELECT status, COUNT(*) FROM task_queue GROUP BY status;"
```

### 9.3 Crash Recovery Test

```bash
# 1. Start the application in persistent mode
OPENCLAW_QUEUE_MODE=persistent openclaw gateway start

# 2. Trigger a long-running task

# 3. Force-kill the process
kill -9 <PID>

# 4. Check for RUNNING records
sqlite3 ~/.openclaw/command-queue.db "SELECT * FROM task_queue WHERE status = 'RUNNING';"

# 5. Restart the application
OPENCLAW_QUEUE_MODE=persistent openclaw gateway start

# 6. Verify recovery
sqlite3 ~/.openclaw/command-queue.db "SELECT id, status, result FROM task_queue ORDER BY updated_at DESC LIMIT 5;"
```

### 9.4 Result Query Test

```bash
# Query a specific task's result
sqlite3 ~/.openclaw/command-queue.db \
  "SELECT id, status, json(result), error_msg FROM task_queue WHERE id = 42;"

# Query recent EMBEDDED_PI_RUN results
sqlite3 ~/.openclaw/command-queue.db \
  "SELECT id, status, json(result) FROM task_queue WHERE task_type = 'EMBEDDED_PI_RUN' AND status = 'COMPLETED' ORDER BY updated_at DESC LIMIT 5;"
```

### 9.5 Memory Mode Verification (Default Behavior)

```bash
# Without any queue configuration, verify default memory mode works correctly
openclaw gateway start

# Verify no SQLite file is created
test ! -f ~/.openclaw/command-queue.db && echo "OK: No DB file created in memory mode"
```

---

## 10. Caveats & Known Limitations

### 10.1 Limitations

1. **Result retrieval timeliness**: In persistent mode, task results are queryable after being written to the DB. However, if the original caller's Promise is lost after a restart, results must be actively queried via `getTaskResult(taskId)` (polling or event-driven). A future enhancement could implement a Watch / Pub-Sub push mechanism.

2. **clearCommandLane granularity**: Currently `clearCommandLane` deletes PENDING tasks for a given lane, but the in-memory Promise reject logic is not fully wired through.

3. **SQLite is a local single-machine solution**: Does not support distributed queues across machines.

### 10.2 Performance Considerations

- **WAL mode**: The database uses `journal_mode = WAL` for better read/write concurrency.
- **Indexing**: A composite index on `(lane, status)` is created.
- **Transaction atomicity**: `claimNextPendingTask` uses transactions to guarantee atomicity.
- **Lazy loading**: `better-sqlite3` is only loaded in `persistent` mode; memory mode has zero overhead.

### 10.3 Adding New Task Types

1. Add `registerCommandHandler('YOUR_TYPE', handler)` in `src/agents/handlers.ts`
2. Call `enqueueCommand('YOUR_TYPE', payload)` in your business code
3. Ensure `payload` is a plain JSON-serializable data object

---

## 11. FAQ

**Q: What is the default mode? Will it affect existing users?**  
A: The default is `memory` mode, which behaves identically to the pre-refactoring implementation. Existing users are not affected at all; SQLite is only enabled when `queue.mode = "persistent"` is explicitly configured.

**Q: Why SQLite instead of Redis?**  
A: SQLite is an embedded database that requires no additional service process, resulting in zero deployment dependencies.

**Q: Can I retrieve task results after a process restart?**  
A: Yes, in persistent mode. Query results stored in the DB via `getTaskResult(taskId)`. In memory mode, results are lost when the process exits.

**Q: `better-sqlite3` uses a synchronous API. Will it block the Event Loop?**  
A: Individual operations typically complete in microseconds. It is only loaded in persistent mode.

**Q: Can the payload contain functions?**  
A: No. The payload is serialized via `JSON.stringify`; ensure it is a plain data object.

**Q: Can recovered tasks be executed twice?**  
A: Theoretically, yes. Business handlers should be designed to be **idempotent**.

**Q: Can I switch modes at runtime?**  
A: Not recommended. The mode is set once at startup via preaction. To switch, modify the configuration and restart the application.
