/**
 * Utilities for validating and normalizing SSH/SCP remote host tokens.
 * Accepts only `host` or `user@host` — no spaces, options, or shell metacharacters.
 */

const SAFE_SCP_HOST_RE = /^[a-zA-Z0-9._@-]+$/;

/**
 * Returns true if the value is a safe SSH host token (`host` or `user@host`).
 * Rejects anything containing spaces, SSH flags, or shell metacharacters.
 */
export function isSafeScpRemoteHost(host: string | undefined): boolean {
  if (!host || typeof host !== "string") return false;
  const trimmed = host.trim();
  if (!trimmed) return false;
  // Must match only safe characters: alphanumeric, dots, dashes, underscores, @
  if (!SAFE_SCP_HOST_RE.test(trimmed)) return false;
  // At most one @ (user@host)
  const atCount = (trimmed.match(/@/g) ?? []).length;
  if (atCount > 1) return false;
  return true;
}

/**
 * Returns the normalized host string if safe, or undefined if invalid.
 */
export function normalizeScpRemoteHost(host: string | undefined): string | undefined {
  if (!isSafeScpRemoteHost(host)) return undefined;
  return (host as string).trim();
}
