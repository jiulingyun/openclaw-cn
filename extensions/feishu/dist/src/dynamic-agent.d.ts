import type { OpenClawConfig, PluginRuntime } from "openclaw/plugin-sdk";
import type { DynamicAgentCreationConfig } from "./types.js";
export type MaybeCreateDynamicAgentResult = {
    created: boolean;
    updatedCfg: OpenClawConfig;
    agentId?: string;
};
/**
 * Check if a dynamic agent should be created for a DM user and create it if needed.
 * This creates a unique agent instance with its own workspace for each DM user.
 */
export declare function maybeCreateDynamicAgent(params: {
    cfg: OpenClawConfig;
    runtime: PluginRuntime;
    senderOpenId: string;
    dynamicCfg: DynamicAgentCreationConfig;
    log: (msg: string) => void;
}): Promise<MaybeCreateDynamicAgentResult>;
//# sourceMappingURL=dynamic-agent.d.ts.map