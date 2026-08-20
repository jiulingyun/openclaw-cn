import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isNotFoundPathError, isPathInside } from "../infra/path-guards.js";

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const HTTP_URL_RE = /^https?:\/\//i;
const DATA_URL_RE = /^data:/i;

function normalizeUnicodeSpaces(str: string): string {
  return str.replace(UNICODE_SPACES, " ");
}

function expandPath(filePath: string): string {
  const normalized = normalizeUnicodeSpaces(filePath);
  if (normalized === "~") {
    return os.homedir();
  }
  if (normalized.startsWith("~/")) {
    return os.homedir() + normalized.slice(1);
  }
  return normalized;
}

function resolveToCwd(filePath: string, cwd: string): string {
  const expanded = expandPath(filePath);
  if (path.isAbsolute(expanded)) {
    return expanded;
  }
  return path.resolve(cwd, expanded);
}

export function resolveSandboxInputPath(filePath: string, cwd: string): string {
  return resolveToCwd(filePath, cwd);
}

export function resolveSandboxPath(params: { filePath: string; cwd: string; root: string }): {
  resolved: string;
  relative: string;
} {
  const resolved = resolveSandboxInputPath(params.filePath, params.cwd);
  const rootResolved = path.resolve(params.root);
  const relative = path.relative(rootResolved, resolved);
  if (!relative || relative === "") {
    return { resolved, relative: "" };
  }
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes sandbox root (${shortPath(rootResolved)}): ${params.filePath}`);
  }
  return { resolved, relative };
}

export async function assertSandboxPath(params: {
  filePath: string;
  cwd: string;
  root: string;
  allowFinalSymlink?: boolean;
}) {
  const resolved = resolveSandboxPath(params);
  await assertNoSymlinkEscape(resolved.relative, path.resolve(params.root), {
    allowFinalSymlink: params.allowFinalSymlink,
  });
  return resolved;
}

export function assertMediaNotDataUrl(media: string): void {
  const raw = media.trim();
  if (DATA_URL_RE.test(raw)) {
    throw new Error("data: URLs are not supported for media. Use buffer instead.");
  }
}

export async function resolveSandboxedMediaSource(params: {
  media: string;
  sandboxRoot: string;
}): Promise<string> {
  const raw = params.media.trim();
  if (!raw) {
    return raw;
  }
  if (HTTP_URL_RE.test(raw)) {
    return raw;
  }
  let candidate = raw;
  if (/^file:\/\//i.test(candidate)) {
    try {
      candidate = fileURLToPath(candidate);
    } catch {
      throw new Error(`Invalid file:// URL for sandboxed media: ${raw}`);
    }
  }
  const resolved = await assertSandboxPath({
    filePath: candidate,
    cwd: params.sandboxRoot,
    root: params.sandboxRoot,
  });
  return resolved.resolved;
}

async function assertNoSymlinkEscape(
  relative: string,
  root: string,
  options?: { allowFinalSymlink?: boolean },
) {
  if (!relative) {
    return;
  }
  const rootReal = await tryRealpath(root);
  const parts = relative.split(path.sep).filter(Boolean);
  // Start from the canonical (realpath) form of root to avoid Windows 8.3 short-name
  // mismatches: fs.realpath may resolve "ADMINI~1" to "Administrator", and if we
  // build `current` from the short-form root, symlink targets resolved via readlink
  // inherit the short form, causing isPathInside to fail against the long-form rootReal.
  let current = rootReal;
  for (let idx = 0; idx < parts.length; idx += 1) {
    const part = parts[idx];
    const isLast = idx === parts.length - 1;
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        // Unlinking a symlink itself is safe even if it points outside the root. What we
        // must prevent is traversing through a symlink to reach targets outside root.
        if (options?.allowFinalSymlink && isLast) {
          return;
        }
        // Resolve the symlink target. When the target does not exist (dangling
        // symlink), fs.realpath throws ENOENT. In that case, use fs.readlink to
        // obtain the link target and resolve it manually so we can still check
        // whether it escapes the sandbox root.
        let target: string;
        try {
          target = await fs.realpath(current);
        } catch (realpathErr) {
          if (isNotFoundPathError(realpathErr)) {
            const linkTarget = await fs.readlink(current);
            target = path.isAbsolute(linkTarget)
              ? linkTarget
              : path.resolve(path.dirname(current), linkTarget);
            // Normalize through realpath so the target matches rootReal's canonical
            // form. On Windows, readlink may return a path through a different
            // junction/drive (e.g. a VM cache redirect) that differs from rootReal's
            // realpath form, causing isPathInside to incorrectly report escape.
            target = await tryRealpath(target);
          } else {
            throw realpathErr;
          }
        }
        if (!isPathInside(rootReal, target)) {
          throw new Error(
            `Symlink escapes sandbox root (${shortPath(rootReal)}): ${shortPath(current)}`,
          );
        }
        current = target;
      }
    } catch (err) {
      if (isNotFoundPathError(err)) {
        return;
      }
      throw err;
    }
  }
}

async function tryRealpath(value: string): Promise<string> {
  try {
    return await fs.realpath(value);
  } catch {
    return path.resolve(value);
  }
}

function shortPath(value: string) {
  if (value.startsWith(os.homedir())) {
    return `~${value.slice(os.homedir().length)}`;
  }
  return value;
}
