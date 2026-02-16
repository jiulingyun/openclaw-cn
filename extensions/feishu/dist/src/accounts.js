import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk";
/**
 * List all configured account IDs from the accounts field.
 */
function listConfiguredAccountIds(cfg) {
    const accounts = cfg.channels?.feishu?.accounts;
    if (!accounts || typeof accounts !== "object") {
        return [];
    }
    return Object.keys(accounts).filter(Boolean);
}
/**
 * List all Feishu account IDs.
 * If no accounts are configured, returns [DEFAULT_ACCOUNT_ID] for backward compatibility.
 */
export function listFeishuAccountIds(cfg) {
    const ids = listConfiguredAccountIds(cfg);
    if (ids.length === 0) {
        // Backward compatibility: no accounts configured, use default
        return [DEFAULT_ACCOUNT_ID];
    }
    return [...ids].sort((a, b) => a.localeCompare(b));
}
/**
 * Resolve the default account ID.
 */
export function resolveDefaultFeishuAccountId(cfg) {
    const ids = listFeishuAccountIds(cfg);
    if (ids.includes(DEFAULT_ACCOUNT_ID)) {
        return DEFAULT_ACCOUNT_ID;
    }
    return ids[0] ?? DEFAULT_ACCOUNT_ID;
}
/**
 * Get the raw account-specific config.
 */
function resolveAccountConfig(cfg, accountId) {
    const accounts = cfg.channels?.feishu?.accounts;
    if (!accounts || typeof accounts !== "object") {
        return undefined;
    }
    return accounts[accountId];
}
/**
 * Merge top-level config with account-specific config.
 * Account-specific fields override top-level fields.
 */
function mergeFeishuAccountConfig(cfg, accountId) {
    const feishuCfg = cfg.channels?.feishu;
    // Extract base config (exclude accounts field to avoid recursion)
    const { accounts: _ignored, ...base } = feishuCfg ?? {};
    // Get account-specific overrides
    const account = resolveAccountConfig(cfg, accountId) ?? {};
    // Merge: account config overrides base config
    return { ...base, ...account };
}
/**
 * Resolve Feishu credentials from a config.
 */
export function resolveFeishuCredentials(cfg) {
    const appId = cfg?.appId?.trim();
    const appSecret = cfg?.appSecret?.trim();
    if (!appId || !appSecret) {
        return null;
    }
    return {
        appId,
        appSecret,
        encryptKey: cfg?.encryptKey?.trim() || undefined,
        verificationToken: cfg?.verificationToken?.trim() || undefined,
        domain: cfg?.domain ?? "feishu",
    };
}
/**
 * Resolve a complete Feishu account with merged config.
 */
export function resolveFeishuAccount(params) {
    const accountId = normalizeAccountId(params.accountId);
    const feishuCfg = params.cfg.channels?.feishu;
    // Base enabled state (top-level)
    const baseEnabled = feishuCfg?.enabled !== false;
    // Merge configs
    const merged = mergeFeishuAccountConfig(params.cfg, accountId);
    // Account-level enabled state
    const accountEnabled = merged.enabled !== false;
    const enabled = baseEnabled && accountEnabled;
    // Resolve credentials from merged config
    const creds = resolveFeishuCredentials(merged);
    return {
        accountId,
        enabled,
        configured: Boolean(creds),
        name: merged.name?.trim() || undefined,
        appId: creds?.appId,
        appSecret: creds?.appSecret,
        encryptKey: creds?.encryptKey,
        verificationToken: creds?.verificationToken,
        domain: creds?.domain ?? "feishu",
        config: merged,
    };
}
/**
 * List all enabled and configured accounts.
 */
export function listEnabledFeishuAccounts(cfg) {
    return listFeishuAccountIds(cfg)
        .map((accountId) => resolveFeishuAccount({ cfg, accountId }))
        .filter((account) => account.enabled && account.configured);
}
//# sourceMappingURL=accounts.js.map