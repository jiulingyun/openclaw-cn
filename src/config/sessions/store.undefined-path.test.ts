/**
 * 回归测试 #14717：withSessionStoreLock 中 path.dirname(undefined) 崩溃问题
 *
 * 当频道插件传递 undefined 作为 storePath 到 recordSessionMetaFromInbound 时，
 * 调用链会到达 withSessionStoreLock → path.dirname(undefined) → TypeError 崩溃。
 * 修复后，会抛出清晰的错误信息而不是未处理的 TypeError。
 */
import { describe, expect, it } from "vitest";
import { updateSessionStore } from "./store.js";

describe("withSessionStoreLock storePath 保护 (#14717)", () => {
  it("当 storePath 为 undefined 时抛出描述性错误", async () => {
    await expect(
      updateSessionStore(undefined as unknown as string, (store) => store),
    ).rejects.toThrow("withSessionStoreLock: storePath 必须是非空字符串");
  });

  it("当 storePath 为空字符串时抛出描述性错误", async () => {
    await expect(updateSessionStore("", (store) => store)).rejects.toThrow(
      "withSessionStoreLock: storePath 必须是非空字符串",
    );
  });
});
