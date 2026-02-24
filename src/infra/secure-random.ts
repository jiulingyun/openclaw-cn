import crypto from "node:crypto";

/** Generates a cryptographically secure random hex string of the given byte length. */
export function secureRandomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Generates a cryptographically secure random UUID (v4). */
export function secureRandomId(): string {
  return crypto.randomUUID();
}
