import { describe, expect, it } from "vitest";

import { normalizePluginsConfig } from "./config-state.js";

describe("normalizePluginsConfig", () => {
  it("uses default memory slot when not specified", () => {
    const result = normalizePluginsConfig({});
    expect(result.slots.memory).toBe("memory-core");
  });

  it("respects explicit memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "custom-memory" },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("disables memory slot when set to 'none'", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "none" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("disables memory slot when set to 'None' (case insensitive)", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "None" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("trims whitespace from memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "  custom-memory  " },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("uses default when memory slot is empty string", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "" },
    });
    expect(result.slots.memory).toBe("memory-core");
  });

  it("uses default when memory slot is whitespace only", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "   " },
    });
    expect(result.slots.memory).toBe("memory-core");
  });

  it("normalizes legacy plugin entry id aliases", () => {
    const result = normalizePluginsConfig({
      entries: { wecom: { enabled: true } },
    });
    expect(result.entries["wecom-connector"]?.enabled).toBe(true);
    expect(result.entries.wecom).toBeUndefined();
  });

  it("normalizes legacy plugin allow/deny aliases", () => {
    const result = normalizePluginsConfig({
      allow: ["wecom"],
      deny: ["wecom"],
    });
    expect(result.allow).toEqual(["wecom-connector"]);
    expect(result.deny).toEqual(["wecom-connector"]);
  });

  it("normalizes legacy memory slot plugin alias", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "wecom" },
    });
    expect(result.slots.memory).toBe("wecom-connector");
  });
});
