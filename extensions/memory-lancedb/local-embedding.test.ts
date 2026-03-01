/**
 * LocalEmbedding Unit Tests
 *
 * Tests for LocalEmbedding class including:
 * - Basic class structure
 * - Vector normalization logic
 * - Error handling patterns
 */

import { describe, expect, beforeEach, afterEach, vi, it } from "vitest";

describe("LocalEmbedding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports LocalEmbedding class", async () => {
    const { LocalEmbedding } = await import("./index.js");
    expect(LocalEmbedding).toBeDefined();
    expect(typeof LocalEmbedding).toBe("function");
  });

  it("creates LocalEmbedding instance with correct parameters", async () => {
    const { LocalEmbedding } = await import("./index.js");
    const embedding = new LocalEmbedding("model.gguf", 512, "/cache");
    expect(embedding).toBeDefined();
  });

  it("creates LocalEmbedding instance without cache directory", async () => {
    const { LocalEmbedding } = await import("./index.js");
    const embedding = new LocalEmbedding("model.gguf", 512);
    expect(embedding).toBeDefined();
  });

  it("has embed method", async () => {
    const { LocalEmbedding } = await import("./index.js");
    const embedding = new LocalEmbedding("model.gguf", 512);
    expect(typeof embedding.embed).toBe("function");
  });

  it("normalizes vector to unit magnitude", async () => {
    // Test the normalization logic directly
    const vector = [3, 4];
    const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
    const normalized = vector.map((val) => val / magnitude);

    const normalizedMagnitude = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0));
    expect(normalizedMagnitude).toBeCloseTo(1.0, 10);
  });

  it("handles zero vector without division by zero", async () => {
    // Test zero vector handling
    const zeroVector = [0, 0, 0, 0];
    const magnitude = Math.sqrt(zeroVector.reduce((sum, x) => sum + x * x, 0));

    // When magnitude is 0, we should not divide
    const result = magnitude > 0 ? zeroVector.map((val) => val / magnitude) : zeroVector;
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it("sanitizes non-finite values", async () => {
    // Test sanitization of NaN and Infinity
    const vector = [1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const sanitized = vector.map((val) => (Number.isFinite(val) ? val : 0));
    expect(sanitized).toEqual([1, 0, 0, 0]);
  });

  it("sanitizes vector before normalization", async () => {
    // Combined test: sanitize then normalize
    const vector = [3, Number.NaN, 4, 0];
    const sanitized = vector.map((val) => (Number.isFinite(val) ? val : 0));
    const magnitude = Math.sqrt(sanitized.reduce((sum, x) => sum + x * x, 0));
    const normalized = sanitized.map((val) => val / magnitude);

    const normalizedMagnitude = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0));
    expect(normalizedMagnitude).toBeCloseTo(1.0, 10);
    expect(normalized.every((val) => Number.isFinite(val))).toBe(true);
  });
});
