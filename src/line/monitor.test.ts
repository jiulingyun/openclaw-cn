import { describe, expect, it } from "vitest";
import { monitorLineProvider } from "./monitor.js";

describe("monitorLineProvider security", () => {
  it("should reject when channelSecret is empty string", async () => {
    const opts = {
      channelAccessToken: "test-token",
      channelSecret: "",
      config: {} as any,
      runtime: {} as any,
    };

    await expect(monitorLineProvider(opts)).rejects.toThrow(
      "需要 LINE 频道密钥来进行 webhook 认证",
    );
  });

  it("should reject when channelSecret is whitespace only", async () => {
    const opts = {
      channelAccessToken: "test-token",
      channelSecret: "   ",
      config: {} as any,
      runtime: {} as any,
    };

    await expect(monitorLineProvider(opts)).rejects.toThrow(
      "需要 LINE 频道密钥来进行 webhook 认证",
    );
  });

  it("should reject when channelSecret is undefined", async () => {
    const opts = {
      channelAccessToken: "test-token",
      channelSecret: undefined as any,
      config: {} as any,
      runtime: {} as any,
    };

    await expect(monitorLineProvider(opts)).rejects.toThrow(
      "需要 LINE 频道密钥来进行 webhook 认证",
    );
  });

  it("should reject when channelSecret is null", async () => {
    const opts = {
      channelAccessToken: "test-token",
      channelSecret: null as any,
      config: {} as any,
      runtime: {} as any,
    };

    await expect(monitorLineProvider(opts)).rejects.toThrow(
      "需要 LINE 频道密钥来进行 webhook 认证",
    );
  });
});
