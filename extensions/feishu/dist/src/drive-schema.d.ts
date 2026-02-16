import { type Static } from "@sinclair/typebox";
export declare const FeishuDriveSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"list">;
    folder_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"info">;
    file_token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"mindnote">, import("@sinclair/typebox").TLiteral<"shortcut">]>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"create_folder">;
    name: import("@sinclair/typebox").TString;
    folder_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"move">;
    file_token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"mindnote">, import("@sinclair/typebox").TLiteral<"shortcut">]>;
    folder_token: import("@sinclair/typebox").TString;
}>, import("@sinclair/typebox").TObject<{
    action: import("@sinclair/typebox").TLiteral<"delete">;
    file_token: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"doc">, import("@sinclair/typebox").TLiteral<"docx">, import("@sinclair/typebox").TLiteral<"sheet">, import("@sinclair/typebox").TLiteral<"bitable">, import("@sinclair/typebox").TLiteral<"folder">, import("@sinclair/typebox").TLiteral<"file">, import("@sinclair/typebox").TLiteral<"mindnote">, import("@sinclair/typebox").TLiteral<"shortcut">]>;
}>]>;
export type FeishuDriveParams = Static<typeof FeishuDriveSchema>;
//# sourceMappingURL=drive-schema.d.ts.map