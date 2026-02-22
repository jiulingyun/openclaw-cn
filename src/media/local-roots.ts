import os from "node:os";
import path from "node:path";

import type { ClawdbotConfig } from "../config/config.js";
import { listAgentIds, resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { resolveSandboxConfigForAgent } from "../agents/sandbox/config.js";
import { resolveConfigDir, resolveUserPath } from "../utils.js";

export function resolveMediaLocalRoots(cfg: ClawdbotConfig): string[] {
  const roots = new Set<string>();
  roots.add(path.join(resolveConfigDir(), "media"));

  for (const agentId of listAgentIds(cfg)) {
    roots.add(resolveAgentWorkspaceDir(cfg, agentId));
    const sandboxRoot = resolveSandboxConfigForAgent(cfg, agentId).workspaceRoot;
    if (sandboxRoot) {
      roots.add(resolveUserPath(sandboxRoot));
    }
  }

  return Array.from(roots);
}

export function getAgentScopedMediaLocalRoots(
  cfg: ClawdbotConfig,
  agentId?: string,
): readonly string[] {
  const configDir = resolveConfigDir();
  const roots: string[] = [
    os.tmpdir(),
    path.join(configDir, "media"),
    path.join(configDir, "agents"),
    path.join(configDir, "workspace"),
    path.join(configDir, "sandboxes"),
  ];
  if (!agentId?.trim()) {
    return roots;
  }
  const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
  if (!workspaceDir) {
    return roots;
  }
  const normalizedWorkspaceDir = path.resolve(workspaceDir);
  if (!roots.includes(normalizedWorkspaceDir)) {
    roots.push(normalizedWorkspaceDir);
  }
  return roots;
}
