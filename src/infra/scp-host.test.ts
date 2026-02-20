import { describe, expect, it } from "vitest";
import { isSafeScpRemoteHost, normalizeScpRemoteHost } from "./scp-host.js";

describe("isSafeScpRemoteHost", () => {
  it("accepts bare hostnames", () => {
    expect(isSafeScpRemoteHost("gateway-host")).toBe(true);
    expect(isSafeScpRemoteHost("mac-mini.tailnet-1234.ts.net")).toBe(true);
    expect(isSafeScpRemoteHost("192.168.1.1")).toBe(true);
  });

  it("accepts user@host tokens", () => {
    expect(isSafeScpRemoteHost("bot@gateway-host")).toBe(true);
    expect(isSafeScpRemoteHost("openclaw@192.168.64.3")).toBe(true);
  });

  it("rejects tokens with spaces or SSH options", () => {
    expect(isSafeScpRemoteHost("bot@gateway-host -oProxyCommand=whoami")).toBe(false);
    expect(isSafeScpRemoteHost("-oProxyCommand=whoami host")).toBe(false);
    expect(isSafeScpRemoteHost("host name")).toBe(false);
  });

  it("rejects shell metacharacters", () => {
    expect(isSafeScpRemoteHost("host;rm -rf /")).toBe(false);
    expect(isSafeScpRemoteHost("host`id`")).toBe(false);
    expect(isSafeScpRemoteHost("host$(id)")).toBe(false);
    expect(isSafeScpRemoteHost("host|cat")).toBe(false);
  });

  it("rejects multiple @ signs", () => {
    expect(isSafeScpRemoteHost("user@host@extra")).toBe(false);
  });

  it("rejects empty and undefined", () => {
    expect(isSafeScpRemoteHost("")).toBe(false);
    expect(isSafeScpRemoteHost(undefined)).toBe(false);
  });
});

describe("normalizeScpRemoteHost", () => {
  it("returns trimmed host when valid", () => {
    expect(normalizeScpRemoteHost("bot@gateway-host")).toBe("bot@gateway-host");
    expect(normalizeScpRemoteHost("  host  ")).toBe("host");
  });

  it("returns undefined for invalid hosts", () => {
    expect(normalizeScpRemoteHost("host with spaces")).toBeUndefined();
    expect(normalizeScpRemoteHost(undefined)).toBeUndefined();
  });
});
