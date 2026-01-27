import { resolveControlUiLinks } from "../../commands/onboard-helpers.js";
import {
  resolveGatewayLaunchAgentLabel,
  resolveGatewaySystemdServiceName,
} from "../../daemon/constants.js";
import { renderGatewayServiceCleanupHints } from "../../daemon/inspect.js";
import { resolveGatewayLogPaths } from "../../daemon/launchd.js";
import {
  isSystemdUnavailableDetail,
  renderSystemdUnavailableHints,
} from "../../daemon/systemd-hints.js";
import { isWSLEnv } from "../../infra/wsl.js";
import { getResolvedLoggerSettings } from "../../logging.js";
import { defaultRuntime } from "../../runtime.js";
import { colorize, isRich, theme } from "../../terminal/theme.js";
import { shortenHomePath } from "../../utils.js";
import { formatCliCommand } from "../command-format.js";
import {
  filterDaemonEnv,
  formatRuntimeStatus,
  renderRuntimeHints,
  safeDaemonEnv,
} from "./shared.js";
import {
  type DaemonStatus,
  renderPortDiagnosticsForCli,
  resolvePortListeningAddresses,
} from "./status.gather.js";

function sanitizeDaemonStatusForJson(status: DaemonStatus): DaemonStatus {
  const command = status.service.command;
  if (!command?.environment) return status;
  const safeEnv = filterDaemonEnv(command.environment);
  const nextCommand = {
    ...command,
    environment: Object.keys(safeEnv).length > 0 ? safeEnv : undefined,
  };
  return {
    ...status,
    service: {
      ...status.service,
      command: nextCommand,
    },
  };
}

