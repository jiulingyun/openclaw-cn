import { describe, expect, it } from "vitest";
import {
  GATEWAY_SCOPE_ADMIN,
  GATEWAY_SCOPE_APPROVALS,
  GATEWAY_SCOPE_PAIRING,
  GATEWAY_SCOPE_READ,
  GATEWAY_SCOPE_WRITE,
  resolveMethodScopes,
} from "./method-scopes.js";

describe("resolveMethodScopes", () => {
  it("returns read scope for health", () => {
    expect(resolveMethodScopes("health")).toEqual([GATEWAY_SCOPE_READ]);
  });

  it("returns read scope for cron.list", () => {
    expect(resolveMethodScopes("cron.list")).toEqual([GATEWAY_SCOPE_READ]);
  });

  it("returns write scope for send", () => {
    expect(resolveMethodScopes("send")).toEqual([GATEWAY_SCOPE_WRITE]);
  });

  it("returns write scope for agent", () => {
    expect(resolveMethodScopes("agent")).toEqual([GATEWAY_SCOPE_WRITE]);
  });

  it("returns approvals scope for exec.approval.request", () => {
    expect(resolveMethodScopes("exec.approval.request")).toEqual([GATEWAY_SCOPE_APPROVALS]);
  });

  it("returns pairing scope for device.pair.approve", () => {
    expect(resolveMethodScopes("device.pair.approve")).toEqual([GATEWAY_SCOPE_PAIRING]);
  });

  it("returns admin scope for config.apply", () => {
    expect(resolveMethodScopes("config.apply")).toEqual([GATEWAY_SCOPE_ADMIN]);
  });

  it("returns admin scope for update.run", () => {
    expect(resolveMethodScopes("update.run")).toEqual([GATEWAY_SCOPE_ADMIN]);
  });

  it("returns admin scope for unknown methods", () => {
    expect(resolveMethodScopes("unknown.method")).toEqual([GATEWAY_SCOPE_ADMIN]);
  });

  it("returns empty array for node role methods", () => {
    expect(resolveMethodScopes("node.invoke.result")).toEqual([]);
  });
});
