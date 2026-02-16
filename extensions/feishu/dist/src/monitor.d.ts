import { type OpenClawConfig as ClawdbotConfig, type RuntimeEnv } from "openclaw/plugin-sdk";
export type MonitorFeishuOpts = {
    config?: ClawdbotConfig;
    runtime?: RuntimeEnv;
    abortSignal?: AbortSignal;
    accountId?: string;
};
/**
 * Main entry: start monitoring for all enabled accounts.
 */
export declare function monitorFeishuProvider(opts?: MonitorFeishuOpts): Promise<void>;
/**
 * Stop monitoring for a specific account or all accounts.
 */
export declare function stopFeishuMonitor(accountId?: string): void;
//# sourceMappingURL=monitor.d.ts.map