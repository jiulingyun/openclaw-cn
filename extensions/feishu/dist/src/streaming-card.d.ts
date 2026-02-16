/**
 * Feishu Streaming Card - Card Kit streaming API for real-time text output
 */
import type { Client } from "@larksuiteoapi/node-sdk";
import type { FeishuDomain } from "./types.js";
type Credentials = {
    appId: string;
    appSecret: string;
    domain?: FeishuDomain;
};
/** Streaming card session manager */
export declare class FeishuStreamingSession {
    private client;
    private creds;
    private state;
    private queue;
    private closed;
    private log?;
    private lastUpdateTime;
    private pendingText;
    private updateThrottleMs;
    constructor(client: Client, creds: Credentials, log?: (msg: string) => void);
    start(receiveId: string, receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id"): Promise<void>;
    update(text: string): Promise<void>;
    close(finalText?: string): Promise<void>;
    isActive(): boolean;
}
export {};
//# sourceMappingURL=streaming-card.d.ts.map