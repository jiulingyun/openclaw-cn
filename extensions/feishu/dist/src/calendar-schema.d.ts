export declare const FeishuCalendarSchema: import("@sinclair/typebox").TObject<{
    action: any;
    calendar_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    summary: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    description: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    start_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    end_time: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    location: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    event_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    attendees: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        type: any;
        id: import("@sinclair/typebox").TString;
    }>>>;
    user_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    page_size: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    page_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
//# sourceMappingURL=calendar-schema.d.ts.map