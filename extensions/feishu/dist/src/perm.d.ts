import type * as Lark from "@larksuiteoapi/node-sdk";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
export declare function addMember(client: Lark.Client, token: string, type: string, memberType: string, memberId: string, perm: string): Promise<{
    success: boolean;
    member: {
        member_type: "email" | "openid" | "unionid" | "openchat" | "opendepartmentid" | "userid" | "groupid" | "wikispaceid";
        member_id: string;
        perm: "view" | "edit" | "full_access";
        perm_type?: "container" | "single_page" | undefined;
        type?: "user" | "chat" | "department" | "group" | "wiki_space_member" | "wiki_space_viewer" | "wiki_space_editor" | undefined;
    };
}>;
export declare function registerFeishuPermTools(api: OpenClawPluginApi): void;
//# sourceMappingURL=perm.d.ts.map