import * as Lark from "@larksuiteoapi/node-sdk";
import * as http from "http";
import { resolveFeishuAccount, listEnabledFeishuAccounts } from "./accounts.js";
import { handleFeishuMessage } from "./bot.js";
import { createFeishuWSClient, createEventDispatcher } from "./client.js";
import { probeFeishu } from "./probe.js";
// Per-account WebSocket clients, HTTP servers, and bot info
const wsClients = new Map();
const httpServers = new Map();
const botOpenIds = new Map();
const FEISHU_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;
const FEISHU_WEBHOOK_BODY_TIMEOUT_MS = 30_000;
/** Inline body limit guard (installRequestBodyLimitGuard is not exported from plugin-sdk). */
function installBodyLimitGuard(req, res, opts) {
    let tripped = false;
    let totalBytes = 0;
    const onData = (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > opts.maxBytes) {
            tripped = true;
            req.destroy();
            if (!res.headersSent) {
                res.statusCode = 413;
                res.setHeader("Content-Type", "text/plain");
                res.end("Request body too large");
            }
        }
    };
    const timer = setTimeout(() => {
        if (!tripped) {
            tripped = true;
            req.destroy();
            if (!res.headersSent) {
                res.statusCode = 408;
                res.setHeader("Content-Type", "text/plain");
                res.end("Request body timeout");
            }
        }
    }, opts.timeoutMs);
    req.on("data", onData);
    return {
        isTripped: () => tripped,
        dispose: () => {
            clearTimeout(timer);
            req.removeListener("data", onData);
        },
    };
}
async function fetchBotOpenId(account) {
    try {
        const result = await probeFeishu(account);
        return result.ok ? result.botOpenId : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Register common event handlers on an EventDispatcher.
 * When fireAndForget is true (webhook mode), message handling is not awaited
 * to avoid blocking the HTTP response (Lark requires <3s response).
 */
function registerEventHandlers(eventDispatcher, context) {
    const { cfg, accountId, runtime, chatHistories, fireAndForget } = context;
    const log = runtime?.log ?? console.log;
    const error = runtime?.error ?? console.error;
    eventDispatcher.register({
        "im.message.receive_v1": async (data) => {
            try {
                const event = data;
                const promise = handleFeishuMessage({
                    cfg,
                    event,
                    botOpenId: botOpenIds.get(accountId),
                    runtime,
                    chatHistories,
                    accountId,
                });
                if (fireAndForget) {
                    promise.catch((err) => {
                        error(`feishu[${accountId}]: error handling message: ${String(err)}`);
                    });
                }
                else {
                    await promise;
                }
            }
            catch (err) {
                error(`feishu[${accountId}]: error handling message: ${String(err)}`);
            }
        },
        "im.message.message_read_v1": async () => {
            // Ignore read receipts
        },
        "im.chat.member.bot.added_v1": async (data) => {
            try {
                const event = data;
                log(`feishu[${accountId}]: bot added to chat ${event.chat_id}`);
            }
            catch (err) {
                error(`feishu[${accountId}]: error handling bot added event: ${String(err)}`);
            }
        },
        "im.chat.member.bot.deleted_v1": async (data) => {
            try {
                const event = data;
                log(`feishu[${accountId}]: bot removed from chat ${event.chat_id}`);
            }
            catch (err) {
                error(`feishu[${accountId}]: error handling bot removed event: ${String(err)}`);
            }
        },
    });
}
/**
 * Monitor a single Feishu account.
 */
async function monitorSingleAccount(params) {
    const { cfg, account, runtime, abortSignal } = params;
    const { accountId } = account;
    const log = runtime?.log ?? console.log;
    // Fetch bot open_id
    const botOpenId = await fetchBotOpenId(account);
    botOpenIds.set(accountId, botOpenId ?? "");
    log(`feishu[${accountId}]: bot open_id resolved: ${botOpenId ?? "unknown"}`);
    const connectionMode = account.config.connectionMode ?? "websocket";
    const eventDispatcher = createEventDispatcher(account);
    const chatHistories = new Map();
    registerEventHandlers(eventDispatcher, {
        cfg,
        accountId,
        runtime,
        chatHistories,
        fireAndForget: connectionMode === "webhook",
    });
    if (connectionMode === "webhook") {
        return monitorWebhook({ params, accountId, eventDispatcher });
    }
    return monitorWebSocket({ params, accountId, eventDispatcher });
}
async function monitorWebSocket({ params, accountId, eventDispatcher, }) {
    const { account, runtime, abortSignal } = params;
    const log = runtime?.log ?? console.log;
    const error = runtime?.error ?? console.error;
    log(`feishu[${accountId}]: starting WebSocket connection...`);
    const wsClient = createFeishuWSClient(account);
    wsClients.set(accountId, wsClient);
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            wsClients.delete(accountId);
            botOpenIds.delete(accountId);
        };
        const handleAbort = () => {
            log(`feishu[${accountId}]: abort signal received, stopping`);
            cleanup();
            resolve();
        };
        if (abortSignal?.aborted) {
            cleanup();
            resolve();
            return;
        }
        abortSignal?.addEventListener("abort", handleAbort, { once: true });
        try {
            wsClient.start({ eventDispatcher });
            log(`feishu[${accountId}]: WebSocket client started`);
        }
        catch (err) {
            cleanup();
            abortSignal?.removeEventListener("abort", handleAbort);
            reject(err);
        }
    });
}
async function monitorWebhook({ params, accountId, eventDispatcher, }) {
    const { account, runtime, abortSignal } = params;
    const log = runtime?.log ?? console.log;
    const error = runtime?.error ?? console.error;
    const port = account.config.webhookPort ?? 3000;
    const path = account.config.webhookPath ?? "/feishu/events";
    log(`feishu[${accountId}]: starting Webhook server on port ${port}, path ${path}...`);
    const server = http.createServer();
    const webhookHandler = Lark.adaptDefault(path, eventDispatcher, { autoChallenge: true });
    server.on("request", (req, res) => {
        const guard = installBodyLimitGuard(req, res, {
            maxBytes: FEISHU_WEBHOOK_MAX_BODY_BYTES,
            timeoutMs: FEISHU_WEBHOOK_BODY_TIMEOUT_MS,
        });
        if (guard.isTripped()) {
            return;
        }
        void Promise.resolve(webhookHandler(req, res))
            .catch((err) => {
            if (!guard.isTripped()) {
                error(`feishu[${accountId}]: webhook handler error: ${String(err)}`);
            }
        })
            .finally(() => {
            guard.dispose();
        });
    });
    httpServers.set(accountId, server);
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            server.close();
            httpServers.delete(accountId);
            botOpenIds.delete(accountId);
        };
        const handleAbort = () => {
            log(`feishu[${accountId}]: abort signal received, stopping Webhook server`);
            cleanup();
            resolve();
        };
        if (abortSignal?.aborted) {
            cleanup();
            resolve();
            return;
        }
        abortSignal?.addEventListener("abort", handleAbort, { once: true });
        server.listen(port, () => {
            log(`feishu[${accountId}]: Webhook server listening on port ${port}`);
        });
        server.on("error", (err) => {
            error(`feishu[${accountId}]: Webhook server error: ${err}`);
            abortSignal?.removeEventListener("abort", handleAbort);
            reject(err);
        });
    });
}
/**
 * Main entry: start monitoring for all enabled accounts.
 */
