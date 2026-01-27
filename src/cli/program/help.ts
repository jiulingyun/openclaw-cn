import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { isRich, theme } from "../../terminal/theme.js";
import { formatCliBannerLine, hasEmittedCliBanner } from "../banner.js";
import type { ProgramContext } from "./context.js";

const EXAMPLES = [
  ["clawdbot-cn channels login --verbose", "连接个人 WhatsApp Web 并显示二维码和连接日志。"],
  [
    'clawdbot-cn message send --target +15555550123 --message "Hi" --json',
    "通过你的 Web 会话发送消息并输出 JSON 结果。",
  ],
  ["clawdbot-cn gateway --port 18789", "在本地运行 WebSocket 网关。"],
  ["clawdbot-cn --dev gateway", "在 ws://127.0.0.1:19001 运行开发网关（隔离状态/配置）。"],
  ["clawdbot-cn gateway --force", "终止占用默认网关端口的进程，然后启动网关。"],
  ["clawdbot-cn gateway ...", "通过 WebSocket 控制网关。"],
  [
    'clawdbot-cn agent --to +15555550123 --message "Run summary" --deliver',
    "通过网关与智能体直接对话；可选择发送 WhatsApp 回复。",
  ],
  [
    'clawdbot-cn message send --channel telegram --target @mychat --message "Hi"',
    "通过你的 Telegram 机器人发送消息。",
  ],
] as const;

export function configureProgramHelp(program: Command, ctx: ProgramContext) {
  program
    .name("clawdbot-cn")
    .description("")
    .version(ctx.programVersion)
    .option(
      "--dev",
      "开发模式：将状态隔离到 ~/.clawdbot-cn-dev，默认网关端口 19001，并调整派生端口（浏览器/画布）",
    )
    .option(
      "--profile <name>",
      "使用命名配置文件（将 CLAWDBOT_STATE_DIR/CLAWDBOT_CONFIG_PATH 隔离到 ~/.clawdbot-cn-<name>）",
    );

  program.option("--no-color", "禁用 ANSI 颜色", false);

  program.configureHelp({
    optionTerm: (option) => theme.option(option.flags),
    subcommandTerm: (cmd) => theme.command(cmd.name()),
  });

  program.configureOutput({
    writeOut: (str) => {
      const colored = str
        .replace(/^Usage:/gm, theme.heading("用法："))
        .replace(/^Options:/gm, theme.heading("选项："))
        .replace(/^Commands:/gm, theme.heading("命令："));
      process.stdout.write(colored);
    },
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(theme.error(str)),
  });

  if (
    process.argv.includes("-V") ||
    process.argv.includes("--version") ||
    process.argv.includes("-v")
  ) {
    console.log(ctx.programVersion);
    process.exit(0);
  }

  program.addHelpText("beforeAll", () => {
    if (hasEmittedCliBanner()) return "";
    const rich = isRich();
    const line = formatCliBannerLine(ctx.programVersion, { richTty: rich });
    return `\n${line}\n`;
  });

  const fmtExamples = EXAMPLES.map(
    ([cmd, desc]) => `  ${theme.command(cmd)}\n    ${theme.muted(desc)}`,
  ).join("\n");

  program.addHelpText("afterAll", ({ command }) => {
    if (command !== program) return "";
    const docs = formatDocsLink("/cli", "docs.clawd.bot/cli");
    return `
${theme.heading("示例：")}
${fmtExamples}

${theme.muted("文档：")} ${docs}
`;
  });
}
