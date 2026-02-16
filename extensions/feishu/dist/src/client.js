import * as Lark from "@larksuiteoapi/node-sdk";
// Multi-account client cache
const clientCache = new Map();
function resolveDomain(domain) {
    if (domain === "lark") {
        return Lark.Domain.Lark;
    }
    if (domain === "feishu" || !domain) {
        return Lark.Domain.Feishu;
    }
    return domain.replace(/\/+$/, ""); // Custom URL for private deployment
}
/**
 * Create or get a cached Feishu client for an account.
 * Accepts any object with appId, appSecret, and optional domain/accountId.
 */
export function createFeishuClient(creds) {
    const { accountId = "default", appId, appSecret, domain } = creds;
    if (!appId || !appSecret) {
        throw new Error(`Feishu credentials not configured for account "${accountId}"`);
    }
    // Check cache
    const cached = clientCache.get(accountId);
    if (cached &&
        cached.config.appId === appId &&
        cached.config.appSecret === appSecret &&
        cached.config.domain === domain) {
        return cached.client;
    }
    // Create new client
    const client = new Lark.Client({
        appId,
        appSecret,
        appType: Lark.AppType.SelfBuild,
        domain: resolveDomain(domain),
    });
    // Cache it
    clientCache.set(accountId, {
        client,
        config: { appId, appSecret, domain },
    });
    return client;
}
/**
 * Create a Feishu WebSocket client for an account.
 * Note: WSClient is not cached since each call creates a new connection.
 */
export function createFeishuWSClient(account) {
    const { accountId, appId, appSecret, domain } = account;
    if (!appId || !appSecret) {
        throw new Error(`Feishu credentials not configured for account "${accountId}"`);
    }
    return new Lark.WSClient({
        appId,
        appSecret,
        domain: resolveDomain(domain),
        loggerLevel: Lark.LoggerLevel.info,
    });
}
/**
 * Create an event dispatcher for an account.
 */
export function createEventDispatcher(account) {
    return new Lark.EventDispatcher({
        encryptKey: account.encryptKey,
        verificationToken: account.verificationToken,
    });
}
/**
 * Get a cached client for an account (if exists).
 */
export function getFeishuClient(accountId) {
    return clientCache.get(accountId)?.client ?? null;
}
/**
 * Clear client cache for a specific account or all accounts.
 */
export function clearClientCache(accountId) {
    if (accountId) {
        clientCache.delete(accountId);
    }
    else {
        clientCache.clear();
    }
}
//# sourceMappingURL=client.js.map