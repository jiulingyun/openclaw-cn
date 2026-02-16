/** Inline allowlist matcher (resolveAllowlistMatchSimple is not exported from plugin-sdk). */
export function resolveFeishuAllowlistMatch(params) {
    const { allowFrom, senderId, senderName } = params;
    if (allowFrom.includes("*")) {
        return { allowed: true, matchKey: "*", matchSource: "wildcard" };
    }
    const idStr = String(senderId);
    for (const entry of allowFrom) {
        const key = String(entry);
        if (key === idStr) {
            return { allowed: true, matchKey: key, matchSource: "id" };
        }
        if (senderName && key.toLowerCase() === senderName.toLowerCase()) {
            return { allowed: true, matchKey: key, matchSource: "name" };
        }
    }
    return { allowed: false };
}
export function resolveFeishuGroupConfig(params) {
    const groups = params.cfg?.groups ?? {};
    const groupId = params.groupId?.trim();
    if (!groupId) {
        return undefined;
    }
    const direct = groups[groupId];
    if (direct) {
        return direct;
    }
    const lowered = groupId.toLowerCase();
    const matchKey = Object.keys(groups).find((key) => key.toLowerCase() === lowered);
    return matchKey ? groups[matchKey] : undefined;
}
export function resolveFeishuGroupToolPolicy(params) {
    const cfg = params.cfg.channels?.feishu;
    if (!cfg) {
        return undefined;
    }
    const groupConfig = resolveFeishuGroupConfig({
        cfg,
        groupId: params.groupId,
    });
    return groupConfig?.tools;
}
export function isFeishuGroupAllowed(params) {
    const { groupPolicy } = params;
    if (groupPolicy === "disabled") {
        return false;
    }
    if (groupPolicy === "open") {
        return true;
    }
    return resolveFeishuAllowlistMatch(params).allowed;
}
export function resolveFeishuReplyPolicy(params) {
    if (params.isDirectMessage) {
        return { requireMention: false };
    }
    const requireMention = params.groupConfig?.requireMention ?? params.globalConfig?.requireMention ?? true;
    return { requireMention };
}
//# sourceMappingURL=policy.js.map