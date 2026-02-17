import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("git-hooks/pre-commit", () => {
  it("避免选项注入和不安全的空白符解析", () => {
    const scriptPath = path.join(process.cwd(), "git-hooks", "pre-commit");
    const script = readFileSync(scriptPath, "utf8");

    // NUL 分隔列表：支持包含空格/换行的文件名。
    expect(script).toMatch(/--name-only/);
    expect(script).toMatch(/--diff-filter=ACMR/);
    expect(script).toMatch(/\s-z\b/);
    expect(script).toMatch(/mapfile -d '' -t files/);

    // 选项注入加固：始终在路径前传递 "--"。
    expect(script).toMatch(/\ngit add -- /);

    // 原始 bug 使用了空白符 + xargs，并传递了不安全的标志。
    expect(script).not.toMatch(/xargs\s+git add/);
    expect(script).not.toMatch(/--no-error-on-unmatched-pattern/);
  });
});
