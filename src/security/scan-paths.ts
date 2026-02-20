import fs from "node:fs";
import path from "node:path";

/**
 * Returns true if `targetPath` is inside `baseDir` (no symlink resolution).
 * Uses lexical path comparison only.
 */
export function isPathInside(baseDir: string, targetPath: string): boolean {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(targetPath);
  if (resolved === base) return true;
  const relative = path.relative(base, resolved);
  // `startsWith("..")` catches both POSIX (`../`) and Windows (`..\\`) forms since
  // path.relative always uses the platform separator, and `..` appears at the start
  // of any path that traverses above the base.
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Returns true if `targetPath` stays inside `baseDir` after symlink resolution.
 * When `requireRealpath` is true (default false), both paths are realpath-resolved
 * and the symlink-resolved target must remain within the realpath of the base.
 */
export function isPathInsideWithRealpath(
  baseDir: string,
  targetPath: string,
  opts: { requireRealpath?: boolean } = {},
): boolean {
  if (!opts.requireRealpath) {
    return isPathInside(baseDir, targetPath);
  }
  try {
    const realBase = fs.realpathSync(baseDir);
    const realTarget = fs.realpathSync(targetPath);
    if (realTarget === realBase) return true;
    const relative = path.relative(realBase, realTarget);
    return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
  } catch {
    // If realpath fails (symlink target doesn't exist or access denied), reject.
    return false;
  }
}
