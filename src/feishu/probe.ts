import { getChildLogger } from "../logging.js";

const logger = getChildLogger({ module: "feishu-probe" });

import type { FeishuDomain } from "../config/types.feishu.js";

const FEISHU_API_BASES: Record<string, string> = {
  feishu: "https://open.feishu.cn/open-apis",
  lark: "https://open.larksuite.com/open-apis",
};

export type FeishuProbe = {
  ok: boolean;
  error?: string | null;
  elapsedMs: number;
  bot?: {
    appId?: string | null;
    appName?: string | null;
    avatarUrl?: string | null;
    openId?: string | null;
  };
};

type TokenResponse = {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
};

type BotInfoResponse = {
  code: number;
  msg: string;
  bot?: {
    app_name?: string;
    avatar_url?: string;
    open_id?: string;
  };
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeFeishu(
  appId: string,
  appSecret: string,
  timeoutMs: number = 5000,
  domain?: FeishuDomain,
): Promise<FeishuProbe> {
  const apiBase = FEISHU_API_BASES[domain ?? "feishu"];
  const started = Date.now();

  const result: FeishuProbe = {
    ok: false,
    error: null,
    elapsedMs: 0,
  };

  try {
    // Step 1: Get tenant_access_token
    const tokenRes = await fetchWithTimeout(
      `${apiBase}/auth/v3/tenant_access_token/internal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      },
      timeoutMs,
    );

    const tokenJson = (await tokenRes.json()) as TokenResponse;
    if (tokenJson.code !== 0 || !tokenJson.tenant_access_token) {
      result.error = tokenJson.msg || `Failed to get access token: code ${tokenJson.code}`;
      result.elapsedMs = Date.now() - started;
      return result;
    }

    const accessToken = tokenJson.tenant_access_token;

    // Step 2: Get bot info
    const botRes = await fetchWithTimeout(
      `${apiBase}/bot/v3/info`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      timeoutMs,
    );

    const botJson = (await botRes.json()) as BotInfoResponse;
    if (botJson.code !== 0) {
      result.error = botJson.msg || `Failed to get bot info: code ${botJson.code}`;
      result.elapsedMs = Date.now() - started;
      return result;
    }

    result.ok = true;
    result.bot = {
      appId: appId,
      appName: botJson.bot?.app_name ?? null,
      avatarUrl: botJson.bot?.avatar_url ?? null,
      openId: botJson.bot?.open_id ?? null,
    };
    result.elapsedMs = Date.now() - started;
    return result;
  } catch (err) {
    logger.debug?.(`Feishu probe failed: ${String(err)}`);
    return {
      ...result,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    };
  }
}
