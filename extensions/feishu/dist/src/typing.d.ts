import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
export type TypingIndicatorState = {
    messageId: string;
    reactionId: string | null;
};
/**
 * Add a typing indicator (reaction) to a message
 */
export declare function addTypingIndicator(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    accountId?: string;
}): Promise<TypingIndicatorState>;
/**
 * Remove a typing indicator (reaction) from a message
 */
export declare function removeTypingIndicator(params: {
    cfg: ClawdbotConfig;
    state: TypingIndicatorState;
    accountId?: string;
}): Promise<void>;
//# sourceMappingURL=typing.d.ts.map