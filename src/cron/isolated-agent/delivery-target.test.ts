import { describe, expect, it, vi } from "vitest";
import type { ClawdbotConfig } from "../../config/config.js";

vi.mock("../../config/sessions.js", () => ({
  loadSessionStore: vi.fn().mockReturnValue({}),
  resolveAgentMainSessionKey: vi.fn().mockReturnValue("agent:test:main"),
  resolveStorePath: vi.fn().mockReturnValue("/tmp/test-store.json"),
}));

vi.mock("../../infra/outbound/channel-selection.js", () => ({
  resolveMessageChannelSelection: vi.fn().mockResolvedValue({ channel: "telegram" }),
}));

import { loadSessionStore } from "../../config/sessions.js";
import { resolveDeliveryTarget } from "./delivery-target.js";

function makeCfg(overrides?: Partial<ClawdbotConfig>): ClawdbotConfig {
  return {
    bindings: [],
    channels: {},
    ...overrides,
  } as ClawdbotConfig;
}

describe("resolveDeliveryTarget", () => {
  it("当会话没有 lastAccountId 时回退到绑定的 accountId", async () => {
    vi.mocked(loadSessionStore).mockReturnValue({});

    const cfg = makeCfg({
      bindings: [
        {
          agentId: "agent-b",
          match: { channel: "telegram", accountId: "account-b" },
        },
      ],
    });

    const result = await resolveDeliveryTarget(cfg, "agent-b", {
      channel: "telegram",
      to: "123456",
    });

    expect(result.accountId).toBe("account-b");
  });

  it("当存在会话 lastAccountId 时保留它", async () => {
    vi.mocked(loadSessionStore).mockReturnValue({
      "agent:test:main": {
        sessionId: "sess-1",
        updatedAt: 1000,
        lastChannel: "telegram",
        lastTo: "123456",
        lastAccountId: "session-account",
      },
    });

    const cfg = makeCfg({
      bindings: [
        {
          agentId: "agent-b",
          match: { channel: "telegram", accountId: "account-b" },
        },
      ],
    });

    const result = await resolveDeliveryTarget(cfg, "agent-b", {
      channel: "telegram",
      to: "123456",
    });

    // 会话派生的 accountId 应该优先于绑定
    expect(result.accountId).toBe("session-account");
  });

  it("当没有绑定也没有会话时返回 undefined accountId", async () => {
    vi.mocked(loadSessionStore).mockReturnValue({});

    const cfg = makeCfg({ bindings: [] });

    const result = await resolveDeliveryTarget(cfg, "agent-b", {
      channel: "telegram",
      to: "123456",
    });

    expect(result.accountId).toBeUndefined();
  });

  it("当多个 agent 有绑定时选择正确的绑定", async () => {
    vi.mocked(loadSessionStore).mockReturnValue({});

    const cfg = makeCfg({
      bindings: [
        {
          agentId: "agent-a",
          match: { channel: "telegram", accountId: "account-a" },
        },
        {
          agentId: "agent-b",
          match: { channel: "telegram", accountId: "account-b" },
        },
      ],
    });

    const result = await resolveDeliveryTarget(cfg, "agent-b", {
      channel: "telegram",
      to: "123456",
    });

    expect(result.accountId).toBe("account-b");
  });

  it("忽略不同频道的绑定", async () => {
    vi.mocked(loadSessionStore).mockReturnValue({});

    const cfg = makeCfg({
      bindings: [
        {
          agentId: "agent-b",
          match: { channel: "discord", accountId: "discord-account" },
        },
      ],
    });

    const result = await resolveDeliveryTarget(cfg, "agent-b", {
      channel: "telegram",
      to: "123456",
    });

    expect(result.accountId).toBeUndefined();
  });
});
