import net from "node:net";
import os from "node:os";

import { pickPrimaryTailnetIPv4, pickPrimaryTailnetIPv6 } from "../infra/tailnet.js";

export function isLoopbackAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("::ffff:127.")) return true;
  return false;
}

/**
 * Returns true if the IP belongs to a private or loopback network range.
 * Private ranges: RFC1918, link-local, ULA IPv6, and CGNAT (100.64/10), plus loopback.
 */
export function isPrivateOrLoopbackAddress(ip: string | undefined): boolean {
  if (!ip) {
    return false;
  }
  if (isLoopbackAddress(ip)) {
    return true;
  }
  const normalized = normalizeIPv4MappedAddress(ip.trim().toLowerCase());
  const family = net.isIP(normalized);
  if (!family) {
    return false;
  }

  if (family === 4) {
    const octets = normalized.split(".").map((value) => Number.parseInt(value, 10));
    if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
      return false;
    }
    const [o1, o2] = octets;
    // RFC1918 IPv4 private ranges.
    if (o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168)) {
      return true;
    }
    // IPv4 link-local and CGNAT (commonly used by Tailnet-like networks).
    if ((o1 === 169 && o2 === 254) || (o1 === 100 && o2 >= 64 && o2 <= 127)) {
      return true;
    }
    return false;
  }

  // IPv6 unique-local and link-local ranges.
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (/^fe[89ab]/.test(normalized)) {
    return true;
  }
  return false;
}

function normalizeIPv4MappedAddress(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  return ip;
}

function normalizeIp(ip: string | undefined): string | undefined {
  const trimmed = ip?.trim();
  if (!trimmed) return undefined;
  return normalizeIPv4MappedAddress(trimmed.toLowerCase());
}

function stripOptionalPort(ip: string): string {
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end !== -1) return ip.slice(1, end);
  }
  if (net.isIP(ip)) return ip;
  const lastColon = ip.lastIndexOf(":");
  if (lastColon > -1 && ip.includes(".") && ip.indexOf(":") === lastColon) {
    const candidate = ip.slice(0, lastColon);
    if (net.isIP(candidate) === 4) return candidate;
  }
  return ip;
}

export function parseForwardedForClientIp(forwardedFor?: string): string | undefined {
  const raw = forwardedFor?.split(",")[0]?.trim();
  if (!raw) return undefined;
  return normalizeIp(stripOptionalPort(raw));
}

function parseRealIp(realIp?: string): string | undefined {
  const raw = realIp?.trim();
  if (!raw) return undefined;
  return normalizeIp(stripOptionalPort(raw));
}

export function isTrustedProxyAddress(ip: string | undefined, trustedProxies?: string[]): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized || !trustedProxies || trustedProxies.length === 0) return false;
  return trustedProxies.some((proxy) => normalizeIp(proxy) === normalized);
}

export function resolveGatewayClientIp(params: {
  remoteAddr?: string;
  forwardedFor?: string;
  realIp?: string;
  trustedProxies?: string[];
}): string | undefined {
  const remote = normalizeIp(params.remoteAddr);
  if (!remote) return undefined;
  if (!isTrustedProxyAddress(remote, params.trustedProxies)) return remote;
  return parseForwardedForClientIp(params.forwardedFor) ?? parseRealIp(params.realIp) ?? remote;
}

export function isLocalGatewayAddress(ip: string | undefined): boolean {
  if (isLoopbackAddress(ip)) return true;
  if (!ip) return false;
  const normalized = normalizeIPv4MappedAddress(ip.trim().toLowerCase());
  const tailnetIPv4 = pickPrimaryTailnetIPv4();
  if (tailnetIPv4 && normalized === tailnetIPv4.toLowerCase()) return true;
  const tailnetIPv6 = pickPrimaryTailnetIPv6();
  if (tailnetIPv6 && ip.trim().toLowerCase() === tailnetIPv6.toLowerCase()) return true;
  return false;
}

/**
 * Resolves gateway bind host with fallback strategy.
 *
 * Modes:
 * - loopback: 127.0.0.1 (rarely fails, but handled gracefully)
 * - lan: always 0.0.0.0 (no fallback)
 * - tailnet: Tailnet IPv4 if available, else loopback
 * - auto: Loopback if available, else 0.0.0.0
 * - custom: User-specified IP, fallback to 0.0.0.0 if unavailable
 *
 * @returns The bind address to use (never null)
 */
export async function resolveGatewayBindHost(
  bind: import("../config/config.js").GatewayBindMode | undefined,
  customHost?: string,
): Promise<string> {
  const mode = bind ?? "loopback";

  if (mode === "loopback") {
    // 127.0.0.1 rarely fails, but handle gracefully
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0"; // extreme fallback
  }

  if (mode === "tailnet") {
    const tailnetIP = pickPrimaryTailnetIPv4();
    if (tailnetIP && (await canBindToHost(tailnetIP))) return tailnetIP;
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0";
  }

  if (mode === "lan") {
    return "0.0.0.0";
  }

  if (mode === "custom") {
    const host = customHost?.trim();
    if (!host) return "0.0.0.0"; // invalid config → fall back to all

    if (isValidIPv4(host) && (await canBindToHost(host))) return host;
    // Custom IP failed → fall back to LAN
    return "0.0.0.0";
  }

  if (mode === "auto") {
    if (await canBindToHost("127.0.0.1")) return "127.0.0.1";
    return "0.0.0.0";
  }

  return "0.0.0.0";
}

/**
 * Test if we can bind to a specific host address.
 * Creates a temporary server, attempts to bind, then closes it.
 *
 * @param host - The host address to test
 * @returns True if we can successfully bind to this address
 */
export async function canBindToHost(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.once("error", () => {
      resolve(false);
    });
    testServer.once("listening", () => {
      testServer.close();
      resolve(true);
    });
    // Use port 0 to let OS pick an available port for testing
    testServer.listen(0, host);
  });
}

export async function resolveGatewayListenHosts(
  bindHost: string,
  opts?: { canBindToHost?: (host: string) => Promise<boolean> },
): Promise<string[]> {
  if (bindHost !== "127.0.0.1") return [bindHost];
  const canBind = opts?.canBindToHost ?? canBindToHost;
  if (await canBind("::1")) return [bindHost, "::1"];
  return [bindHost];
}

/**
 * Validate if a string is a valid IPv4 address.
 *
 * @param host - The string to validate
 * @returns True if valid IPv4 format
 */
function isValidIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = parseInt(part, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255 && part === String(n);
  });
}

export function isLoopbackHost(host: string): boolean {
  return isLoopbackAddress(host);
}

/**
 * Returns the primary LAN IPv4 address, preferring en0/eth0, falling back to any
 * non-internal IPv4 interface.
 */
export function pickPrimaryLanIPv4(): string | undefined {
  const interfaces = os.networkInterfaces();
  const preferred = ["en0", "eth0"];
  for (const name of preferred) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        if (info.family === "IPv4" && !info.internal) {
          return info.address;
        }
      }
    }
  }
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return undefined;
}

/**
 * Returns true if the URL uses wss:// or if it targets a loopback address with ws://.
 * Plaintext ws:// to non-loopback addresses is rejected (CWE-319).
 */
export function isSecureWebSocketUrl(url: string): boolean {
  if (url.startsWith("wss://")) return true;
  if (!url.startsWith("ws://")) return false;
  // Allow plaintext only for loopback
  try {
    const { hostname } = new URL(url);
    return isLoopbackAddress(hostname);
  } catch {
    return false;
  }
}
