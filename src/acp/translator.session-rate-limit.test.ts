import type {
  AgentSideConnection,
  LoadSessionRequest,
  PromptRequest,
} from "@agentclientprotocol/sdk";
import { describe, expect, it, vi } from "vitest";
import type { GatewayClient } from "../gateway/client.js";
import { AcpGatewayAgent } from "./translator.js";
import { createInMemorySessionStore } from "./session.js";

function createConnection(): AgentSideConnection {
  return {
    sessionUpdate: vi.fn(async () => {}),
  } as unknown as AgentSideConnection;
}

function createGateway(
  request: GatewayClient["request"] = vi.fn(async () => ({ ok: true })) as GatewayClient["request"],
): GatewayClient {
  return {
    request,
  } as unknown as GatewayClient;
}

function createLoadSessionRequest(sessionId: string, cwd = "/tmp"): LoadSessionRequest {
  return {
    sessionId,
    cwd,
    mcpServers: [],
    _meta: {},
  } as unknown as LoadSessionRequest;
}

function createPromptRequest(
  sessionId: string,
  text: string,
  meta: Record<string, unknown> = {},
): PromptRequest {
  return {
    sessionId,
    prompt: [{ type: "text", text }],
    _meta: meta,
  } as unknown as PromptRequest;
}

describe("acp prompt size hardening", () => {
  it("rejects oversized prompt blocks without leaking active runs", async () => {
    const request = vi.fn(async () => ({ ok: true }));
    const sessionStore = createInMemorySessionStore();
    const agent = new AcpGatewayAgent(createConnection(), createGateway(request), {
      sessionStore,
    });
    const sessionId = "prompt-limit-oversize";
    await agent.loadSession(createLoadSessionRequest(sessionId));

    await expect(
      agent.prompt(createPromptRequest(sessionId, "a".repeat(2 * 1024 * 1024 + 1))),
    ).rejects.toThrow(/maximum allowed size/i);
    expect(request).not.toHaveBeenCalledWith("chat.send", expect.anything(), expect.anything());
    const session = sessionStore.getSession(sessionId);
    expect(session?.activeRunId).toBeNull();
    expect(session?.abortController).toBeNull();

    sessionStore.clearAllSessionsForTest();
  });

  it("rejects oversize final messages from cwd prefix without leaking active runs", async () => {
    const request = vi.fn(async () => ({ ok: true }));
    const sessionStore = createInMemorySessionStore();
    const agent = new AcpGatewayAgent(createConnection(), createGateway(request), {
      sessionStore,
    });
    const sessionId = "prompt-limit-prefix";
    await agent.loadSession(createLoadSessionRequest(sessionId));

    await expect(
      agent.prompt(createPromptRequest(sessionId, "a".repeat(2 * 1024 * 1024))),
    ).rejects.toThrow(/maximum allowed size/i);
    expect(request).not.toHaveBeenCalledWith("chat.send", expect.anything(), expect.anything());
    const session = sessionStore.getSession(sessionId);
    expect(session?.activeRunId).toBeNull();
    expect(session?.abortController).toBeNull();

    sessionStore.clearAllSessionsForTest();
  });
});
