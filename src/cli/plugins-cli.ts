import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";

import { loadConfig, writeConfigFile } from "../config/config.js";
import type { ClawdbotConfig } from "../config/config.js";
import { resolveArchiveKind } from "../infra/archive.js";
import { installPluginFromNpmSpec, installPluginFromPath } from "../plugins/install.js";
import { recordPluginInstall } from "../plugins/installs.js";
import { applyExclusiveSlotSelection } from "../plugins/slots.js";
import type { PluginRecord } from "../plugins/registry.js";
import { buildPluginStatusReport } from "../plugins/status.js";
import { updateNpmInstalledPlugins } from "../plugins/update.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { resolveUserPath, shortenHomeInString, shortenHomePath } from "../utils.js";

export type PluginsListOptions = {
  json?: boolean;
  enabled?: boolean;
  verbose?: boolean;
};

export type PluginInfoOptions = {
  json?: boolean;
};

export type PluginUpdateOptions = {
  all?: boolean;
  dryRun?: boolean;
};

function formatPluginLine(plugin: PluginRecord, verbose = false): string {
  const status =
    plugin.status === "loaded"
      ? theme.success("loaded")
      : plugin.status === "disabled"
        ? theme.warn("disabled")
        : theme.error("error");
  const name = theme.command(plugin.name || plugin.id);
  const idSuffix = plugin.name && plugin.name !== plugin.id ? theme.muted(` (${plugin.id})`) : "";
  const desc = plugin.description
    ? theme.muted(
        plugin.description.length > 60
          ? `${plugin.description.slice(0, 57)}...`
          : plugin.description,
      )
    : theme.muted("(no description)");

  if (!verbose) {
    return `${name}${idSuffix} ${status} - ${desc}`;
  }

  const parts = [
    `${name}${idSuffix} ${status}`,
    `  source: ${theme.muted(shortenHomeInString(plugin.source))}`,
    `  origin: ${plugin.origin}`,
  ];
  if (plugin.version) parts.push(`  version: ${plugin.version}`);
  if (plugin.providerIds.length > 0) {
    parts.push(`  providers: ${plugin.providerIds.join(", ")}`);
  }
  if (plugin.error) parts.push(theme.error(`  error: ${plugin.error}`));
  return parts.join("\n");
}

function applySlotSelectionForPlugin(
  config: ClawdbotConfig,
  pluginId: string,
): { config: ClawdbotConfig; warnings: string[] } {
  const report = buildPluginStatusReport({ config });
  const plugin = report.plugins.find((entry) => entry.id === pluginId);
  if (!plugin) {
    return { config, warnings: [] };
  }
  const result = applyExclusiveSlotSelection({
    config,
    selectedId: plugin.id,
    selectedKind: plugin.kind,
    registry: report,
  });
  return { config: result.config, warnings: result.warnings };
}

function logSlotWarnings(warnings: string[]) {
  if (warnings.length === 0) return;
  for (const warning of warnings) {
    defaultRuntime.log(theme.warn(warning));
  }
}

