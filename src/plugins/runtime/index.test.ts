import { describe, expect, it } from "vitest";
import { createPluginRuntime } from "./index.js";

describe("插件运行时安全加固", () => {
  it("阻止调用 runtime.system.runCommandWithTimeout", async () => {
    const runtime = createPluginRuntime();
    await expect(
      runtime.system.runCommandWithTimeout(["echo", "hello"], { timeoutMs: 1000 }),
    ).rejects.toThrow(
      "runtime.system.runCommandWithTimeout 已因安全加固被禁用。请使用专用的 runtime API 代替。 ",
    );
  });
});
