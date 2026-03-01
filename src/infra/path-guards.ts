import path from "node:path";

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return Boolean(
    value && typeof value === "object" && "code" in (value as Record<string, unknown>),
  );
}

export function isNotFoundPathError(value: unknown): boolean {
  return isNodeError(value) && (value.code === "ENOENT" || value.code === "ENOTDIR");
}

export function isSymlinkOpenError(value: unknown): boolean {
  return (
    isNodeError(value) &&
    (value.code === "ELOOP" || value.code === "EINVAL" || value.code === "ENOTSUP")
  );
}

export function isPathInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  if (!relative || relative === "") {
    return true;
  }
  return !(relative.startsWith("..") || path.isAbsolute(relative));
}
