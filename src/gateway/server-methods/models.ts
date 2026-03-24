import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";
import {
  buildAllowedModelSet,
  buildModelAliasIndex,
  normalizeProviderId,
  resolveConfiguredModelRef,
  resolveModelRefFromString,
} from "../../agents/model-selection.js";
import type { ModelCatalogEntry } from "../../agents/model-catalog.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults.js";
import { loadConfig } from "../../config/config.js";
import type { GatewayRequestHandlers } from "./types.js";

export const modelsHandlers: GatewayRequestHandlers = {
  "models.list": async ({ params, respond, context }) => {
    if (!validateModelsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid models.list params: ${formatValidationErrors(validateModelsListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const catalog = await context.loadGatewayModelCatalog();
      const cfg = loadConfig();
      const resolvedDefault = resolveConfiguredModelRef({
        cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
      });
      const allowed = buildAllowedModelSet({
        cfg,
        catalog,
        defaultProvider: resolvedDefault.provider,
        defaultModel: resolvedDefault.model,
      });

      // Build a complete model list that includes config-only models not in the
      // curated catalog (custom providers, dev builds, etc.) — mirrors /models.
      const catalogIndex = new Map(
        catalog.map((m) => [`${normalizeProviderId(m.provider)}/${m.id}`, m]),
      );
      const seen = new Set<string>();
      const models: ModelCatalogEntry[] = [];
      const addModel = (provider: string, id: string) => {
        const key = `${normalizeProviderId(provider)}/${id}`;
        if (seen.has(key)) return;
        seen.add(key);
        const existing = catalogIndex.get(key);
        models.push(existing ?? { id, name: id, provider });
      };
      for (const entry of allowed.allowedCatalog) {
        addModel(entry.provider, entry.id);
      }
      // Include config-only allowlist keys that aren't in the curated catalog.
      const aliasIndex = buildModelAliasIndex({
        cfg,
        defaultProvider: resolvedDefault.provider,
      });
      for (const raw of Object.keys(cfg.agents?.defaults?.models ?? {})) {
        const resolved = resolveModelRefFromString({
          raw,
          defaultProvider: resolvedDefault.provider,
          aliasIndex,
        });
        if (resolved) addModel(resolved.ref.provider, resolved.ref.model);
      }
      // Ensure default model is always included.
      addModel(resolvedDefault.provider, resolvedDefault.model);

      respond(
        true,
        {
          models,
          defaultModel: resolvedDefault.model,
          defaultProvider: resolvedDefault.provider,
        },
        undefined,
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
