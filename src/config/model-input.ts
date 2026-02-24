import type { AgentModelListConfig } from "./types.agent-defaults.js";

/**
 * Normalize a model field that may be a string or an object to its object form.
 * String form sets only the primary model; object form may have primary + fallbacks.
 */
export function normalizeModelListConfig(
  model: string | AgentModelListConfig | undefined,
): AgentModelListConfig {
  if (typeof model === "string") {
    const trimmed = model.trim();
    return trimmed ? { primary: trimmed } : {};
  }
  return model ?? {};
}

/** Extract the primary model string from either string or object form. */
export function resolveModelListPrimary(
  model: string | AgentModelListConfig | undefined,
): string | undefined {
  if (typeof model === "string") {
    const trimmed = model.trim();
    return trimmed || undefined;
  }
  return model?.primary?.trim() || undefined;
}

/** Extract the fallbacks array from either string or object form. */
export function resolveModelListFallbacks(
  model: string | AgentModelListConfig | undefined,
): string[] {
  if (typeof model === "string") {
    return [];
  }
  return model?.fallbacks ?? [];
}

/** Backward-compatible alias for resolving agent model fallback values. */
export function resolveAgentModelFallbackValues(model: string | AgentModelListConfig | undefined): {
  primary: string | undefined;
  fallbacks: string[];
} {
  return {
    primary: resolveModelListPrimary(model),
    fallbacks: resolveModelListFallbacks(model),
  };
}