export function registerPluginsCli(program: Command) {
  const plugins = program
    .command("plugins")
    .description("管理 Clawdbot 插件/扩展")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("文档：")} ${formatDocsLink("/cli/plugins", "docs.clawd.bot/cli/plugins")}\n`,
    );

  plugins
    .command("list")
    .description("列出发现的插件")
    .option("--json", "输出 JSON")
    .option("--enabled", "仅显示已启用的插件", false)
    .option("--verbose", "显示详细条目", false)
    .action((opts: PluginsListOptions) => {
      const report = buildPluginStatusReport();
      const list = opts.enabled
        ? report.plugins.filter((p) => p.status === "loaded")
        : report.plugins;

      if (opts.json) {
        const payload = {
          workspaceDir: report.workspaceDir,
          plugins: list,
          diagnostics: report.diagnostics,
        };
        defaultRuntime.log(JSON.stringify(payload, null, 2));
        return;
      }

      if (list.length === 0) {
        defaultRuntime.log(theme.muted("未找到插件。"));
        return;
      }

      const loaded = list.filter((p) => p.status === "loaded").length;
      defaultRuntime.log(
        `${theme.heading("Plugins")} ${theme.muted(`(${loaded}/${list.length} loaded)`)}`,
      );

      if (!opts.verbose) {
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        const rows = list.map((plugin) => {
          const desc = plugin.description ? theme.muted(plugin.description) : "";
          const sourceLine = desc ? `${plugin.source}\n${desc}` : plugin.source;
          return {
            Name: plugin.name || plugin.id,
            ID: plugin.name && plugin.name !== plugin.id ? plugin.id : "",
            Status:
              plugin.status === "loaded"
                ? theme.success("loaded")
                : plugin.status === "disabled"
                  ? theme.warn("disabled")
                  : theme.error("error"),
            Source: sourceLine,
            Version: plugin.version ?? "",
          };
        });
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "Name", header: "Name", minWidth: 14, flex: true },
              { key: "ID", header: "ID", minWidth: 10, flex: true },
              { key: "Status", header: "Status", minWidth: 10 },
              { key: "Source", header: "Source", minWidth: 26, flex: true },
              { key: "Version", header: "Version", minWidth: 8 },
            ],
            rows,
          }).trimEnd(),
        );
        return;
      }

      const lines: string[] = [];
      for (const plugin of list) {
        lines.push(formatPluginLine(plugin, true));
        lines.push("");
      }
      defaultRuntime.log(lines.join("\n").trim());
    });

  plugins
    .command("info")
    .description("显示插件详情")
    .argument("<id>", "插件 ID")
    .option("--json", "输出 JSON")
    .action((id: string, opts: PluginInfoOptions) => {
      const report = buildPluginStatusReport();
      const plugin = report.plugins.find((p) => p.id === id || p.name === id);
      if (!plugin) {
        defaultRuntime.error(`未找到插件: ${id}`);
        process.exit(1);
      }
      const cfg = loadConfig();
      const install = cfg.plugins?.installs?.[plugin.id];

      if (opts.json) {
        defaultRuntime.log(JSON.stringify(plugin, null, 2));
        return;
      }

      const lines: string[] = [];
      lines.push(theme.heading(plugin.name || plugin.id));
      if (plugin.name && plugin.name !== plugin.id) {
        lines.push(theme.muted(`id: ${plugin.id}`));
      }
      if (plugin.description) lines.push(plugin.description);
      lines.push("");
      lines.push(`${theme.muted("Status:")} ${plugin.status}`);
      lines.push(`${theme.muted("Source:")} ${shortenHomeInString(plugin.source)}`);
      lines.push(`${theme.muted("Origin:")} ${plugin.origin}`);
      if (plugin.version) lines.push(`${theme.muted("Version:")} ${plugin.version}`);
      if (plugin.toolNames.length > 0) {
        lines.push(`${theme.muted("Tools:")} ${plugin.toolNames.join(", ")}`);
      }
      if (plugin.hookNames.length > 0) {
        lines.push(`${theme.muted("Hooks:")} ${plugin.hookNames.join(", ")}`);
      }
      if (plugin.gatewayMethods.length > 0) {
        lines.push(`${theme.muted("Gateway methods:")} ${plugin.gatewayMethods.join(", ")}`);
      }
      if (plugin.providerIds.length > 0) {
        lines.push(`${theme.muted("Providers:")} ${plugin.providerIds.join(", ")}`);
      }
      if (plugin.cliCommands.length > 0) {
        lines.push(`${theme.muted("CLI commands:")} ${plugin.cliCommands.join(", ")}`);
      }
      if (plugin.services.length > 0) {
        lines.push(`${theme.muted("Services:")} ${plugin.services.join(", ")}`);
      }
      if (plugin.error) lines.push(`${theme.error("Error:")} ${plugin.error}`);
      if (install) {
        lines.push("");
        lines.push(`${theme.muted("Install:")} ${install.source}`);
        if (install.spec) lines.push(`${theme.muted("Spec:")} ${install.spec}`);
        if (install.sourcePath)
          lines.push(`${theme.muted("Source path:")} ${shortenHomePath(install.sourcePath)}`);
        if (install.installPath)
          lines.push(`${theme.muted("Install path:")} ${shortenHomePath(install.installPath)}`);
        if (install.version) lines.push(`${theme.muted("Recorded version:")} ${install.version}`);
        if (install.installedAt)
          lines.push(`${theme.muted("Installed at:")} ${install.installedAt}`);
      }
      defaultRuntime.log(lines.join("\n"));
    });

  plugins
    .command("enable")
    .description("在配置中启用插件")
    .argument("<id>", "插件 ID")
    .action(async (id: string) => {
      const cfg = loadConfig();
      let next: ClawdbotConfig = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [id]: {
              ...(cfg.plugins?.entries as Record<string, { enabled?: boolean }> | undefined)?.[id],
              enabled: true,
            },
          },
        },
      };
      const slotResult = applySlotSelectionForPlugin(next, id);
      next = slotResult.config;
      await writeConfigFile(next);
      logSlotWarnings(slotResult.warnings);
      defaultRuntime.log(`Enabled plugin "${id}". Restart the gateway to apply.`);
    });

  plugins
    .command("disable")
    .description("在配置中禁用插件")
    .argument("<id>", "插件 ID")
    .action(async (id: string) => {
      const cfg = loadConfig();
      const next = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [id]: {
              ...(cfg.plugins?.entries as Record<string, { enabled?: boolean }> | undefined)?.[id],
              enabled: false,
            },
          },
        },
      };
      await writeConfigFile(next);
      defaultRuntime.log(`Disabled plugin "${id}". Restart the gateway to apply.`);
    });

  plugins
    .command("install")
    .description("安装插件（路径、归档或 npm 规范）")
    .argument("<path-or-spec>", "路径 (.ts/.js/.zip/.tgz/.tar.gz) 或 npm 包规范")
    .option("-l, --link", "链接本地路径而不是复制", false)
    .action(async (raw: string, opts: { link?: boolean }) => {
      const resolved = resolveUserPath(raw);
      const cfg = loadConfig();

      if (fs.existsSync(resolved)) {
        if (opts.link) {
          const existing = cfg.plugins?.load?.paths ?? [];
          const merged = Array.from(new Set([...existing, resolved]));
          const probe = await installPluginFromPath({ path: resolved, dryRun: true });
          if (!probe.ok) {
            defaultRuntime.error(probe.error);
            process.exit(1);
          }

          let next: ClawdbotConfig = {
            ...cfg,
            plugins: {
              ...cfg.plugins,
              load: {
                ...cfg.plugins?.load,
                paths: merged,
              },
              entries: {
                ...cfg.plugins?.entries,
                [probe.pluginId]: {
                  ...(cfg.plugins?.entries?.[probe.pluginId] as object | undefined),
                  enabled: true,
                },
              },
            },
          };
          next = recordPluginInstall(next, {
            pluginId: probe.pluginId,
            source: "path",
            sourcePath: resolved,
            installPath: resolved,
            version: probe.version,
          });
          const slotResult = applySlotSelectionForPlugin(next, probe.pluginId);
          next = slotResult.config;
          await writeConfigFile(next);
          logSlotWarnings(slotResult.warnings);
          defaultRuntime.log(`Linked plugin path: ${shortenHomePath(resolved)}`);
          defaultRuntime.log(`Restart the gateway to load plugins.`);
          return;
        }

        const result = await installPluginFromPath({
          path: resolved,
          logger: {
            info: (msg) => defaultRuntime.log(msg),
            warn: (msg) => defaultRuntime.log(theme.warn(msg)),
          },
        });
        if (!result.ok) {
          defaultRuntime.error(result.error);
          process.exit(1);
        }

        let next: ClawdbotConfig = {
          ...cfg,
          plugins: {
            ...cfg.plugins,
            entries: {
              ...cfg.plugins?.entries,
              [result.pluginId]: {
                ...(cfg.plugins?.entries?.[result.pluginId] as object | undefined),
                enabled: true,
              },
            },
          },
        };
        const source: "archive" | "path" = resolveArchiveKind(resolved) ? "archive" : "path";
        next = recordPluginInstall(next, {
          pluginId: result.pluginId,
          source,
          sourcePath: resolved,
          installPath: result.targetDir,
          version: result.version,
        });
        const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
        next = slotResult.config;
        await writeConfigFile(next);
        logSlotWarnings(slotResult.warnings);
        defaultRuntime.log(`Installed plugin: ${result.pluginId}`);
        defaultRuntime.log(`Restart the gateway to load plugins.`);
        return;
      }

      if (opts.link) {
        defaultRuntime.error("`--link` 需要本地路径。");
        process.exit(1);
      }

      const looksLikePath =
        raw.startsWith(".") ||
        raw.startsWith("~") ||
        path.isAbsolute(raw) ||
        raw.endsWith(".ts") ||
        raw.endsWith(".js") ||
        raw.endsWith(".mjs") ||
        raw.endsWith(".cjs") ||
        raw.endsWith(".tgz") ||
        raw.endsWith(".tar.gz") ||
        raw.endsWith(".tar") ||
        raw.endsWith(".zip");
      if (looksLikePath) {
        defaultRuntime.error(`未找到路径: ${resolved}`);
        process.exit(1);
      }

      const result = await installPluginFromNpmSpec({
        spec: raw,
        logger: {
          info: (msg) => defaultRuntime.log(msg),
          warn: (msg) => defaultRuntime.log(theme.warn(msg)),
        },
      });
      if (!result.ok) {
        defaultRuntime.error(result.error);
        process.exit(1);
      }

      let next: ClawdbotConfig = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [result.pluginId]: {
              ...(cfg.plugins?.entries?.[result.pluginId] as object | undefined),
              enabled: true,
            },
          },
        },
      };
      next = recordPluginInstall(next, {
        pluginId: result.pluginId,
        source: "npm",
        spec: raw,
        installPath: result.targetDir,
        version: result.version,
      });
      const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
      next = slotResult.config;
      await writeConfigFile(next);
      logSlotWarnings(slotResult.warnings);
      defaultRuntime.log(`Installed plugin: ${result.pluginId}`);
      defaultRuntime.log(`Restart the gateway to load plugins.`);
    });

  plugins
    .command("update")
    .description("更新已安装的插件（仅 npm 安装）")
    .argument("[id]", "插件 ID（与 --all 配合时省略）")
    .option("--all", "更新所有跟踪的插件", false)
    .option("--dry-run", "显示会发生的更改但不写入", false)
    .action(async (id: string | undefined, opts: PluginUpdateOptions) => {
      const cfg = loadConfig();
      const installs = cfg.plugins?.installs ?? {};
      const targets = opts.all ? Object.keys(installs) : id ? [id] : [];

      if (targets.length === 0) {
        if (opts.all) {
          defaultRuntime.log("没有需要更新的npm安装插件。");
          return;
        }
        defaultRuntime.error("提供插件ID或使用--all。");
        process.exit(1);
      }

      const result = await updateNpmInstalledPlugins({
        config: cfg,
        pluginIds: targets,
        dryRun: opts.dryRun,
        logger: {
          info: (msg) => defaultRuntime.log(msg),
          warn: (msg) => defaultRuntime.log(theme.warn(msg)),
        },
      });

      for (const outcome of result.outcomes) {
        if (outcome.status === "error") {
          defaultRuntime.log(theme.error(outcome.message));
          continue;
        }
        if (outcome.status === "skipped") {
          defaultRuntime.log(theme.warn(outcome.message));
          continue;
        }
        defaultRuntime.log(outcome.message);
      }

      if (!opts.dryRun && result.changed) {
        await writeConfigFile(result.config);
        defaultRuntime.log("Restart the gateway to load plugins.");
      }
    });

  plugins
    .command("doctor")
    .description("报告插件加载问题")
    .action(() => {
      const report = buildPluginStatusReport();
      const errors = report.plugins.filter((p) => p.status === "error");
      const diags = report.diagnostics.filter((d) => d.level === "error");

      if (errors.length === 0 && diags.length === 0) {
        defaultRuntime.log("未检测到插件问题。");
        return;
      }

      const lines: string[] = [];
      if (errors.length > 0) {
        lines.push(theme.error("插件错误:"));
        for (const entry of errors) {
          lines.push(`- ${entry.id}: ${entry.error ?? "failed to load"} (${entry.source})`);
        }
      }
      if (diags.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(theme.warn("诊断:"));
        for (const diag of diags) {
          const target = diag.pluginId ? `${diag.pluginId}: ` : "";
          lines.push(`- ${target}${diag.message}`);
        }
      }
      const docs = formatDocsLink("/plugin", "docs.clawd.bot/plugin");
      lines.push("");
      lines.push(`${theme.muted("Docs:")} ${docs}`);
      defaultRuntime.log(lines.join("\n"));
    });
}
