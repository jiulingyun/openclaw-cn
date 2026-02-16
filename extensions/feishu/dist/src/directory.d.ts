import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
export type FeishuDirectoryPeer = {
    kind: "user";
    id: string;
    name?: string;
};
export type FeishuDirectoryGroup = {
    kind: "group";
    id: string;
    name?: string;
};
export declare function listFeishuDirectoryPeers(params: {
    cfg: ClawdbotConfig;
    query?: string;
    limit?: number;
    accountId?: string;
}): Promise<FeishuDirectoryPeer[]>;
export declare function listFeishuDirectoryGroups(params: {
    cfg: ClawdbotConfig;
    query?: string;
    limit?: number;
    accountId?: string;
}): Promise<FeishuDirectoryGroup[]>;
export declare function listFeishuDirectoryPeersLive(params: {
    cfg: ClawdbotConfig;
    query?: string;
    limit?: number;
    accountId?: string;
}): Promise<FeishuDirectoryPeer[]>;
export declare function listFeishuDirectoryGroupsLive(params: {
    cfg: ClawdbotConfig;
    query?: string;
    limit?: number;
    accountId?: string;
}): Promise<FeishuDirectoryGroup[]>;
//# sourceMappingURL=directory.d.ts.map