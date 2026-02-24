import { logConfigUpdated } from "../../config/logging.js";
import type { RuntimeEnv } from "../../runtime.js";
import { resolveModelListFallbacks, resolveModelListPrimary } from "../../config/model-input.js";
import { resolveModelTarget, updateConfig } from "./shared.js";

export async function modelsSetImageCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    const resolved = resolveModelTarget({ raw: modelRaw, cfg });
    const key = `${resolved.provider}/${resolved.model}`;
    const nextModels = { ...cfg.agents?.defaults?.models };
    if (!nextModels[key]) nextModels[key] = {};
    const existingFallbacks = resolveModelListFallbacks(cfg.agents?.defaults?.imageModel);
    return {
      ...cfg,
      agents: {
        ...cfg.agents,
        defaults: {
          ...cfg.agents?.defaults,
          imageModel: {
            ...(existingFallbacks.length ? { fallbacks: existingFallbacks } : undefined),
            primary: key,
          },
          models: nextModels,
        },
      },
    };
  });

  logConfigUpdated(runtime);
  runtime.log(
    `Image model: ${resolveModelListPrimary(updated.agents?.defaults?.imageModel) ?? modelRaw}`,
  );
}
