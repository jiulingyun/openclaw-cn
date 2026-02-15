export * from "./sessions/group.js";
export * from "./sessions/metadata.js";
export * from "./sessions/main-session.js";
export * from "./sessions/paths.js";
export * from "./sessions/reset.js";
export * from "./sessions/session-key.js";
export * from "./sessions/store.js";
export * from "./sessions/types.js";
export * from "./sessions/transcript.js";

export type SessionMaintenanceWarning = {
  key: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export function extractDeliveryInfo(store: Record<string, unknown>): {
  channel?: string;
  peerId?: string;
} {
  return {
    channel: typeof store["channel"] === "string" ? (store["channel"] as string) : undefined,
    peerId: typeof store["peerId"] === "string" ? (store["peerId"] as string) : undefined,
  };
}
