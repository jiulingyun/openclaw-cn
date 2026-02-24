import { describe, expect, it } from "vitest";
import { secureRandomHex, secureRandomId } from "./secure-random.js";

describe("secureRandomHex", () => {
  it("returns a hex string of the expected length", () => {
    const result = secureRandomHex(16);
    expect(result).toMatch(/^[0-9a-f]+$/);
    expect(result).toHaveLength(32);
  });

  it("returns different values on each call", () => {
    const a = secureRandomHex(16);
    const b = secureRandomHex(16);
    expect(a).not.toBe(b);
  });

  it("respects the byte count", () => {
    expect(secureRandomHex(8)).toHaveLength(16);
    expect(secureRandomHex(24)).toHaveLength(48);
  });
});

describe("secureRandomId", () => {
  it("returns a valid UUID", () => {
    const id = secureRandomId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("returns different values on each call", () => {
    const a = secureRandomId();
    const b = secureRandomId();
    expect(a).not.toBe(b);
  });
});
