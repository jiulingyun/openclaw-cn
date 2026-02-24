import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { wrapToolWorkspaceRootGuardWithOptions } from "./pi-tools.read.js";
import type { AnyAgentTool } from "./pi-tools.types.js";

const assertSandboxPath = vi.fn(async () => ({ resolved: "/tmp/root", relative: "" }));

vi.mock("./sandbox-paths.js", () => ({
  assertSandboxPath: (...args: unknown[]) => assertSandboxPath(...args),
}));

function createToolHarness() {
  const execute = vi.fn(async () => ({
    content: [{ type: "text", text: "ok" }],
  }));
  const tool: AnyAgentTool = {
    name: "read",
    description: "read a file",
    inputSchema: { type: "object", properties: { path: { type: "string" } } },
    execute,
  };
  return { tool, execute };
}

beforeEach(() => {
  assertSandboxPath.mockClear();
});

describe("wrapToolWorkspaceRootGuardWithOptions", () => {
  it("passes path directly to assertSandboxPath when no containerWorkdir", async () => {
    const { tool } = createToolHarness();
    const root = "/tmp/root";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root);
    await wrapped.execute("call1", { path: "/tmp/root/file.txt" }, new AbortController().signal);
    expect(assertSandboxPath).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: "/tmp/root/file.txt", root }),
    );
  });

  it("maps container workdir path to host workspace root", async () => {
    const { tool } = createToolHarness();
    const root = "/home/user/workspace";
    const containerWorkdir = "/workspace";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root, { containerWorkdir });
    await wrapped.execute(
      "call1",
      { path: "/workspace/src/index.ts" },
      new AbortController().signal,
    );
    expect(assertSandboxPath).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: path.resolve(root, "src/index.ts"),
        root,
      }),
    );
  });

  it("maps exact container workdir to host workspace root", async () => {
    const { tool } = createToolHarness();
    const root = "/home/user/workspace";
    const containerWorkdir = "/workspace";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root, { containerWorkdir });
    await wrapped.execute("call1", { path: "/workspace" }, new AbortController().signal);
    expect(assertSandboxPath).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: path.resolve(root),
        root,
      }),
    );
  });

  it("maps file:// container path to host workspace root", async () => {
    const { tool } = createToolHarness();
    const root = "/home/user/workspace";
    const containerWorkdir = "/workspace";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root, { containerWorkdir });
    await wrapped.execute(
      "call1",
      { path: "file:///workspace/README.md" },
      new AbortController().signal,
    );
    expect(assertSandboxPath).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: path.resolve(root, "README.md"),
        root,
      }),
    );
  });

  it("does not map paths outside containerWorkdir", async () => {
    const { tool } = createToolHarness();
    const root = "/home/user/workspace";
    const containerWorkdir = "/workspace";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root, { containerWorkdir });
    await wrapped.execute("call1", { path: "/tmp/other/file.txt" }, new AbortController().signal);
    expect(assertSandboxPath).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: "/tmp/other/file.txt",
        root,
      }),
    );
  });

  it("skips assertSandboxPath when no path param", async () => {
    const { tool } = createToolHarness();
    const root = "/tmp/root";
    const wrapped = wrapToolWorkspaceRootGuardWithOptions(tool, root);
    await wrapped.execute("call1", { content: "hello" }, new AbortController().signal);
    expect(assertSandboxPath).not.toHaveBeenCalled();
  });
});
