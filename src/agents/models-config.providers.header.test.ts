import { describe, expect, it } from "vitest";
import { normalizeProviders } from "./models-config.providers.js";

describe("normalizeProviders header injection", () => {
  it("injects custom header when provider is volcengine", () => {
    process.env.MODEL_AGENT_CLIENT_REQ_ID = "X-Target-Header";
    process.env.MODEL_AGENT_CLIENT_REQ_VALUE = "target-value";

    const providers = {
      volcengine: {
        baseUrl: "http://example.com",
        models: [],
        apiKey: "foo",
      },
    };

    const normalized = normalizeProviders({ providers, agentDir: "/tmp" });
    expect(normalized?.volcengine?.headers?.["X-Target-Header"]).toBe("target-value");

    delete process.env.MODEL_AGENT_CLIENT_REQ_ID;
    delete process.env.MODEL_AGENT_CLIENT_REQ_VALUE;
  });

  it("does not inject header for non-volcengine providers", () => {
    process.env.MODEL_AGENT_CLIENT_REQ_ID = "X-Target-Header";
    process.env.MODEL_AGENT_CLIENT_REQ_VALUE = "target-value";

    const providers = {
      others: {
        baseUrl: "http://example.com",
        models: [],
        apiKey: "foo",
      },
    };

    const normalized = normalizeProviders({ providers, agentDir: "/tmp" });
    expect(normalized?.others?.headers?.["X-Target-Header"]).toBeUndefined();

    delete process.env.MODEL_AGENT_CLIENT_REQ_ID;
    delete process.env.MODEL_AGENT_CLIENT_REQ_VALUE;
  });

  it("does not inject header if only one env var is set (missing VALUE)", () => {
    process.env.MODEL_AGENT_CLIENT_REQ_ID = "X-Incomplete";
    // Missing VALUE

    const providers = {
      volcengine: {
        baseUrl: "http://example.com",
        models: [],
        apiKey: "foo",
      },
    };

    const normalized = normalizeProviders({ providers, agentDir: "/tmp" });
    expect(normalized?.volcengine?.headers?.["X-Incomplete"]).toBeUndefined();

    delete process.env.MODEL_AGENT_CLIENT_REQ_ID;
  });

  it("preserves existing headers while adding custom header for volcengine", () => {
    process.env.MODEL_AGENT_CLIENT_REQ_ID = "X-Added";
    process.env.MODEL_AGENT_CLIENT_REQ_VALUE = "added-val";

    const providers = {
      volcengine: {
        baseUrl: "http://example.com",
        models: [],
        apiKey: "foo",
        headers: { "Existing-Header": "value" },
      },
    };
    const normalized = normalizeProviders({ providers, agentDir: "/tmp" });
    expect(normalized?.volcengine?.headers?.["X-Added"]).toBe("added-val");
    expect(normalized?.volcengine?.headers?.["Existing-Header"]).toBe("value");

    delete process.env.MODEL_AGENT_CLIENT_REQ_ID;
    delete process.env.MODEL_AGENT_CLIENT_REQ_VALUE;
  });
});
