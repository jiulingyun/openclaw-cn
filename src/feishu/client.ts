import * as Lark from "@larksuiteoapi/node-sdk";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import type { FeishuConfig, FeishuDomain } from "../config/types.feishu.js";

const logger = getChildLogger({ module: "feishu-client" });
const DEFAULT_ACCOUNT_ID = "default";

/** Convert config domain string to SDK Domain enum. */
export function toLarkDomain(domain?: string): Lark.Domain | undefined {
  if (!domain || domain === "feishu") return Lark.Domain.Feishu;
  if (domain === "lark") return Lark.Domain.Lark;
  return undefined;
}

export function getFeishuClient(
  accountIdOrAppId?: string,
  explicitAppSecret?: string,
  explicitDomain?: FeishuDomain,
) {
  const cfg = loadConfig();
  const feishuCfg = (cfg.channels as any)?.feishu as FeishuConfig | undefined;

  let appId: string | undefined;
  let appSecret: string | undefined = explicitAppSecret;

  // Determine if we received an accountId or an appId
  const isAppId = accountIdOrAppId?.startsWith("cli_");
  const accountId = isAppId ? undefined : accountIdOrAppId || DEFAULT_ACCOUNT_ID;

  if (!appSecret && feishuCfg?.accounts) {
    if (isAppId) {
      // When given an appId, find the account with matching appId
      for (const [, acc] of Object.entries(feishuCfg.accounts)) {
        if (acc.appId === accountIdOrAppId) {
          appId = acc.appId;
          appSecret = acc.appSecret;
          break;
        }
      }
      // If not found in accounts, use the appId directly (secret from first account as fallback)
      if (!appSecret) {
        appId = accountIdOrAppId;
        const firstKey = Object.keys(feishuCfg.accounts)[0];
        if (firstKey) {
          appSecret = feishuCfg.accounts[firstKey].appSecret;
        }
      }
    } else if (accountId && feishuCfg.accounts[accountId]) {
      // Try to get from accounts config by accountId
      const acc = feishuCfg.accounts[accountId];
      appId = acc.appId;
      appSecret = acc.appSecret;
    } else if (!accountId) {
      // Fallback to first account if accountId is not specified
      const firstKey = Object.keys(feishuCfg.accounts)[0];
      if (firstKey) {
        const acc = feishuCfg.accounts[firstKey];
        appId = acc.appId;
        appSecret = acc.appSecret;
      }
    }
  }

  // Fallback to top-level feishu config (for backward compatibility)
  if (!appId && feishuCfg?.appId) appId = feishuCfg.appId;
  if (!appSecret && feishuCfg?.appSecret) appSecret = feishuCfg.appSecret;

  // Resolve domain from config or parameter
  let domain: FeishuDomain | undefined = explicitDomain;
  if (!domain && feishuCfg?.accounts) {
    if (isAppId) {
      for (const [, acc] of Object.entries(feishuCfg.accounts)) {
        if (acc.appId === accountIdOrAppId && acc.domain) {
          domain = acc.domain;
          break;
        }
      }
    } else if (accountId && feishuCfg.accounts[accountId]?.domain) {
      domain = feishuCfg.accounts[accountId].domain;
    }
  }
  if (!domain && feishuCfg?.domain) domain = feishuCfg.domain;

  // Environment variables fallback
  if (!appId) appId = process.env.FEISHU_APP_ID;
  if (!appSecret) appSecret = process.env.FEISHU_APP_SECRET;
  if (!domain && process.env.FEISHU_DOMAIN) {
    const envDomain = process.env.FEISHU_DOMAIN.toLowerCase();
    if (envDomain === "lark" || envDomain === "feishu") domain = envDomain;
  }

  if (!appId || !appSecret) {
    throw new Error(
      "飞书 App ID 和 App Secret 未配置。请通过 'openclaw-cn onboard' 配置飞书通道，或设置 FEISHU_APP_ID/SECRET 环境变量。",
    );
  }

  const client = new Lark.Client({
    appId,
    appSecret,
    domain: toLarkDomain(domain),
    logger: {
      debug: (msg) => {
        logger.debug(msg);
      },
      info: (msg) => {
        logger.info(msg);
      },
      warn: (msg) => {
        logger.warn(msg);
      },
      error: (msg) => {
        logger.error(msg);
      },
      trace: (msg) => {
        logger.silly(msg);
      },
    },
  });

  return client;
}
