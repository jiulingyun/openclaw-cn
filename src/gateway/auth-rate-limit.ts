import { isLoopbackAddress } from "./net.js";

export interface RateLimitConfig {
  /** Window in milliseconds to count failures.  @default 60_000 */
  windowMs?: number;
  /** Max failures allowed before locking out within the window.  @default 20 */
  maxAttempts?: number;
  /** Duration in milliseconds to lock out after maxAttempts failures.  @default windowMs */
  lockoutMs?: number;
  /** Exempt loopback (localhost) addresses from rate limiting.  @default true */
  exemptLoopback?: boolean;
  /** Background prune interval in milliseconds; set <= 0 to disable auto-prune.  @default 60_000 */
  pruneIntervalMs?: number;
}

export const AUTH_RATE_LIMIT_SCOPE_DEFAULT = "default";
export const AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET = "shared-secret";
export const AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN = "device-token";
export const AUTH_RATE_LIMIT_SCOPE_HOOK_AUTH = "hook-auth";

export interface RateLimitEntry {
  /** Timestamps (epoch ms) of recent failed attempts inside the window. */
  attempts: number[];
  /** Epoch ms when the lockout expires, or 0 if not locked out. */
  lockedUntil: number;
}

export interface AuthRateLimiter {
  /**
   * Check if a client key is currently rate-limited.
   * Returns `{ throttled: true, retryAfterSeconds }` if over limit.
   */
  check(clientKey: string, nowMs?: number): { throttled: boolean; retryAfterSeconds?: number };
  /** Record a failed attempt for a client key. */
  record(clientKey: string, nowMs?: number): { throttled: boolean; retryAfterSeconds?: number };
  /** Clear the failure record for a client key (e.g., on successful auth). */
  clear(clientKey: string): void;
  /** Dispose any background timers. */
  dispose(): void;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 20;
const DEFAULT_PRUNE_INTERVAL_MS = 60_000;
const MAX_TRACK_SIZE = 2048;

export function createAuthRateLimiter(config?: RateLimitConfig): AuthRateLimiter {
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const lockoutMs = config?.lockoutMs ?? windowMs;
  const maxAttempts = config?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const exemptLoopback = config?.exemptLoopback !== false;
  const pruneIntervalMs = config?.pruneIntervalMs ?? DEFAULT_PRUNE_INTERVAL_MS;

  const entries = new Map<string, RateLimitEntry>();

  function prune(nowMs: number) {
    for (const [key, entry] of entries) {
      const expired = nowMs - (entry.attempts[0] ?? nowMs) >= windowMs && entry.lockedUntil <= nowMs;
      if (expired && entry.attempts.length === 0) {
        entries.delete(key);
      } else if (entry.attempts.every((t) => nowMs - t >= windowMs) && entry.lockedUntil <= nowMs) {
        entries.delete(key);
      }
    }
  }

  let pruneTimer: ReturnType<typeof setInterval> | null = null;
  if (pruneIntervalMs > 0) {
    pruneTimer = setInterval(() => prune(Date.now()), pruneIntervalMs);
    // Allow the process to exit even if the timer is still running
    (pruneTimer as unknown as { unref?: () => void }).unref?.();
  }

  function getOrCreate(clientKey: string): RateLimitEntry {
    let entry = entries.get(clientKey);
    if (!entry) {
      if (entries.size >= MAX_TRACK_SIZE) {
        entries.clear();
      }
      entry = { attempts: [], lockedUntil: 0 };
      entries.set(clientKey, entry);
    }
    return entry;
  }

  function check(clientKey: string, nowMs = Date.now()): { throttled: boolean; retryAfterSeconds?: number } {
    if (exemptLoopback && isLoopbackAddress(clientKey)) {
      return { throttled: false };
    }
    const entry = entries.get(clientKey);
    if (!entry) return { throttled: false };

    if (entry.lockedUntil > nowMs) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - nowMs) / 1000);
      return { throttled: true, retryAfterSeconds };
    }

    // Prune old attempts outside the window
    const cutoff = nowMs - windowMs;
    entry.attempts = entry.attempts.filter((t) => t > cutoff);

    if (entry.attempts.length >= maxAttempts) {
      entry.lockedUntil = nowMs + lockoutMs;
      const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
      return { throttled: true, retryAfterSeconds };
    }

    return { throttled: false };
  }

  function record(clientKey: string, nowMs = Date.now()): { throttled: boolean; retryAfterSeconds?: number } {
    if (exemptLoopback && isLoopbackAddress(clientKey)) {
      return { throttled: false };
    }
    const entry = getOrCreate(clientKey);

    if (entry.lockedUntil > nowMs) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - nowMs) / 1000);
      return { throttled: true, retryAfterSeconds };
    }

    // Prune old attempts outside the window
    const cutoff = nowMs - windowMs;
    entry.attempts = entry.attempts.filter((t) => t > cutoff);
    entry.attempts.push(nowMs);

    if (entry.attempts.length >= maxAttempts) {
      entry.lockedUntil = nowMs + lockoutMs;
      const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
      return { throttled: true, retryAfterSeconds };
    }

    return { throttled: false };
  }

  function clear(clientKey: string) {
    entries.delete(clientKey);
  }

  function dispose() {
    if (pruneTimer) {
      clearInterval(pruneTimer);
      pruneTimer = null;
    }
  }

  return { check, record, clear, dispose };
}
