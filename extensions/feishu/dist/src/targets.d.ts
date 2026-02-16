import type { FeishuIdType } from "./types.js";
export declare function detectIdType(id: string): FeishuIdType | null;
export declare function normalizeFeishuTarget(raw: string): string | null;
export declare function formatFeishuTarget(id: string, type?: FeishuIdType): string;
export declare function resolveReceiveIdType(id: string): "chat_id" | "open_id" | "user_id";
export declare function looksLikeFeishuId(raw: string): boolean;
//# sourceMappingURL=targets.d.ts.map