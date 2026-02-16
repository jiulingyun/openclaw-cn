import type { AllowlistMatch, ChannelGroupContext, GroupToolPolicyConfig } from "openclaw/plugin-sdk";
import type { FeishuConfig, FeishuGroupConfig } from "./types.js";
export type FeishuAllowlistMatch = AllowlistMatch<"wildcard" | "id" | "name">;
/** Inline allowlist matcher (resolveAllowlistMatchSimple is not exported from plugin-sdk). */
export declare function resolveFeishuAllowlistMatch(params: {
    allowFrom: Array<string | number>;
    senderId: string;
    senderName?: string | null;
}): FeishuAllowlistMatch;
export declare function resolveFeishuGroupConfig(params: {
    cfg?: FeishuConfig;
    groupId?: string | null;
}): FeishuGroupConfig | undefined;
export declare function resolveFeishuGroupToolPolicy(params: ChannelGroupContext): GroupToolPolicyConfig | undefined;
export declare function isFeishuGroupAllowed(params: {
    groupPolicy: "open" | "allowlist" | "disabled";
    allowFrom: Array<string | number>;
    senderId: string;
    senderName?: string | null;
}): boolean;
export declare function resolveFeishuReplyPolicy(params: {
    isDirectMessage: boolean;
    globalConfig?: FeishuConfig;
    groupConfig?: FeishuGroupConfig;
}): {
    requireMention: boolean;
};
//# sourceMappingURL=policy.d.ts.map