export declare const ListChatsSchema: import("@sinclair/typebox").TObject<{
    page_size: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    page_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const GetChatSchema: import("@sinclair/typebox").TObject<{
    chat_id: import("@sinclair/typebox").TString;
}>;
export declare const ListMembersSchema: import("@sinclair/typebox").TObject<{
    chat_id: import("@sinclair/typebox").TString;
    page_size: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    page_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export declare const SendMessageSchema: import("@sinclair/typebox").TObject<{
    receive_id: import("@sinclair/typebox").TString;
    receive_id_type: any;
    msg_type: any;
    content: import("@sinclair/typebox").TString;
}>;
export declare const ReplyMessageSchema: import("@sinclair/typebox").TObject<{
    message_id: import("@sinclair/typebox").TString;
    msg_type: any;
    content: import("@sinclair/typebox").TString;
}>;
export declare const GetMessagesSchema: import("@sinclair/typebox").TObject<{
    container_id: import("@sinclair/typebox").TString;
    start_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    end_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    page_size: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    page_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    sort_type: any;
}>;
export declare const CreateChatSchema: import("@sinclair/typebox").TObject<{
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    user_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    chat_mode: any;
}>;
//# sourceMappingURL=im-schema.d.ts.map