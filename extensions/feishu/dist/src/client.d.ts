import * as Lark from "@larksuiteoapi/node-sdk";
import type { FeishuDomain, ResolvedFeishuAccount } from "./types.js";
/**
 * Credentials needed to create a Feishu client.
 * Both FeishuConfig and ResolvedFeishuAccount satisfy this interface.
 */
export type FeishuClientCredentials = {
    accountId?: string;
    appId?: string;
    appSecret?: string;
    domain?: FeishuDomain;
};
/**
 * Create or get a cached Feishu client for an account.
 * Accepts any object with appId, appSecret, and optional domain/accountId.
 */
export declare function createFeishuClient(creds: FeishuClientCredentials): Lark.Client;
/**
 * Create a Feishu WebSocket client for an account.
 * Note: WSClient is not cached since each call creates a new connection.
 */
export declare function createFeishuWSClient(account: ResolvedFeishuAccount): Lark.WSClient;
/**
 * Create an event dispatcher for an account.
 */
export declare function createEventDispatcher(account: ResolvedFeishuAccount): Lark.EventDispatcher;
/**
 * Get a cached client for an account (if exists).
 */
export declare function getFeishuClient(accountId: string): Lark.Client | null;
/**
 * Clear client cache for a specific account or all accounts.
 */
export declare function clearClientCache(accountId?: string): void;
//# sourceMappingURL=client.d.ts.map