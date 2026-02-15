export type ChatType = "direct" | "group" | "channel";

/** @deprecated Use ChatType instead */
export type NormalizedChatType = ChatType;

export function normalizeChatType(raw?: string): ChatType | undefined {
  const value = raw?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === "direct" || value === "dm") {
    return "direct";
  }
  if (value === "group") {
    return "group";
  }
  if (value === "channel") {
    return "channel";
  }
  return undefined;
}
