import { describe, expect, it } from "vitest";
import { isAllowedParsedChatSender } from "./allow-from.js";

function parseAllowTarget(
  entry: string,
):
  | { kind: "chat_id"; chatId: number }
  | { kind: "chat_guid"; chatGuid: string }
  | { kind: "chat_identifier"; chatIdentifier: string }
  | { kind: "handle"; handle: string } {
  const trimmed = entry.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("chat_id:")) {
    return { kind: "chat_id", chatId: Number.parseInt(trimmed.slice("chat_id:".length), 10) };
  }
  if (lower.startsWith("chat_guid:")) {
    return { kind: "chat_guid", chatGuid: trimmed.slice("chat_guid:".length) };
  }
  if (lower.startsWith("chat_identifier:")) {
    return {
      kind: "chat_identifier",
      chatIdentifier: trimmed.slice("chat_identifier:".length),
    };
  }
  return { kind: "handle", handle: trimmed };
}

describe("isAllowedParsedChatSender", () => {
  it("denies when allowFrom is empty (default)", () => {
    const allowed = isAllowedParsedChatSender({
      allowFrom: [],
      sender: "+15551234567",
      normalizeSender: (sender) => sender,
      parseAllowTarget,
    });

    expect(allowed).toBe(false);
  });

  it("can explicitly allow when allowFrom is empty", () => {
    const allowed = isAllowedParsedChatSender({
      allowFrom: [],
      sender: "+15551234567",
      emptyAllowFrom: "allow",
      normalizeSender: (sender) => sender,
      parseAllowTarget,
    });

    expect(allowed).toBe(true);
  });

  it("allows wildcard entries", () => {
    const allowed = isAllowedParsedChatSender({
      allowFrom: ["*"],
      sender: "+15551234567",
      normalizeSender: (sender) => sender,
      parseAllowTarget,
    });

    expect(allowed).toBe(true);
  });

  it("allows matching handle", () => {
    const allowed = isAllowedParsedChatSender({
      allowFrom: ["+15551234567"],
      sender: "+15551234567",
      normalizeSender: (sender) => sender,
      parseAllowTarget,
    });

    expect(allowed).toBe(true);
  });

  it("denies non-matching handle", () => {
    const allowed = isAllowedParsedChatSender({
      allowFrom: ["+15559999999"],
      sender: "+15551234567",
      normalizeSender: (sender) => sender,
      parseAllowTarget,
    });

    expect(allowed).toBe(false);
  });
});
