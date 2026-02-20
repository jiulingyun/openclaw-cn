import { describe, expect, it } from "vitest";
import { normalizeFingerprint } from "../tls/fingerprint.js";
import { isBlockedHostnameOrIp, isPrivateIpAddress } from "./ssrf.js";

describe("ssrf ip classification", () => {
  it("treats IPv4-mapped and IPv4-compatible IPv6 loopback as private", () => {
    expect(isPrivateIpAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:ffff:7f00:1")).toBe(true);
    expect(isPrivateIpAddress("0000:0000:0000:0000:0000:ffff:7f00:0001")).toBe(true);
    expect(isPrivateIpAddress("::127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:0:7f00:1")).toBe(true);
    expect(isPrivateIpAddress("[0:0:0:0:0:ffff:7f00:1]")).toBe(true);
  });

  it("treats IPv4-mapped metadata/link-local as private", () => {
    expect(isPrivateIpAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:ffff:a9fe:a9fe")).toBe(true);
  });

  it("treats common IPv6 private/internal ranges as private", () => {
    expect(isPrivateIpAddress("::")).toBe(true);
    expect(isPrivateIpAddress("::1")).toBe(true);
    expect(isPrivateIpAddress("fe80::1%lo0")).toBe(true);
    expect(isPrivateIpAddress("fd00::1")).toBe(true);
    expect(isPrivateIpAddress("fec0::1")).toBe(true);
  });

  it("treats ISATAP-embedded private IPv4 as private", () => {
    expect(isPrivateIpAddress("2001:db8:1234::5efe:127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("2001:db8:1234:1:200:5efe:7f00:1")).toBe(true);
  });

  it("does not classify ISATAP with public IPv4 as private", () => {
    expect(isPrivateIpAddress("2001:db8:1234::5efe:8.8.8.8")).toBe(false);
  });

  it("does not treat non-ISATAP addresses with 5efe bytes as private", () => {
    // IID bits don't match ISATAP format (bit 12 of hextets[4] is set), so
    // this is a plain IPv6 address, not an ISATAP-embedded one.
    expect(isPrivateIpAddress("2001:db8:1234:1:1111:5efe:7f00:1")).toBe(false);
  });

  it("does not classify public IPs as private", () => {
    expect(isPrivateIpAddress("93.184.216.34")).toBe(false);
    expect(isPrivateIpAddress("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateIpAddress("2001:db8::1")).toBe(false);
  });
});

describe("normalizeFingerprint", () => {
  it("strips sha256 prefixes and separators", () => {
    expect(normalizeFingerprint("sha256:AA:BB:cc")).toBe("aabbcc");
    expect(normalizeFingerprint("SHA-256 11-22-33")).toBe("112233");
    expect(normalizeFingerprint("aa:bb:cc")).toBe("aabbcc");
  });
});

describe("isBlockedHostnameOrIp", () => {
  it("blocks localhost.localdomain and metadata hostname aliases", () => {
    expect(isBlockedHostnameOrIp("localhost.localdomain")).toBe(true);
    expect(isBlockedHostnameOrIp("metadata.google.internal")).toBe(true);
  });

  it("blocks private transition addresses via shared IP classifier", () => {
    expect(isBlockedHostnameOrIp("2001:db8:1234::5efe:127.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("2001:db8::1")).toBe(false);
  });
});
