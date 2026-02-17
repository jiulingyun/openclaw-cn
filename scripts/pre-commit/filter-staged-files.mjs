#!/usr/bin/env node
import path from "node:path";

/**
 * 将选定的文件以 NUL 分隔的形式输出到 stdout。
 *
 * 用法：
 *   node scripts/pre-commit/filter-staged-files.mjs lint -- <files...>
 *   node scripts/pre-commit/filter-staged-files.mjs format -- <files...>
 *
 * 保持此脚本无依赖：pre-commit 钩子在各种环境中运行。
 */

const mode = process.argv[2];
const rawArgs = process.argv.slice(3);
const files = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

if (mode !== "lint" && mode !== "format") {
  process.stderr.write("用法: filter-staged-files.mjs <lint|format> -- <files...>\n");
  process.exit(2);
}

const lintExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const formatExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".mdx"]);

const shouldSelect = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (mode === "lint") {
    return lintExts.has(ext);
  }
  return formatExts.has(ext);
};

for (const file of files) {
  if (shouldSelect(file)) {
    process.stdout.write(file);
    process.stdout.write("\0");
  }
}
