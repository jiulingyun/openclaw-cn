import { Command } from "commander";
import { loadConfig } from "../config/config.js";
import { resolveFeishuAccount, listFeishuAccountIds } from "../feishu/accounts.js";
import { getFeishuClient } from "../feishu/client.js";
import { probeFeishu } from "../feishu/probe.js";
import { sendMessageFeishu } from "../feishu/send.js";

export function registerFeishuCommand(program: Command) {
  const feishuCmd = program.command("feishu").description("飞书调试工具");

  // feishu probe - 测试飞书凭据
  feishuCmd
    .command("probe")
    .description("测试飞书机器人凭据连通性")
    .option("--account <id>", "账户 ID")
    .option("--timeout <ms>", "超时时间（毫秒）", "10000")
    .option("--json", "输出 JSON 格式")
    .action(async (opts) => {
      const cfg = loadConfig();
      const accountIds = listFeishuAccountIds(cfg);

      if (accountIds.length === 0) {
        console.error("未找到飞书账户配置。请先配置 channels.feishu.accounts");
        process.exit(1);
      }

      const accountId = opts.account || accountIds[0];
      const account = resolveFeishuAccount({ cfg, accountId });

      if (account.tokenSource === "none") {
        console.error(`账户 "${accountId}" 未配置 appId/appSecret`);
        process.exit(1);
      }

      console.log(`正在测试飞书账户: ${accountId}`);
      console.log(`App ID: ${account.config.appId}`);
      console.log("");

      const result = await probeFeishu(
        account.config.appId,
        account.config.appSecret,
        Number(opts.timeout),
        account.config.domain,
      );

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.ok) {
          console.log("✅ 连接成功！");
          console.log(`   机器人名称: ${result.bot?.appName || "未知"}`);
          console.log(`   耗时: ${result.elapsedMs}ms`);
        } else {
          console.log("❌ 连接失败");
          console.log(`   错误: ${result.error}`);
          console.log(`   耗时: ${result.elapsedMs}ms`);
        }
      }

      process.exit(result.ok ? 0 : 1);
    });

  // feishu send - 发送测试消息
  feishuCmd
    .command("send")
    .description("发送飞书测试消息")
    .requiredOption("--to <chat_id>", "目标聊天 ID（chat_id）")
    .requiredOption("--message <text>", "消息内容")
    .option("--account <id>", "账户 ID")
    .option("--json", "输出 JSON 格式")
    .action(async (opts) => {
      const cfg = loadConfig();
      const accountIds = listFeishuAccountIds(cfg);

      if (accountIds.length === 0) {
        console.error("未找到飞书账户配置");
        process.exit(1);
      }

      const accountId = opts.account || accountIds[0];
      const account = resolveFeishuAccount({ cfg, accountId });

      if (account.tokenSource === "none") {
        console.error(`账户 "${accountId}" 未配置`);
        process.exit(1);
      }

      console.log(`正在发送消息到: ${opts.to}`);

      try {
        const client = getFeishuClient(
          account.config.appId,
          account.config.appSecret,
          account.config.domain,
        );
        const result = await sendMessageFeishu(
          client,
          opts.to,
          { text: opts.message },
          { msgType: "text", receiveIdType: "chat_id" },
        );

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log("✅ 消息发送成功！");
          console.log(`   消息 ID: ${result?.message_id || "未知"}`);
        }
      } catch (err) {
        console.error("❌ 发送失败:", err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // feishu accounts - 列出账户
  feishuCmd
    .command("accounts")
    .description("列出已配置的飞书账户")
    .option("--json", "输出 JSON 格式")
    .action(async (opts) => {
      const cfg = loadConfig();
      const accountIds = listFeishuAccountIds(cfg);

      if (accountIds.length === 0) {
        console.log("未配置任何飞书账户");
        return;
      }

      const accounts = accountIds.map((id) => {
        const account = resolveFeishuAccount({ cfg, accountId: id });
        return {
          accountId: id,
          appId: account.config.appId,
          tokenSource: account.tokenSource,
          name: account.name,
          enabled: account.enabled,
        };
      });

      if (opts.json) {
        console.log(JSON.stringify(accounts, null, 2));
      } else {
        console.log("已配置的飞书账户:\n");
        for (const acc of accounts) {
          console.log(`  ${acc.accountId}`);
          console.log(`    App ID: ${acc.appId || "(未设置)"}`);
          console.log(`    来源: ${acc.tokenSource}`);
          console.log(`    名称: ${acc.name || "(未设置)"}`);
          console.log(`    启用: ${acc.enabled ? "是" : "否"}`);
          console.log("");
        }
      }
    });

  return feishuCmd;
}
