import { loadConfig } from "../config/config.js";
import { normalizeAccountId } from "../routing/session-key.js";
import type { FeishuConfig, FeishuAccountConfig, FeishuDomain } from "../config/types.feishu.js";

export type ResolvedFeishuAccount = {
  accountId: string;
  config: FeishuAccountConfig;
  tokenSource: "config" | "env" | "none";
  name?: string;
  enabled?: boolean;
};

export function listFeishuAccountIds(cfg: ReturnType<typeof loadConfig>): string[] {
  const feishuCfg = (cfg.channels as any)?.feishu as FeishuConfig | undefined;
  const accounts = feishuCfg?.accounts;
  if (!accounts) {
    if (process.env.FEISHU_APP_ID) return ["default"];
    return [];
  }
  return Object.keys(accounts);
}

export function resolveDefaultFeishuAccountId(cfg: ReturnType<typeof loadConfig>): string {
  const ids = listFeishuAccountIds(cfg);
  return ids[0] ?? "default";
}

export function resolveFeishuAccount(params: {
  cfg: ReturnType<typeof loadConfig>;
  accountId?: string | null;
}): ResolvedFeishuAccount {
  const { cfg, accountId } = params;
  const feishuCfg = (cfg.channels as any)?.feishu as FeishuConfig | undefined;

  const resolvedId = accountId ? normalizeAccountId(accountId) : resolveDefaultFeishuAccountId(cfg);

  let config: FeishuAccountConfig = { appId: "", appSecret: "" };
  let tokenSource: "config" | "env" | "none" = "none";
  let enabled = true;
  let name: string | undefined;

  if (feishuCfg?.accounts?.[resolvedId]) {
    config = feishuCfg.accounts[resolvedId];
    tokenSource = "config";
    name = config.botName;
  } else if (
    resolvedId === "default" &&
    process.env.FEISHU_APP_ID &&
    process.env.FEISHU_APP_SECRET
  ) {
    const envDomain = process.env.FEISHU_DOMAIN?.toLowerCase();
    config = {
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      domain: envDomain === "lark" ? "lark" : undefined,
    };
    tokenSource = "env";
  }

  if (config.appId && config.appSecret) {
    // ok
  } else {
    tokenSource = "none";
  }

  return {
    accountId: resolvedId,
    config,
    tokenSource,
    name,
    enabled,
  };
}
