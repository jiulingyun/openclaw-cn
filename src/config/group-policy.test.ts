import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClawdbotConfig } from "./config.js";
import { resolveChannelGroupPolicy, resolveToolsBySender } from "./group-policy.js";

describe("resolveChannelGroupPolicy", () => {
  it("fails closed when groupPolicy=allowlist and groups are missing", () => {
    const cfg: ClawdbotConfig = {
      channels: {
        discord: {
          allowFrom: ["*"],
        },
      },
    } as unknown as ClawdbotConfig;

    const policy = resolveChannelGroupPolicy({
      cfg,
      channel: "discord",
      groupId: "some-group",
    });

    expect(policy.allowlistEnabled).toBe(false);
    expect(policy.allowed).toBe(true);
  });

  it("allows when group is in the allowlist", () => {
    const cfg: ClawdbotConfig = {
      channels: {
        discord: {
          groups: {
            "allowed-group": { requireMention: true },
          },
        },
      },
    } as unknown as ClawdbotConfig;

    const policy = resolveChannelGroupPolicy({
      cfg,
      channel: "discord",
      groupId: "allowed-group",
    });

    expect(policy.allowlistEnabled).toBe(true);
    expect(policy.allowed).toBe(true);
    expect(policy.groupConfig?.requireMention).toBe(true);
  });

  it("denies when group is not in the allowlist and no wildcard", () => {
    const cfg: ClawdbotConfig = {
      channels: {
        discord: {
          groups: {
            "allowed-group": { requireMention: true },
          },
        },
      },
    } as unknown as ClawdbotConfig;

    const policy = resolveChannelGroupPolicy({
      cfg,
      channel: "discord",
      groupId: "other-group",
    });

    expect(policy.allowlistEnabled).toBe(true);
    expect(policy.allowed).toBe(false);
  });

  it("allows wildcard groups", () => {
    const cfg: ClawdbotConfig = {
      channels: {
        discord: {
          groups: {
            "*": { requireMention: false },
          },
        },
      },
    } as unknown as ClawdbotConfig;

    const policy = resolveChannelGroupPolicy({
      cfg,
      channel: "discord",
      groupId: "any-group",
    });

    expect(policy.allowlistEnabled).toBe(true);
    expect(policy.allowed).toBe(true);
    expect(policy.defaultConfig?.requireMention).toBe(false);
  });

  it("denies when groups are configured but groupId is missing", () => {
    const cfg: ClawdbotConfig = {
      channels: {
        discord: {
          groups: {
            "allowed-group": { requireMention: true },
          },
        },
      },
    } as unknown as ClawdbotConfig;

    const policy = resolveChannelGroupPolicy({
      cfg,
      channel: "discord",
      groupId: undefined,
    });

    expect(policy.allowlistEnabled).toBe(true);
    expect(policy.allowed).toBe(false);
  });
});

describe("resolveToolsBySender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches typed sender IDs", () => {
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "id:user:alice": { allow: ["exec"] },
          "*": { deny: ["exec"] },
        },
        senderId: "user:alice",
      }),
    ).toEqual({ allow: ["exec"] });
  });

  it("does not allow senderName collisions to match id keys", () => {
    const victimId = "f4ce8a7d-1111-2222-3333-444455556666";
    expect(
      resolveToolsBySender({
        toolsBySender: {
          [`id:${victimId}`]: { allow: ["exec", "fs.read"] },
          "*": { deny: ["exec"] },
        },
        senderId: "attacker-real-id",
        senderName: victimId,
        senderUsername: "attacker",
      }),
    ).toEqual({ deny: ["exec"] });
  });

  it("treats untyped legacy keys as senderId only", () => {
    const warningSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => undefined);
    const victimId = "legacy-owner-id";
    expect(
      resolveToolsBySender({
        toolsBySender: {
          [victimId]: { allow: ["exec"] },
          "*": { deny: ["exec"] },
        },
        senderId: "attacker-real-id",
        senderName: victimId,
        senderUsername: victimId,
      }),
    ).toEqual({ deny: ["exec"] });
    expect(warningSpy).toHaveBeenCalled();
  });

  it("untyped legacy key matches senderId correctly", () => {
    const warningSpy = vi.spyOn(process, "emitWarning").mockImplementation(() => undefined);
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "owner-id": { allow: ["exec"] },
          "*": { deny: ["exec"] },
        },
        senderId: "owner-id",
      }),
    ).toEqual({ allow: ["exec"] });
    expect(warningSpy).toHaveBeenCalled();
  });

  it("matches typed username key", () => {
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "username:admin": { allow: ["exec"] },
          "*": { deny: ["exec"] },
        },
        senderId: "user-id-123",
        senderUsername: "admin",
      }),
    ).toEqual({ allow: ["exec"] });
  });

  it("matches typed name key", () => {
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "name:Alice": { allow: ["read"] },
          "*": { deny: ["read"] },
        },
        senderId: "user-id-456",
        senderName: "Alice",
      }),
    ).toEqual({ allow: ["read"] });
  });

  it("returns wildcard when no specific key matches", () => {
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "id:owner": { allow: ["exec"] },
          "*": { deny: ["exec"] },
        },
        senderId: "guest",
      }),
    ).toEqual({ deny: ["exec"] });
  });

  it("returns undefined when no key matches and no wildcard", () => {
    expect(
      resolveToolsBySender({
        toolsBySender: {
          "id:owner": { allow: ["exec"] },
        },
        senderId: "guest",
      }),
    ).toBeUndefined();
  });
});
