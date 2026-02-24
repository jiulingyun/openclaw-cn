/**
 * Safe module loader for hook handlers.
 *
 * Loads an ES module from a workspace-relative path, enforcing containment
 * within the base directory and resolving the requested export.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

export type LoadModuleExportResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Load a module from a workspace-relative path and return the named export.
 *
 * Enforces that the resolved path stays within `baseDir`.
 */
export async function loadModuleExport<T = unknown>(params: {
  baseDir: string;
  modulePath: string;
  exportName?: string;
  cacheBust?: boolean;
}): Promise<LoadModuleExportResult<T>> {
  const { baseDir, exportName, cacheBust } = params;
  const rawModule = params.modulePath.trim();

  if (!rawModule) {
    return { ok: false, error: "module path is empty" };
  }

  if (path.isAbsolute(rawModule)) {
    return {
      ok: false,
      error: `module path must be workspace-relative (got absolute path): ${rawModule}`,
    };
  }

  const base = path.resolve(baseDir);
  const resolvedPath = path.resolve(base, rawModule);
  const rel = path.relative(base, resolvedPath);

  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return {
      ok: false,
      error: `module path must stay within baseDir: ${rawModule}`,
    };
  }

  try {
    const url = pathToFileURL(resolvedPath).href;
    const importUrl = cacheBust ? `${url}?t=${Date.now()}` : url;
    const mod = (await import(importUrl)) as Record<string, unknown>;

    const name = exportName ?? "default";
    const exported = mod[name];

    if (exported === undefined) {
      return { ok: false, error: `module does not export '${name}': ${rawModule}` };
    }

    return { ok: true, value: exported as T };
  } catch (err) {
    return {
      ok: false,
      error: `failed to load module ${rawModule}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
