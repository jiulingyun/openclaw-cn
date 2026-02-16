import { type Static } from "@sinclair/typebox";
export declare const FeishuDocSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"read">;
    doc_token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"write">;
    doc_token: import("@sinclair/typebox").TString;
    content: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"append">;
    doc_token: import("@sinclair/typebox").TString;
    content: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"create">;
    title: import("@sinclair/typebox").TString;
    folder_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"list_blocks">;
    doc_token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"get_block">;
    doc_token: import("@sinclair/typebox").TString;
    block_id: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"update_block">;
    doc_token: import("@sinclair/typebox").TString;
    block_id: import("@sinclair/typebox").TString;
    content: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"delete_block">;
    doc_token: import("@sinclair/typebox").TString;
    block_id: import("@sinclair/typebox").TString;
}>]>;
export type FeishuDocParams = Static<typeof FeishuDocSchema>;
//# sourceMappingURL=doc-schema.d.ts.map