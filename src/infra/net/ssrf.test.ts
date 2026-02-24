import { describe, expect, it } from "vitest";
import { normalizeFingerprint } from "../tls/fingerprint.js";
import { isBlockedHostnameOrIp, isPrivateIpAddress } from "./ssrf.js";

const privateIpCases = [
  "198.18.0.1",
  "198.19.255.254",
  "198.51.100.42",
  "203.0.113.10",
  "192.0.0.8",
  "192.0.2.1",
  "192.88.99.1",
  "224.0.0.1",
  "239.255.255.255",
  "240.0.0.1",
  "255.255.255.255",
  "::ffff:127.0.0.1",
  "::ffff:198.18.0.1",
  "64:ff9b::198.51.100.42",
  "0:0:0:0:0:ffff:7f00:1",
  "0000:0000:0000:0000:0000:ffff:7f00:0001",
  "::127.0.0.1",
  "0:0:0:0:0:0:7f00:1",
  "[0:0:0:0:0:ffff:7f00:1]",
  "::ffff:169.254.169.254",
  "0:0:0:0:0:ffff:a9fe:a9fe",
  "2002:7f00:0001::",
  "2002:a9fe:a9fe::",
  "2001:0000:0:0:0:0:80ff:fefe",
  "2001:0000:0:0:0:0:3f57:fefe",
  "2002:c612:0001::",
  "::",
  "::1",
  "fe80::1%lo0",
  "fd00::1",
  "fec0::1",
  "2001:db8:1234::5efe:127.0.0.1",
];

const publicIpCases = [
  "93.184.216.34",
  "198.17.255.255",
  "198.20.0.1",
  "198.51.99.1",
  "198.51.101.1",
  "203.0.112.1",
  "203.0.114.1",
  "223.255.255.255",
  "2606:4700:4700::1111",
  "2001:db8::1",
  "64:ff9b::8.8.8.8",
];

describe("ssrf ip classification", () => {
  it.each(privateIpCases)("classifies %s as private/special-use", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
  });

  it.each(publicIpCases)("classifies %s as public", (address) => {
    expect(isPrivateIpAddress(address)).toBe(false);
  });
});

describe("isBlockedHostnameOrIp", () => {
  it("blocks localhost aliases and metadata hostnames", () => {
    expect(isBlockedHostnameOrIp("localhost")).toBe(true);
    expect(isBlockedHostnameOrIp("metadata.google.internal")).toBe(true);
  });

  it("blocks IPv4 special-use ranges but allows adjacent public ranges", () => {
    expect(isBlockedHostnameOrIp("198.18.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("198.20.0.1")).toBe(false);
  });

  it("blocks legacy IPv4 literal representations", () => {
    expect(isBlockedHostnameOrIp("0177.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("8.8.2056")).toBe(true);
  });

  it("allows public IPv6 addresses", () => {
    expect(isBlockedHostnameOrIp("2001:db8::1")).toBe(false);
  });
});

describe("normalizeFingerprint", () => {
  it("strips sha256 prefixes and separators", () => {
    expect(normalizeFingerprint("sha256:AA:BB:cc")).toBe("aabbcc");
    expect(normalizeFingerprint("SHA-256 11-22-33")).toBe("112233");
    expect(normalizeFingerprint("aa:bb:cc")).toBe("aabbcc");
  });
});
