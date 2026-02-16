import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { FeishuPermSchema } from "./perm-schema.js";
import { resolveToolsConfig } from "./tools-config.js";
// ============ Helpers ============
function json(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        details: data,
    };
}
// ============ Actions ============
async function listMembers(client, token, type) {
    const res = await client.drive.permissionMember.list({
        path: { token },
        params: { type: type },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        members: res.data?.items?.map((m) => ({
            member_type: m.member_type,
            member_id: m.member_id,
            perm: m.perm,
            name: m.name,
        })) ?? [],
    };
}
async function addMember(client, token, type, memberType, memberId, perm) {
    const res = await client.drive.permissionMember.create({
        path: { token },
        params: { type: type, need_notification: false },
        data: {
            member_type: memberType,
            member_id: memberId,
            perm: perm,
        },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        success: true,
        member: res.data?.member,
    };
}
async function removeMember(client, token, type, memberType, memberId) {
    const res = await client.drive.permissionMember.delete({
        path: { token, member_id: memberId },
        params: { type: type, member_type: memberType },
    });
    if (res.code !== 0) {
        throw new Error(res.msg);
    }
    return {
        success: true,
    };
}
// ============ Tool Registration ============
export function registerFeishuPermTools(api) {
    if (!api.config) {
        api.logger.debug?.("feishu_perm: No config available, skipping perm tools");
        return;
    }
    const accounts = listEnabledFeishuAccounts(api.config);
    if (accounts.length === 0) {
        api.logger.debug?.("feishu_perm: No Feishu accounts configured, skipping perm tools");
        return;
    }
    const firstAccount = accounts[0];
    const toolsCfg = resolveToolsConfig(firstAccount.config.tools);
    if (!toolsCfg.perm) {
        api.logger.debug?.("feishu_perm: perm tool disabled in config (default: false)");
        return;
    }
    const getClient = () => createFeishuClient(firstAccount);
    api.registerTool({
        name: "feishu_perm",
        label: "Feishu Perm",
        description: "Feishu permission management. Actions: list, add, remove",
        parameters: FeishuPermSchema,
        async execute(_toolCallId, params) {
            const p = params;
            try {
                const client = getClient();
                switch (p.action) {
                    case "list":
                        return json(await listMembers(client, p.token, p.type));
                    case "add":
                        return json(await addMember(client, p.token, p.type, p.member_type, p.member_id, p.perm));
                    case "remove":
                        return json(await removeMember(client, p.token, p.type, p.member_type, p.member_id));
                    default:
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exhaustive check fallback
                        return json({ error: `Unknown action: ${p.action}` });
                }
            }
            catch (err) {
                return json({ error: err instanceof Error ? err.message : String(err) });
            }
        },
    }, { name: "feishu_perm" });
    api.logger.info?.(`feishu_perm: Registered feishu_perm tool`);
}
//# sourceMappingURL=perm.js.map