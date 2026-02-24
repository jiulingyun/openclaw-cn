import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadModuleExport } from "./module-loader.js";

describe("loadModuleExport", () => {
  it("rejects empty module path", async () => {
    const result = await loadModuleExport({ baseDir: "/tmp", modulePath: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("empty");
    }
  });

  it("rejects absolute module path", async () => {
    const result = await loadModuleExport({
      baseDir: "/tmp",
      modulePath: "/etc/passwd",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("absolute");
    }
  });

  it("rejects path traversal outside baseDir", async () => {
    const result = await loadModuleExport({
      baseDir: "/tmp/hooks",
      modulePath: "../../etc/passwd",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("baseDir");
    }
  });

  it("allows valid relative paths within baseDir", async () => {
    // A real module that exists within our codebase for testing purposes.
    // We use the module-loader itself as the test target.
    const baseDir = path.dirname(new URL(import.meta.url).pathname);
    const result = await loadModuleExport<unknown>({
      baseDir,
      modulePath: "./module-loader.js",
      exportName: "loadModuleExport",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value).toBe("function");
    }
  });
});
