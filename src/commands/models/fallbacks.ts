import { buildModelAliasIndex, resolveModelRefFromString } from "../../agents/model-selection.js";
import { loadConfig } from "../../config/config.js";
import { logConfigUpdated } from "../../config/logging.js";
import type { RuntimeEnv } from "../../runtime.js";
import { resolveModelListFallbacks, resolveModelListPrimary } from "../../config/model-input.js";
import {
  DEFAULT_PROVIDER,
  ensureFlagCompatibility,
  modelKey,
  resolveModelTarget,
  updateConfig,
} from "./shared.js";

export async function modelsFallbacksListCommand(
  opts: { json?: boolean; plain?: boolean },
  runtime: RuntimeEnv,
) {
  ensureFlagCompatibility(opts);
  const cfg = loadConfig();
  const fallbacks = resolveModelListFallbacks(cfg.agents?.defaults?.model);

  if (opts.json) {
    runtime.log(JSON.stringify({ fallbacks }, null, 2));
    return;
  }
  if (opts.plain) {
    for (const entry of fallbacks) runtime.log(entry);
    return;
  }

  runtime.log(`Fallbacks (${fallbacks.length}):`);
  if (fallbacks.length === 0) {
    runtime.log("- none");
    return;
  }
  for (const entry of fallbacks) runtime.log(`- ${entry}`);
}

export async function modelsFallbacksAddCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    const resolved = resolveModelTarget({ raw: modelRaw, cfg });
    const targetKey = modelKey(resolved.provider, resolved.model);
    const nextModels = { ...cfg.agents?.defaults?.models };
    if (!nextModels[targetKey]) nextModels[targetKey] = {};
    const aliasIndex = buildModelAliasIndex({
      cfg,
      defaultProvider: DEFAULT_PROVIDER,
    });
    const existing = resolveModelListFallbacks(cfg.agents?.defaults?.model);
    const existingKeys = existing
      .map((entry) =>
        resolveModelRefFromString({
          raw: String(entry ?? ""),
          defaultProvider: DEFAULT_PROVIDER,
          aliasIndex,
        }),
      )
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map((entry) => modelKey(entry.ref.provider, entry.ref.model));

    if (existingKeys.includes(targetKey)) return cfg;

    const existingPrimary = resolveModelListPrimary(cfg.agents?.defaults?.model);

    return {
      ...cfg,
      agents: {
        ...cfg.agents,
        defaults: {
          ...cfg.agents?.defaults,
          model: {
            ...(existingPrimary ? { primary: existingPrimary } : undefined),
            fallbacks: [...existing, targetKey],
          },
          models: nextModels,
        },
      },
    };
  });

  logConfigUpdated(runtime);
  runtime.log(
    `Fallbacks: ${resolveModelListFallbacks(updated.agents?.defaults?.model).join(", ")}`,
  );
}

export async function modelsFallbacksRemoveCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    const resolved = resolveModelTarget({ raw: modelRaw, cfg });
    const targetKey = modelKey(resolved.provider, resolved.model);
    const aliasIndex = buildModelAliasIndex({
      cfg,
      defaultProvider: DEFAULT_PROVIDER,
    });
    const existing = resolveModelListFallbacks(cfg.agents?.defaults?.model);
    const filtered = existing.filter((entry) => {
      const resolvedEntry = resolveModelRefFromString({
        raw: String(entry ?? ""),
        defaultProvider: DEFAULT_PROVIDER,
        aliasIndex,
      });
      if (!resolvedEntry) return true;
      return modelKey(resolvedEntry.ref.provider, resolvedEntry.ref.model) !== targetKey;
    });

    if (filtered.length === existing.length) {
      throw new Error(`Fallback not found: ${targetKey}`);
    }

    const existingPrimary = resolveModelListPrimary(cfg.agents?.defaults?.model);

    return {
      ...cfg,
      agents: {
        ...cfg.agents,
        defaults: {
          ...cfg.agents?.defaults,
          model: {
            ...(existingPrimary ? { primary: existingPrimary } : undefined),
            fallbacks: filtered,
          },
        },
      },
    };
  });

  logConfigUpdated(runtime);
  runtime.log(
    `Fallbacks: ${resolveModelListFallbacks(updated.agents?.defaults?.model).join(", ")}`,
  );
}

export async function modelsFallbacksClearCommand(runtime: RuntimeEnv) {
  await updateConfig((cfg) => {
    const existingPrimary = resolveModelListPrimary(cfg.agents?.defaults?.model);
    return {
      ...cfg,
      agents: {
        ...cfg.agents,
        defaults: {
          ...cfg.agents?.defaults,
          model: {
            ...(existingPrimary ? { primary: existingPrimary } : undefined),
            fallbacks: [],
          },
        },
      },
    };
  });

  logConfigUpdated(runtime);
  runtime.log("Fallback list cleared.");
}
