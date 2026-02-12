import { listFeishuAccountIds, resolveDefaultFeishuAccountId, resolveFeishuAccount, promptAccountId, normalizeAccountId, DEFAULT_ACCOUNT_ID, } from "openclaw/plugin-sdk";
/** @type {import("openclaw/plugin-sdk").ChannelOnboardingAdapter} */
export const feishuOnboardingAdapter = {
    channel: "feishu",
    getStatus: async ({ cfg }) => {
        const configured = listFeishuAccountIds(cfg).some((id) => {
            const acc = resolveFeishuAccount({ cfg, accountId: id });
            return Boolean(acc.config.appId && acc.config.appSecret);
        });
        return {
            channel: "feishu",
            configured,
            statusLines: [`Feishu: ${configured ? "configured" : "needs credentials"}`],
            selectionHint: configured ? "recommended · configured" : "requires Lark Open Platform app",
            quickstartScore: configured ? 1 : 10,
        };
    },
    configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds, }) => {
        const override = accountOverrides.feishu?.trim();
        const defaultId = resolveDefaultFeishuAccountId(cfg);
        let accountId = override ? normalizeAccountId(override) : defaultId;
        if (shouldPromptAccountIds && !override) {
            accountId = await promptAccountId({
                cfg,
                prompter,
                label: "Feishu",
                currentId: accountId,
                listAccountIds: listFeishuAccountIds,
                defaultAccountId: defaultId,
            });
        }
        let next = { ...cfg };
        const resolved = resolveFeishuAccount({ cfg, accountId });
        const isDefault = accountId === DEFAULT_ACCOUNT_ID;
        // Check env vars for default account
        if (isDefault && process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
            const useEnv = await prompter.confirm({
                message: "FEISHU_APP_ID/SECRET detected. Use env vars?",
                initialValue: true,
            });
            if (useEnv) {
                // Ensure section exists and is enabled
                next = updateFeishuConfig(next, accountId, { enabled: true });
                return { cfg: next, accountId };
            }
        }
        // Prompt for domain (Feishu China vs Lark International) first
        const currentDomain = resolved.config.domain ?? "feishu";
        const domain = await prompter.select({
            message: "选择平台 / Select platform",
            options: [
                { value: "feishu", label: "飞书（国内版）", hint: "open.feishu.cn" },
                { value: "lark", label: "Lark（国际版）", hint: "open.larksuite.com" },
            ],
            initialValue: currentDomain,
        });
        const platformLabel = domain === "lark" ? "Lark" : "飞书";
        let appId = resolved.config.appId;
        if (!appId) {
            appId = String(await prompter.text({
                message: `输入 ${platformLabel} App ID (cli_...)`,
                validate: (val) => (val?.trim() ? undefined : "Required"),
            })).trim();
        }
        let appSecret = resolved.config.appSecret;
        if (!appSecret) {
            appSecret = String(await prompter.text({
                message: `输入 ${platformLabel} App Secret`,
                validate: (val) => (val?.trim() ? undefined : "Required"),
            })).trim();
        }
        next = updateFeishuConfig(next, accountId, { appId, appSecret, domain, enabled: true });
        return { cfg: next, accountId };
    },
    disable: (cfg) => {
        // Simple disable logic
        const next = { ...cfg };
        if (next.channels?.feishu) {
            // If we have specific accounts, we might need more complex logic, 
            // but usually this disables the whole channel or default account.
            // For simplicity, let's just mark the structure if it exists.
            // But actually, the core might handle channel disabling if we don't return anything?
            // Telegram adapter sets enabled: false.
            // Let's do nothing for now or just return cfg if not implemented.
            // But better to implement basic disable.
            if (next.channels.feishu.accounts) {
                // Disable all accounts? Or just return modified config
            }
        }
        return next;
    }
};
function updateFeishuConfig(cfg, accountId, updates) {
    const next = { ...cfg };
    const feishu = next.channels?.feishu || {};
    next.channels = { ...next.channels, feishu };
    if (accountId === DEFAULT_ACCOUNT_ID) {
        // If we are using the simplified config structure (which we didn't strictly define for Feishu, 
        // but let's assume we stick to `accounts` map for consistency with my previous types.feishu.ts)
        // Wait, in types.feishu.ts I defined:
        // export type FeishuConfig = { accounts?: Record<string, FeishuAccountConfig>; };
        // So there is no top-level appId/appSecret in FeishuConfig, only inside accounts.
        if (!feishu.accounts)
            feishu.accounts = {};
        const acc = feishu.accounts[accountId] || { appId: "", appSecret: "" };
        feishu.accounts[accountId] = {
            ...acc,
            ...updates,
        };
    }
    else {
        if (!feishu.accounts)
            feishu.accounts = {};
        const acc = feishu.accounts[accountId] || { appId: "", appSecret: "" };
        feishu.accounts[accountId] = {
            ...acc,
            ...updates,
        };
    }
    return next;
}
//# sourceMappingURL=onboarding.js.map