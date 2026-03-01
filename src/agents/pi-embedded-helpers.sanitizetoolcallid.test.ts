import { describe, expect, it } from "vitest";
import { sanitizeToolCallId } from "./pi-embedded-helpers.js";

describe("sanitizeToolCallId", () => {
  describe("strict mode (default)", () => {
    it("keeps valid alphanumeric tool call IDs", () => {
      expect(sanitizeToolCallId("callabc123")).toBe("callabc123");
    });
    it("strips underscores and hyphens", () => {
      expect(sanitizeToolCallId("call_abc-123")).toBe("callabc123");
      expect(sanitizeToolCallId("call_abc_def")).toBe("callabcdef");
    });
    it("strips invalid characters", () => {
      expect(sanitizeToolCallId("call_abc|item:456")).toBe("callabcitem456");
    });
  });

  describe("strict mode (alphanumeric only)", () => {
    it("strips all non-alphanumeric characters", () => {
      expect(sanitizeToolCallId("call_abc-123", "strict")).toBe("callabc123");
      expect(sanitizeToolCallId("call_abc|item:456", "strict")).toBe("callabcitem456");
      expect(sanitizeToolCallId("whatsapp_login_1768799841527_1", "strict")).toBe(
        "whatsapplogin17687998415271",
      );
    });
  });

  describe("strict9 mode (Mistral tool call IDs)", () => {
    it("returns alphanumeric IDs with length 9", () => {
      const out = sanitizeToolCallId("call_abc|item:456", "strict9");
      expect(out).toMatch(/^[a-zA-Z0-9]{9}$/);
    });
  });

  it.each([
    {
      modeLabel: "default",
      run: () => sanitizeToolCallId(""),
      assert: (value: string) => expect(value).toBe("defaulttoolid"),
    },
    {
      modeLabel: "strict",
      run: () => sanitizeToolCallId("", "strict"),
      assert: (value: string) => expect(value).toBe("defaulttoolid"),
    },
    {
      modeLabel: "strict9",
      run: () => sanitizeToolCallId("", "strict9"),
      assert: (value: string) => expect(value).toMatch(/^[a-zA-Z0-9]{9}$/),
    },
  ])("returns default for empty IDs in $modeLabel mode", ({ run, assert }) => {
    assert(run());
  });
});
