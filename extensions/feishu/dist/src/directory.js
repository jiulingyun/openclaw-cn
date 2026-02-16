import { resolveFeishuAccount } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { normalizeFeishuTarget } from "./targets.js";
export async function listFeishuDirectoryPeers(params) {
    const account = resolveFeishuAccount({ cfg: params.cfg, accountId: params.accountId });
    const feishuCfg = account.config;
    const q = params.query?.trim().toLowerCase() || "";
    const ids = new Set();
    for (const entry of feishuCfg?.allowFrom ?? []) {
        const trimmed = String(entry).trim();
        if (trimmed && trimmed !== "*") {
            ids.add(trimmed);
        }
    }
    for (const userId of Object.keys(feishuCfg?.dms ?? {})) {
        const trimmed = userId.trim();
        if (trimmed) {
            ids.add(trimmed);
        }
    }
    return Array.from(ids)
        .map((raw) => raw.trim())
        .filter(Boolean)
        .map((raw) => normalizeFeishuTarget(raw) ?? raw)
        .filter((id) => (q ? id.toLowerCase().includes(q) : true))
        .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
        .map((id) => ({ kind: "user", id }));
}
export async function listFeishuDirectoryGroups(params) {
    const account = resolveFeishuAccount({ cfg: params.cfg, accountId: params.accountId });
    const feishuCfg = account.config;
    const q = params.query?.trim().toLowerCase() || "";
    const ids = new Set();
    for (const groupId of Object.keys(feishuCfg?.groups ?? {})) {
        const trimmed = groupId.trim();
        if (trimmed && trimmed !== "*") {
            ids.add(trimmed);
        }
    }
    for (const entry of feishuCfg?.groupAllowFrom ?? []) {
        const trimmed = String(entry).trim();
        if (trimmed && trimmed !== "*") {
            ids.add(trimmed);
        }
    }
    return Array.from(ids)
        .map((raw) => raw.trim())
        .filter(Boolean)
        .filter((id) => (q ? id.toLowerCase().includes(q) : true))
        .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
        .map((id) => ({ kind: "group", id }));
}
export async function listFeishuDirectoryPeersLive(params) {
    const account = resolveFeishuAccount({ cfg: params.cfg, accountId: params.accountId });
    if (!account.configured) {
        return listFeishuDirectoryPeers(params);
    }
    try {
        const client = createFeishuClient(account);
        const peers = [];
        const limit = params.limit ?? 50;
        const response = await client.contact.user.list({
            params: {
                page_size: Math.min(limit, 50),
            },
        });
        if (response.code === 0 && response.data?.items) {
            for (const user of response.data.items) {
                if (user.open_id) {
                    const q = params.query?.trim().toLowerCase() || "";
                    const name = user.name || "";
                    if (!q || user.open_id.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
                        peers.push({
                            kind: "user",
                            id: user.open_id,
                            name: name || undefined,
                        });
                    }
                }
                if (peers.length >= limit) {
                    break;
                }
            }
        }
        return peers;
    }
    catch {
        return listFeishuDirectoryPeers(params);
    }
}
export async function listFeishuDirectoryGroupsLive(params) {
    const account = resolveFeishuAccount({ cfg: params.cfg, accountId: params.accountId });
    if (!account.configured) {
        return listFeishuDirectoryGroups(params);
    }
    try {
        const client = createFeishuClient(account);
        const groups = [];
        const limit = params.limit ?? 50;
        const response = await client.im.chat.list({
            params: {
                page_size: Math.min(limit, 100),
            },
        });
        if (response.code === 0 && response.data?.items) {
            for (const chat of response.data.items) {
                if (chat.chat_id) {
                    const q = params.query?.trim().toLowerCase() || "";
                    const name = chat.name || "";
                    if (!q || chat.chat_id.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
                        groups.push({
                            kind: "group",
                            id: chat.chat_id,
                            name: name || undefined,
                        });
                    }
                }
                if (groups.length >= limit) {
                    break;
                }
            }
        }
        return groups;
    }
    catch {
        return listFeishuDirectoryGroups(params);
    }
}
//# sourceMappingURL=directory.js.map