export function printDaemonStatus(status: DaemonStatus, opts: { json: boolean }) {
  if (opts.json) {
    const sanitized = sanitizeDaemonStatusForJson(status);
    defaultRuntime.log(JSON.stringify(sanitized, null, 2));
    return;
  }

  const rich = isRich();
  const label = (value: string) => colorize(rich, theme.muted, value);
  const accent = (value: string) => colorize(rich, theme.accent, value);
  const infoText = (value: string) => colorize(rich, theme.info, value);
  const okText = (value: string) => colorize(rich, theme.success, value);
  const warnText = (value: string) => colorize(rich, theme.warn, value);
  const errorText = (value: string) => colorize(rich, theme.error, value);
  const spacer = () => defaultRuntime.log("");

  const { service, rpc, legacyServices, extraServices } = status;
  const serviceStatus = service.loaded
    ? okText(service.loadedText)
    : warnText(service.notLoadedText);
  defaultRuntime.log(`${label("Service:")} ${accent(service.label)} (${serviceStatus})`);
  try {
    const logFile = getResolvedLoggerSettings().file;
    defaultRuntime.log(`${label("File logs:")} ${infoText(shortenHomePath(logFile))}`);
  } catch {
    // ignore missing config/log resolution
  }
  if (service.command?.programArguments?.length) {
    defaultRuntime.log(
      `${label("Command:")} ${infoText(service.command.programArguments.join(" "))}`,
    );
  }
  if (service.command?.sourcePath) {
    defaultRuntime.log(
      `${label("Service file:")} ${infoText(shortenHomePath(service.command.sourcePath))}`,
    );
  }
  if (service.command?.workingDirectory) {
    defaultRuntime.log(
      `${label("Working dir:")} ${infoText(shortenHomePath(service.command.workingDirectory))}`,
    );
  }
  const daemonEnvLines = safeDaemonEnv(service.command?.environment);
  if (daemonEnvLines.length > 0) {
    defaultRuntime.log(`${label("Service env:")} ${daemonEnvLines.join(" ")}`);
  }
  spacer();

  if (service.configAudit?.issues.length) {
    defaultRuntime.error(warnText("服务配置看起来已过时或非标准。"));
    for (const issue of service.configAudit.issues) {
      const detail = issue.detail ? ` (${issue.detail})` : "";
      defaultRuntime.error(`${warnText("服务配置问题:")} ${issue.message}${detail}`);
    }
    defaultRuntime.error(
      warnText(
        `建议: 运行 "${formatCliCommand("clawdbot doctor")}" (或 "${formatCliCommand("clawdbot doctor --repair")}").`,
      ),
    );
  }

  if (status.config) {
    const cliCfg = `${shortenHomePath(status.config.cli.path)}${status.config.cli.exists ? "" : " (missing)"}${status.config.cli.valid ? "" : " (invalid)"}`;
    defaultRuntime.log(`${label("Config (cli):")} ${infoText(cliCfg)}`);
    if (!status.config.cli.valid && status.config.cli.issues?.length) {
      for (const issue of status.config.cli.issues.slice(0, 5)) {
        defaultRuntime.error(
          `${errorText("配置问题:")} ${issue.path || "<root>"}: ${issue.message}`,
        );
      }
    }
    if (status.config.daemon) {
      const daemonCfg = `${shortenHomePath(status.config.daemon.path)}${status.config.daemon.exists ? "" : " (missing)"}${status.config.daemon.valid ? "" : " (invalid)"}`;
      defaultRuntime.log(`${label("Config (service):")} ${infoText(daemonCfg)}`);
      if (!status.config.daemon.valid && status.config.daemon.issues?.length) {
        for (const issue of status.config.daemon.issues.slice(0, 5)) {
          defaultRuntime.error(
            `${errorText("服务配置问题:")} ${issue.path || "<root>"}: ${issue.message}`,
          );
        }
      }
    }
    if (status.config.mismatch) {
      defaultRuntime.error(
        errorText("根本原因: CLI 和服务使用不同的配置路径 (可能是配置文件/state-dir 不匹配)。"),
      );
      defaultRuntime.error(
        errorText(
          `修复: 从相同的 --profile / CLAWDBOT_STATE_DIR 重新运行 \`${formatCliCommand("clawdbot gateway install --force")}\``,
        ),
      );
    }
    spacer();
  }

  if (status.gateway) {
    const bindHost = status.gateway.bindHost ?? "n/a";
    defaultRuntime.log(
      `${label("Gateway:")} bind=${infoText(status.gateway.bindMode)} (${infoText(bindHost)}), port=${infoText(String(status.gateway.port))} (${infoText(status.gateway.portSource)})`,
    );
    defaultRuntime.log(`${label("Probe target:")} ${infoText(status.gateway.probeUrl)}`);
    const controlUiEnabled = status.config?.daemon?.controlUi?.enabled ?? true;
    if (!controlUiEnabled) {
      defaultRuntime.log(`${label("Dashboard:")} ${warnText("disabled")}`);
    } else {
      const links = resolveControlUiLinks({
        port: status.gateway.port,
        bind: status.gateway.bindMode,
        customBindHost: status.gateway.customBindHost,
        basePath: status.config?.daemon?.controlUi?.basePath,
      });
      defaultRuntime.log(`${label("Dashboard:")} ${infoText(links.httpUrl)}`);
    }
    if (status.gateway.probeNote) {
      defaultRuntime.log(`${label("Probe note:")} ${infoText(status.gateway.probeNote)}`);
    }
    spacer();
  }

  const runtimeLine = formatRuntimeStatus(service.runtime);
  if (runtimeLine) {
    const runtimeStatus = service.runtime?.status ?? "unknown";
    const runtimeColor =
      runtimeStatus === "running"
        ? theme.success
        : runtimeStatus === "stopped"
          ? theme.error
          : runtimeStatus === "unknown"
            ? theme.muted
            : theme.warn;
    defaultRuntime.log(`${label("Runtime:")} ${colorize(rich, runtimeColor, runtimeLine)}`);
  }

  if (rpc && !rpc.ok && service.loaded && service.runtime?.status === "running") {
    defaultRuntime.log(warnText("预热中: 启动代理可能需要几秒钟。请稍后再试。"));
  }
  if (rpc) {
    if (rpc.ok) {
      defaultRuntime.log(`${label("RPC 探测:")} ${okText("正常")}`);
    } else {
      defaultRuntime.error(`${label("RPC 探测:")} ${errorText("失败")}`);
      if (rpc.url) defaultRuntime.error(`${label("RPC 目标:")} ${rpc.url}`);
      const lines = String(rpc.error ?? "unknown")
        .split(/\r?\n/)
        .filter(Boolean);
      for (const line of lines.slice(0, 12)) {
        defaultRuntime.error(`  ${errorText(line)}`);
      }
    }
    spacer();
  }

  const systemdUnavailable =
    process.platform === "linux" && isSystemdUnavailableDetail(service.runtime?.detail);
  if (systemdUnavailable) {
    defaultRuntime.error(errorText("systemd 用户服务不可用。"));
    for (const hint of renderSystemdUnavailableHints({ wsl: isWSLEnv() })) {
      defaultRuntime.error(errorText(hint));
    }
    spacer();
  }

  if (service.runtime?.missingUnit) {
    defaultRuntime.error(errorText("服务单元未找到。"));
    for (const hint of renderRuntimeHints(service.runtime)) {
      defaultRuntime.error(errorText(hint));
    }
  } else if (service.loaded && service.runtime?.status === "stopped") {
    defaultRuntime.error(errorText("服务已加载但未运行 (可能立即退出了)。"));
    for (const hint of renderRuntimeHints(
      service.runtime,
      (service.command?.environment ?? process.env) as NodeJS.ProcessEnv,
    )) {
      defaultRuntime.error(errorText(hint));
    }
    spacer();
  }

  if (service.runtime?.cachedLabel) {
    const env = (service.command?.environment ?? process.env) as NodeJS.ProcessEnv;
    const labelValue = resolveGatewayLaunchAgentLabel(env.CLAWDBOT_PROFILE);
    defaultRuntime.error(
      errorText(
        `LaunchAgent 标签已缓存但 plist 缺失。使用以下命令清除: launchctl bootout gui/$UID/${labelValue}`,
      ),
    );
    defaultRuntime.error(
      errorText(`Then reinstall: ${formatCliCommand("clawdbot gateway install")}`),
    );
    spacer();
  }

  for (const line of renderPortDiagnosticsForCli(status, rpc?.ok)) {
    defaultRuntime.error(errorText(line));
  }

  if (status.port) {
    const addrs = resolvePortListeningAddresses(status);
    if (addrs.length > 0) {
      defaultRuntime.log(`${label("Listening:")} ${infoText(addrs.join(", "))}`);
    }
  }

  if (status.portCli && status.portCli.port !== status.port?.port) {
    defaultRuntime.log(
      `${label("Note:")} CLI config resolves gateway port=${status.portCli.port} (${status.portCli.status}).`,
    );
  }

  if (
    service.loaded &&
    service.runtime?.status === "running" &&
    status.port &&
    status.port.status !== "busy"
  ) {
    defaultRuntime.error(errorText(`网关端口 ${status.port.port} 未监听 (服务似乎正在运行)。`));
    if (status.lastError) {
      defaultRuntime.error(`${errorText("最后网关错误:")} ${status.lastError}`);
    }
    if (process.platform === "linux") {
      const env = (service.command?.environment ?? process.env) as NodeJS.ProcessEnv;
      const unit = resolveGatewaySystemdServiceName(env.CLAWDBOT_PROFILE);
      defaultRuntime.error(
        errorText(`Logs: journalctl --user -u ${unit}.service -n 200 --no-pager`),
      );
    } else if (process.platform === "darwin") {
      const logs = resolveGatewayLogPaths(
        (service.command?.environment ?? process.env) as NodeJS.ProcessEnv,
      );
      defaultRuntime.error(`${errorText("日志:")} ${shortenHomePath(logs.stdoutPath)}`);
      defaultRuntime.error(`${errorText("错误:")} ${shortenHomePath(logs.stderrPath)}`);
    }
    spacer();
  }

  if (legacyServices.length > 0) {
    defaultRuntime.error(errorText("检测到旧版网关服务:"));
    for (const svc of legacyServices) {
      defaultRuntime.error(`- ${errorText(svc.label)} (${svc.detail})`);
    }
    defaultRuntime.error(errorText(`Cleanup: ${formatCliCommand("clawdbot doctor")}`));
    spacer();
  }

  if (extraServices.length > 0) {
    defaultRuntime.error(errorText("检测到其他类似网关的服务 (尽力而为):"));
    for (const svc of extraServices) {
      defaultRuntime.error(`- ${errorText(svc.label)} (${svc.scope}, ${svc.detail})`);
    }
    for (const hint of renderGatewayServiceCleanupHints()) {
      defaultRuntime.error(`${errorText("清理提示:")} ${hint}`);
    }
    spacer();
  }

  if (legacyServices.length > 0 || extraServices.length > 0) {
    defaultRuntime.error(
      errorText(
        "建议: 对于大多数设置，每台机器运行一个网关。一个网关支持多个代理 (参见文档: /gateway#multiple-gateways-same-host)。",
      ),
    );
    defaultRuntime.error(
      errorText(
        "如果您需要多个网关 (例如，在同一主机上的救援机器人)，请隔离端口 + 配置/状态 (参见文档: /gateway#multiple-gateways-same-host)。",
      ),
    );
    spacer();
  }

  defaultRuntime.log(`${label("问题排查:")} run ${formatCliCommand("clawdbot status")}`);
  defaultRuntime.log(`${label("故障排除:")} https://docs.clawd.bot/troubleshooting`);
}
