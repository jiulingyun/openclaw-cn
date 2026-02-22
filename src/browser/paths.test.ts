import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveExistingPathsWithinRoot,
  resolvePathsWithinRoot,
  resolvePathWithinRoot,
} from "./paths.js";

async function createFixtureRoot(): Promise<{ baseDir: string; uploadsDir: string }> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-browser-paths-"));
  const uploadsDir = path.join(baseDir, "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  return { baseDir, uploadsDir };
}

describe("resolveExistingPathsWithinRoot", () => {
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(
      Array.from(cleanupDirs).map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      }),
    );
    cleanupDirs.clear();
  });

  function expectInvalidResult(
    result: Awaited<ReturnType<typeof resolveExistingPathsWithinRoot>>,
    expectedSnippet: string,
  ) {
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(expectedSnippet);
    }
  }

  it("accepts existing files under the upload root", async () => {
    const { baseDir, uploadsDir } = await createFixtureRoot();
    cleanupDirs.add(baseDir);

    const nestedDir = path.join(uploadsDir, "nested");
    await fs.mkdir(nestedDir, { recursive: true });
    const filePath = path.join(nestedDir, "ok.txt");
    await fs.writeFile(filePath, "ok", "utf8");

    const result = await resolveExistingPathsWithinRoot({
      rootDir: uploadsDir,
      requestedPaths: [filePath],
      scopeLabel: "uploads directory",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual([await fs.realpath(filePath)]);
    }
  });

  it("rejects traversal outside the upload root", async () => {
    const { baseDir, uploadsDir } = await createFixtureRoot();
    cleanupDirs.add(baseDir);

    const outsidePath = path.join(baseDir, "outside.txt");
    await fs.writeFile(outsidePath, "nope", "utf8");

    const result = await resolveExistingPathsWithinRoot({
      rootDir: uploadsDir,
      requestedPaths: ["../outside.txt"],
      scopeLabel: "uploads directory",
    });

    expectInvalidResult(result, "must stay within uploads directory");
  });

  it("keeps lexical in-root paths when files do not exist yet", async () => {
    const { baseDir, uploadsDir } = await createFixtureRoot();
    cleanupDirs.add(baseDir);

    const result = await resolveExistingPathsWithinRoot({
      rootDir: uploadsDir,
      requestedPaths: ["missing.txt"],
      scopeLabel: "uploads directory",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paths).toEqual([path.join(uploadsDir, "missing.txt")]);
    }
  });

  it.runIf(process.platform !== "win32")(
    "rejects symlink escapes outside upload root",
    async () => {
      const { baseDir, uploadsDir } = await createFixtureRoot();
      cleanupDirs.add(baseDir);

      const outsidePath = path.join(baseDir, "secret.txt");
      await fs.writeFile(outsidePath, "secret", "utf8");
      const symlinkPath = path.join(uploadsDir, "leak.txt");
      await fs.symlink(outsidePath, symlinkPath);

      const result = await resolveExistingPathsWithinRoot({
        rootDir: uploadsDir,
        requestedPaths: ["leak.txt"],
        scopeLabel: "uploads directory",
      });

      expectInvalidResult(result, "regular non-symlink file");
    },
  );
});

describe("resolvePathWithinRoot", () => {
  it("uses default file name when requested path is blank", () => {
    const result = resolvePathWithinRoot({
      rootDir: "/tmp/uploads",
      requestedPath: " ",
      scopeLabel: "uploads directory",
      defaultFileName: "fallback.txt",
    });
    expect(result).toEqual({
      ok: true,
      path: path.resolve("/tmp/uploads", "fallback.txt"),
    });
  });

  it("rejects root-level path aliases that do not point to a file", () => {
    const result = resolvePathWithinRoot({
      rootDir: "/tmp/uploads",
      requestedPath: ".",
      scopeLabel: "uploads directory",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("must stay within uploads directory");
    }
  });
});

describe("resolvePathsWithinRoot", () => {
  it("resolves all valid in-root paths", () => {
    const result = resolvePathsWithinRoot({
      rootDir: "/tmp/uploads",
      requestedPaths: ["a.txt", "nested/b.txt"],
      scopeLabel: "uploads directory",
    });
    expect(result).toEqual({
      ok: true,
      paths: [path.resolve("/tmp/uploads", "a.txt"), path.resolve("/tmp/uploads", "nested/b.txt")],
    });
  });

  it("returns the first path validation error", () => {
    const result = resolvePathsWithinRoot({
      rootDir: "/tmp/uploads",
      requestedPaths: ["a.txt", "../outside.txt", "b.txt"],
      scopeLabel: "uploads directory",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("must stay within uploads directory");
    }
  });
});
