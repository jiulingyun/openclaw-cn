import type { Command } from "commander";
import type { GatewayDaemonRuntime } from "../../commands/daemon-runtime.js";
import { onboardCommand } from "../../commands/onboard.js";
import type {
  AuthChoice,
  GatewayAuthChoice,
  GatewayBind,
  NodeManagerChoice,
  TailscaleMode,
} from "../../commands/onboard-types.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

function resolveInstallDaemonFlag(
  command: unknown,
  opts: { installDaemon?: boolean },
): boolean | undefined {
  if (!command || typeof command !== "object") return undefined;
  const getOptionValueSource =
    "getOptionValueSource" in command ? command.getOptionValueSource : undefined;
  if (typeof getOptionValueSource !== "function") return undefined;

  // Commander doesn't support option conflicts natively; keep original behavior.
  // If --skip-daemon is explicitly passed, it wins.
  if (getOptionValueSource.call(command, "skipDaemon") === "cli") return false;
  if (getOptionValueSource.call(command, "installDaemon") === "cli") {
    return Boolean(opts.installDaemon);
  }
  return undefined;
}

export function registerOnboardCommand(program: Command) {
  program
    .command("onboard")
    .description("交互式向导，用于设置网关、工作区和技能")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("文档：")} ${formatDocsLink("/cli/onboard", "docs.clawd.bot/cli/onboard")}\n`,
    )
    .option("--workspace <dir>", "智能体工作区目录（默认：~/clawd）")
    .option("--reset", "运行向导前重置配置 + 凭据 + 会话 + 工作区")
    .option("--non-interactive", "无提示运行", false)
    .option(
      "--accept-risk",
      "确认智能体功能强大且完全系统访问存在风险（--non-interactive 必需）",
      false,
    )
    .option("--flow <flow>", "向导流程：quickstart|快速开始|advanced|高级|manual|手动")
    .option("--mode <mode>", "向导模式：local|本地|remote|远程")
    .option(
      "--auth-choice <choice>",
      "认证方式：setup-token|claude-cli|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|kimi-code-api-key|synthetic-api-key|venice-api-key|codex-cli|gemini-api-key|zai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|volcengine-api-key|skip",
    )
    .option(
      "--token-provider <id>",
      "Token 提供商 ID（非交互模式；与 --auth-choice token 配合使用）",
    )
    .option("--token <token>", "Token 值（非交互模式；与 --auth-choice token 配合使用）")
    .option("--token-profile-id <id>", "认证配置文件 ID（非交互模式；默认：<provider>:manual）")
    .option("--token-expires-in <duration>", "可选的 Token 过期时间（如 365d, 12h）")
    .option("--anthropic-api-key <key>", "Anthropic API 密钥")
    .option("--openai-api-key <key>", "OpenAI API 密钥")
    .option("--openrouter-api-key <key>", "OpenRouter API 密钥")
    .option("--ai-gateway-api-key <key>", "Vercel AI Gateway API 密钥")
    .option("--moonshot-api-key <key>", "Moonshot API 密钥")
    .option("--kimi-code-api-key <key>", "Kimi Code API 密钥")
    .option("--gemini-api-key <key>", "Gemini API 密钥")
    .option("--zai-api-key <key>", "Z.AI API 密钥")
    .option("--minimax-api-key <key>", "MiniMax API 密钥")
    .option("--synthetic-api-key <key>", "Synthetic API 密钥")
    .option("--venice-api-key <key>", "Venice API 密钥")
    .option("--opencode-zen-api-key <key>", "OpenCode Zen API 密钥")
    .option("--volcengine-api-key <key>", "Volcengine API 密钥")
    .option("--gateway-port <port>", "网关端口")
    .option(
      "--gateway-bind <mode>",
      "网关绑定：loopback|本地回环|tailnet|lan|局域网|auto|自动|custom|自定义",
    )
    .option("--gateway-auth <mode>", "网关认证：off|关闭|token|令牌|password|密码")
    .option("--gateway-token <token>", "网关令牌（令牌认证）")
    .option("--gateway-password <password>", "网关密码（密码认证）")
    .option("--remote-url <url>", "远程网关 WebSocket URL")
    .option("--remote-token <token>", "远程网关令牌（可选）")
    .option("--tailscale <mode>", "Tailscale 模式：off|关闭|serve|服务|funnel|隧道")
    .option("--tailscale-reset-on-exit", "退出时重置 Tailscale serve/funnel")
    .option("--install-daemon", "安装网关服务")
    .option("--no-install-daemon", "跳过网关服务安装")
    .option("--skip-daemon", "跳过网关服务安装")
    .option("--daemon-runtime <runtime>", "守护进程运行时：node|bun")
    .option("--skip-channels", "跳过渠道设置")
    .option("--skip-skills", "跳过技能设置")
    .option("--skip-health", "跳过健康检查")
    .option("--skip-ui", "跳过控制 UI/TUI 提示")
    .option("--node-manager <name>", "技能的 Node 管理器：npm|pnpm|bun")
    .option("--json", "输出 JSON 摘要", false)
    .action(async (opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const installDaemon = resolveInstallDaemonFlag(command, {
          installDaemon: Boolean(opts.installDaemon),
        });
        const gatewayPort =
          typeof opts.gatewayPort === "string" ? Number.parseInt(opts.gatewayPort, 10) : undefined;
        await onboardCommand(
          {
            workspace: opts.workspace as string | undefined,
            nonInteractive: Boolean(opts.nonInteractive),
            acceptRisk: Boolean(opts.acceptRisk),
            flow: opts.flow as "quickstart" | "advanced" | "manual" | undefined,
            mode: opts.mode as "local" | "remote" | undefined,
            authChoice: opts.authChoice as AuthChoice | undefined,
            tokenProvider: opts.tokenProvider as string | undefined,
            token: opts.token as string | undefined,
            tokenProfileId: opts.tokenProfileId as string | undefined,
            tokenExpiresIn: opts.tokenExpiresIn as string | undefined,
            anthropicApiKey: opts.anthropicApiKey as string | undefined,
            openaiApiKey: opts.openaiApiKey as string | undefined,
            openrouterApiKey: opts.openrouterApiKey as string | undefined,
            aiGatewayApiKey: opts.aiGatewayApiKey as string | undefined,
            moonshotApiKey: opts.moonshotApiKey as string | undefined,
            kimiCodeApiKey: opts.kimiCodeApiKey as string | undefined,
            geminiApiKey: opts.geminiApiKey as string | undefined,
            zaiApiKey: opts.zaiApiKey as string | undefined,
            minimaxApiKey: opts.minimaxApiKey as string | undefined,
            syntheticApiKey: opts.syntheticApiKey as string | undefined,
            veniceApiKey: opts.veniceApiKey as string | undefined,
            opencodeZenApiKey: opts.opencodeZenApiKey as string | undefined,
            volcengineApiKey: opts.volcengineApiKey as string | undefined,
            gatewayPort:
              typeof gatewayPort === "number" && Number.isFinite(gatewayPort)
                ? gatewayPort
                : undefined,
            gatewayBind: opts.gatewayBind as GatewayBind | undefined,
            gatewayAuth: opts.gatewayAuth as GatewayAuthChoice | undefined,
            gatewayToken: opts.gatewayToken as string | undefined,
            gatewayPassword: opts.gatewayPassword as string | undefined,
            remoteUrl: opts.remoteUrl as string | undefined,
            remoteToken: opts.remoteToken as string | undefined,
            tailscale: opts.tailscale as TailscaleMode | undefined,
            tailscaleResetOnExit: Boolean(opts.tailscaleResetOnExit),
            reset: Boolean(opts.reset),
            installDaemon,
            daemonRuntime: opts.daemonRuntime as GatewayDaemonRuntime | undefined,
            skipChannels: Boolean(opts.skipChannels),
            skipSkills: Boolean(opts.skipSkills),
            skipHealth: Boolean(opts.skipHealth),
            skipUi: Boolean(opts.skipUi),
            nodeManager: opts.nodeManager as NodeManagerChoice | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });
}
