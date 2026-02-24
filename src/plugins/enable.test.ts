import { describe, expect, it } from "vitest";
import type { ClawdbotConfig } from "../config/config.js";
import { enablePluginInConfig } from "./enable.js";

describe("enablePluginInConfig", () => {
  it("enables a non-built-in plugin in plugins.entries", () => {
    const cfg: ClawdbotConfig = {};
    const result = enablePluginInConfig(cfg, "google-antigravity-auth");
    expect(result.enabled).toBe(true);
    expect(result.config.plugins?.entries?.["google-antigravity-auth"]?.enabled).toBe(true);
  });

  it("returns disabled when plugins globally disabled", () => {
    const cfg: ClawdbotConfig = { plugins: { enabled: false } };
    const result = enablePluginInConfig(cfg, "google-antigravity-auth");
    expect(result.enabled).toBe(false);
  });

  it("returns disabled when plugin in deny list", () => {
    const cfg: ClawdbotConfig = { plugins: { deny: ["google-antigravity-auth"] } };
    const result = enablePluginInConfig(cfg, "google-antigravity-auth");
    expect(result.enabled).toBe(false);
  });

  it("enables built-in channel by writing to channels.<id>.enabled", () => {
    const cfg: ClawdbotConfig = {};
    const result = enablePluginInConfig(cfg, "telegram");
    expect(result.enabled).toBe(true);
    expect(result.config.channels?.telegram?.enabled).toBe(true);
    expect(result.config.plugins?.entries?.telegram).toBeUndefined();
  });

  it("adds built-in channel id to allowlist when allowlist is configured", () => {
    const cfg: ClawdbotConfig = {
      plugins: {
        allow: ["memory-core"],
      },
    };
    const result = enablePluginInConfig(cfg, "telegram");
    expect(result.enabled).toBe(true);
    expect(result.config.channels?.telegram?.enabled).toBe(true);
    expect(result.config.plugins?.allow).toEqual(["memory-core", "telegram"]);
  });
});
