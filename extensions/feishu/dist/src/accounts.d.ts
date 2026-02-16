import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
import type { FeishuConfig, FeishuDomain, ResolvedFeishuAccount } from "./types.js";
/**
 * List all Feishu account IDs.
 * If no accounts are configured, returns [DEFAULT_ACCOUNT_ID] for backward compatibility.
 */
export declare function listFeishuAccountIds(cfg: ClawdbotConfig): string[];
/**
 * Resolve the default account ID.
 */
export declare function resolveDefaultFeishuAccountId(cfg: ClawdbotConfig): string;
/**
 * Resolve Feishu credentials from a config.
 */
export declare function resolveFeishuCredentials(cfg?: FeishuConfig): {
    appId: string;
    appSecret: string;
    encryptKey?: string;
    verificationToken?: string;
    domain: FeishuDomain;
} | null;
/**
 * Resolve a complete Feishu account with merged config.
 */
export declare function resolveFeishuAccount(params: {
    cfg: ClawdbotConfig;
    accountId?: string | null;
}): ResolvedFeishuAccount;
/**
 * List all enabled and configured accounts.
 */
export declare function listEnabledFeishuAccounts(cfg: ClawdbotConfig): ResolvedFeishuAccount[];
//# sourceMappingURL=accounts.d.ts.map