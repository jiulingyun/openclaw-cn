// Centralized gateway method-to-scope mappings.
// Used by both server-side authorization (server-methods.ts) and client-side
// scope resolution (call.ts callGatewayScoped) to keep them in sync.

export const GATEWAY_SCOPE_ADMIN = "operator.admin";
export const GATEWAY_SCOPE_READ = "operator.read";
export const GATEWAY_SCOPE_WRITE = "operator.write";
export const GATEWAY_SCOPE_APPROVALS = "operator.approvals";
export const GATEWAY_SCOPE_PAIRING = "operator.pairing";

export const APPROVAL_METHODS = new Set(["exec.approval.request", "exec.approval.resolve"]);

export const NODE_ROLE_METHODS = new Set(["node.invoke.result", "node.event", "skills.bins"]);

export const PAIRING_METHODS = new Set([
  "node.pair.request",
  "node.pair.list",
  "node.pair.approve",
  "node.pair.reject",
  "node.pair.verify",
  "device.pair.list",
  "device.pair.approve",
  "device.pair.reject",
  "device.token.rotate",
  "device.token.revoke",
  "node.rename",
]);

export const ADMIN_METHOD_PREFIXES = ["exec.approvals."];

export const READ_METHODS = new Set([
  "health",
  "logs.tail",
  "channels.status",
  "status",
  "usage.status",
  "usage.cost",
  "tts.status",
  "tts.providers",
  "models.list",
  "agents.list",
  "agent.identity.get",
  "skills.status",
  "voicewake.get",
  "sessions.list",
  "sessions.preview",
  "cron.list",
  "cron.status",
  "cron.runs",
  "system-presence",
  "last-heartbeat",
  "node.list",
  "node.describe",
  "chat.history",
]);

export const WRITE_METHODS = new Set([
  "send",
  "agent",
  "agent.wait",
  "wake",
  "talk.mode",
  "tts.enable",
  "tts.disable",
  "tts.convert",
  "tts.setProvider",
  "voicewake.set",
  "node.invoke",
  "chat.send",
  "chat.abort",
]);

/**
 * Resolve the minimum required scopes for a given gateway method.
 * Used by callGatewayScoped to default non-CLI callers to least-privilege scopes.
 */
export function resolveMethodScopes(method: string): string[] {
  if (NODE_ROLE_METHODS.has(method)) return [];
  if (APPROVAL_METHODS.has(method)) return [GATEWAY_SCOPE_APPROVALS];
  if (PAIRING_METHODS.has(method)) return [GATEWAY_SCOPE_PAIRING];
  if (READ_METHODS.has(method)) return [GATEWAY_SCOPE_READ];
  if (WRITE_METHODS.has(method)) return [GATEWAY_SCOPE_WRITE];
  // Default to admin for unknown/admin-only methods
  return [GATEWAY_SCOPE_ADMIN];
}
