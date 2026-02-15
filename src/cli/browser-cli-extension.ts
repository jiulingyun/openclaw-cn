import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Command } from "commander";

import { STATE_DIR } from "../config/paths.js";
import { danger, info } from "../globals.js";
import { copyToClipboard } from "../infra/clipboard.js";
import { defaultRuntime } from "../runtime.js";
import { movePathToTrash } from "../browser/trash.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

function bundledExtensionRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../assets/chrome-extension");
}

function installedExtensionRootDir() {
  return path.join(STATE_DIR, "browser", "chrome-extension");
}

function hasManifest(dir: string) {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

export async function installChromeExtension(opts?: {
  stateDir?: string;
  sourceDir?: string;
}): Promise<{ path: string }> {
  const src = opts?.sourceDir ?? bundledExtensionRootDir();
  if (!hasManifest(src)) {
    throw new Error("捆绑的 Chrome 扩展缺失。请重新安装 Clawdbot 并重试。");
  }

  const stateDir = opts?.stateDir ?? STATE_DIR;
  const dest = path.join(stateDir, "browser", "chrome-extension");
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest)) {
    await movePathToTrash(dest).catch(() => {
      const backup = `${dest}.old-${Date.now()}`;
      fs.renameSync(dest, backup);
    });
  }

  await fs.promises.cp(src, dest, { recursive: true });
  if (!hasManifest(dest)) {
    throw new Error("Chrome 扩展安装失败（manifest.json 缺失）。请重试。");
  }

  return { path: dest };
}

export function registerBrowserExtensionCommands(
  browser: Command,
  parentOpts: (cmd: Command) => { json?: boolean },
) {
  const ext = browser.command("extension").description("Chrome 扩展助手");

  ext
    .command("install")
    .description("将 Chrome 扩展安装到稳定的本地路径")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      let installed: { path: string };
      try {
        installed = await installChromeExtension();
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }

      if (parent?.json) {
        defaultRuntime.log(JSON.stringify({ ok: true, path: installed.path }, null, 2));
        return;
      }
      const displayPath = shortenHomePath(installed.path);
      defaultRuntime.log(displayPath);
      const copied = await copyToClipboard(installed.path).catch(() => false);
      defaultRuntime.error(
        info(
          [
            copied ? "已复制到剪贴板。" : "复制到剪贴板不可用。",
            "接下来：",
            `- Chrome → chrome://extensions → 启用“开发者模式"`,
            `- “加载已解压的扩展程序” → 选择：${displayPath}`,
            `- 固定“Clawdbot Browser Relay”，然后在标签页上点击它（徽章显示 ON）`,
            "",
            `${theme.muted("Docs:")} ${formatDocsLink("/tools/chrome-extension", "docs.clawd.bot/tools/chrome-extension")}`,
          ].join("\n"),
        ),
      );
    });

  ext
    .command("path")
    .description("打印已安装的 Chrome 扩展路径（加载未打包的）")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const dir = installedExtensionRootDir();
      if (!hasManifest(dir)) {
        defaultRuntime.error(
          danger(
            [
              `Chrome 扩展未安装。运行："${formatCliCommand("openclaw-cn browser extension install")}"`,
              `Docs: ${formatDocsLink("/tools/chrome-extension", "docs.clawd.bot/tools/chrome-extension")}`,
            ].join("\n"),
          ),
        );
        defaultRuntime.exit(1);
      }
      if (parent?.json) {
        defaultRuntime.log(JSON.stringify({ path: dir }, null, 2));
        return;
      }
      const displayPath = shortenHomePath(dir);
      defaultRuntime.log(displayPath);
      const copied = await copyToClipboard(dir).catch(() => false);
      if (copied) defaultRuntime.error(info("已复制到剪贴板。"));
    });
}