export async function monitorFeishuProvider(opts = {}) {
    const cfg = opts.config;
    if (!cfg) {
        throw new Error("Config is required for Feishu monitor");
    }
    const log = opts.runtime?.log ?? console.log;
    // If accountId is specified, only monitor that account
    if (opts.accountId) {
        const account = resolveFeishuAccount({ cfg, accountId: opts.accountId });
        if (!account.enabled || !account.configured) {
            throw new Error(`Feishu account "${opts.accountId}" not configured or disabled`);
        }
        return monitorSingleAccount({
            cfg,
            account,
            runtime: opts.runtime,
            abortSignal: opts.abortSignal,
        });
    }
    // Otherwise, start all enabled accounts
    const accounts = listEnabledFeishuAccounts(cfg);
    if (accounts.length === 0) {
        throw new Error("No enabled Feishu accounts configured");
    }
    log(`feishu: starting ${accounts.length} account(s): ${accounts.map((a) => a.accountId).join(", ")}`);
    // Start all accounts in parallel
    await Promise.all(accounts.map((account) => monitorSingleAccount({
        cfg,
        account,
        runtime: opts.runtime,
        abortSignal: opts.abortSignal,
    })));
}
/**
 * Stop monitoring for a specific account or all accounts.
 */
export function stopFeishuMonitor(accountId) {
    if (accountId) {
        wsClients.delete(accountId);
        const server = httpServers.get(accountId);
        if (server) {
            server.close();
            httpServers.delete(accountId);
        }
        botOpenIds.delete(accountId);
    }
    else {
        wsClients.clear();
        for (const server of httpServers.values()) {
            server.close();
        }
        httpServers.clear();
        botOpenIds.clear();
    }
}
//# sourceMappingURL=monitor.js.map