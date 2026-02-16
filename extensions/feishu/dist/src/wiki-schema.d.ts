import { type Static } from "@sinclair/typebox";
export declare const FeishuWikiSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"spaces">;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"nodes">;
    space_id: import("@sinclair/typebox").TString;
    parent_node_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"get">;
    token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"search">;
    query: import("@sinclair/typebox").TString;
    space_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"create">;
    space_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    obj_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">]>>;
    parent_node_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"move">;
    space_id: import("@sinclair/typebox").TString;
    node_token: import("@sinclair/typebox").TString;
    target_space_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    target_parent_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"rename">;
    space_id: import("@sinclair/typebox").TString;
    node_token: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
}>]>;
export type FeishuWikiParams = Static<typeof FeishuWikiSchema>;
//# sourceMappingURL=wiki-schema.d.ts.map