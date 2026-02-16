import { type Static } from "@sinclair/typebox";
export declare const FeishuPermSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"list">;
    token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"wiki">, import("@sinclair/typebox").TLiteral<"mindnote">]>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"add">;
    token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"wiki">, import("@sinclair/typebox").TLiteral<"mindnote">]>;
    member_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"email">, import("@sinclair/typebox").TLiteral<"openid">, import("@sinclair/typebox").TLiteral<"userid">, import("@sinclair/typebox").TLiteral<"unionid">, import("@sinclair/typebox").TLiteral<"openchat">, import("@sinclair/typebox").TLiteral<"opendepartmentid">]>;
    member_id: import("@sinclair/typebox").TString;
    perm: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"view">, import("@sinclair/typebox").TLiteral<"edit">, import("@sinclair/typebox").TLiteral<"full_access">]>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"remove">;
    token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"wiki">, import("@sinclair/typebox").TLiteral<"mindnote">]>;
    member_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"email">, import("@sinclair/typebox").TLiteral<"openid">, import("@sinclair/typebox").TLiteral<"userid">, import("@sinclair/typebox").TLiteral<"unionid">, import("@sinclair/typebox").TLiteral<"openchat">, import("@sinclair/typebox").TLiteral<"opendepartmentid">]>;
    member_id: import("@sinclair/typebox").TString;
}>]>;
export type FeishuPermParams = Static<typeof FeishuPermSchema>;
//# sourceMappingURL=perm-schema.d.ts.map