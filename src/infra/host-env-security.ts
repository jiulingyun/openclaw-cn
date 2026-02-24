import HOST_ENV_SECURITY_POLICY from "./host-env-security-policy.json" with { type: "json" };

const PORTABLE_ENV_VAR_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

type HostEnvSecurityPolicy = {
  blockedKeys: string[];
  blockedOverrideKeys?: string[];
  blockedPrefixes: string[];
};

export const HOST_DANGEROUS_ENV_KEY_VALUES: readonly string[] = Object.freeze(
  (HOST_ENV_SECURITY_POLICY as HostEnvSecurityPolicy).blockedKeys.map((key) => key.toUpperCase()),
);
export const HOST_DANGEROUS_ENV_PREFIXES: readonly string[] = Object.freeze(
  (HOST_ENV_SECURITY_POLICY as HostEnvSecurityPolicy).blockedPrefixes.map((prefix) =>
    prefix.toUpperCase(),
  ),
);
export const HOST_DANGEROUS_OVERRIDE_ENV_KEY_VALUES: readonly string[] = Object.freeze(
  ((HOST_ENV_SECURITY_POLICY as HostEnvSecurityPolicy).blockedOverrideKeys ?? []).map((key) =>
    key.toUpperCase(),
  ),
);
export const HOST_DANGEROUS_ENV_KEYS = new Set<string>(HOST_DANGEROUS_ENV_KEY_VALUES);
export const HOST_DANGEROUS_OVERRIDE_ENV_KEYS = new Set<string>(
  HOST_DANGEROUS_OVERRIDE_ENV_KEY_VALUES,
);

export function normalizeEnvVarKey(
  rawKey: string,
): string | null {
  const trimmed = rawKey.trim();
  if (!PORTABLE_ENV_VAR_KEY.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isDangerousHostEnvVarName(rawKey: string): boolean {
  const key = normalizeEnvVarKey(rawKey);
  if (!key) {
    return false;
  }
  const upper = key.toUpperCase();
  if (HOST_DANGEROUS_ENV_KEYS.has(upper)) {
    return true;
  }
  return HOST_DANGEROUS_ENV_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

export function isDangerousHostEnvOverrideVarName(rawKey: string): boolean {
  const key = normalizeEnvVarKey(rawKey);
  if (!key) {
    return false;
  }
  return HOST_DANGEROUS_OVERRIDE_ENV_KEYS.has(key.toUpperCase());
}

export function sanitizeHostExecEnv(params?: {
  baseEnv?: Record<string, string | undefined>;
  overrides?: Record<string, string> | null;
  blockPathOverrides?: boolean;
}): Record<string, string> {
  const baseEnv = params?.baseEnv ?? (process.env as Record<string, string | undefined>);
  const overrides = params?.overrides ?? {};
  const blockPathOverrides = params?.blockPathOverrides !== false;

  const merged: Record<string, string> = {};

  // Start with base env, excluding undefined values
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  // Apply overrides, skipping blocked keys
  for (const [key, value] of Object.entries(overrides)) {
    const normalized = normalizeEnvVarKey(key);
    if (!normalized) {
      continue;
    }
    const upper = normalized.toUpperCase();
    if (blockPathOverrides && upper === "PATH") {
      continue;
    }
    if (isDangerousHostEnvVarName(upper) || isDangerousHostEnvOverrideVarName(upper)) {
      continue;
    }
    merged[normalized] = value;
  }

  return merged;
}
