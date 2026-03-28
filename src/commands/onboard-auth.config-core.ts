import type { ClawdbotConfig } from "../config/config.js";
import {
  buildCloudflareAiGatewayModelDefinition,
  resolveCloudflareAiGatewayBaseUrl,
} from "../agents/cloudflare-ai-gateway.js";
import { buildVolcengineProvider } from "../agents/models-config.providers.js";
import { buildXiaomiProvider } from "../agents/models-config.providers.js";
import {
  buildSyntheticModelDefinition,
  SYNTHETIC_BASE_URL,
  SYNTHETIC_DEFAULT_MODEL_ID,
  SYNTHETIC_DEFAULT_MODEL_REF,
  SYNTHETIC_MODEL_CATALOG,
} from "../agents/synthetic-models.js";
import {
  buildVeniceModelDefinition,
  VENICE_BASE_URL,
  VENICE_DEFAULT_MODEL_ID,
  VENICE_DEFAULT_MODEL_REF,
  VENICE_MODEL_CATALOG,
} from "../agents/venice-models.js";
import {
  CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
  OPENROUTER_DEFAULT_MODEL_REF,
  VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
  XIAOMI_DEFAULT_MODEL_REF,
  ZAI_DEFAULT_MODEL_REF,
} from "./onboard-auth.credentials.js";
import {
  buildMoonshotModelDefinition,
  KIMI_CODING_MODEL_REF,
  MOONSHOT_BASE_URL,
  MOONSHOT_CN_BASE_URL,
  MOONSHOT_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";
import {
  buildEphoneModelDefinition,
  EPHONE_BASE_URL,
  EPHONE_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";
import {
  buildSiliconflowModelDefinition,
  SILICONFLOW_BASE_URL,
  SILICONFLOW_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";
import {
  buildDashscopeModelDefinition,
  buildDashscopeCodingPlanModelDefinition,
  DASHSCOPE_BASE_URL,
  DASHSCOPE_DEFAULT_MODEL_REF,
  DASHSCOPE_CODING_PLAN_BASE_URL,
  DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID,
} from "./onboard-auth.models.js";
import {
  buildDeepseekModelDefinition,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";
import {
  buildMoonshotCodingPlanModelDefinition,
  MOONSHOT_CODING_PLAN_BASE_URL,
  MOONSHOT_CODING_PLAN_DEFAULT_MODEL_ID,
} from "./onboard-auth.models.js";
import {
  buildVolcengineCodingPlanModelDefinition,
  VOLCENGINE_CODING_PLAN_BASE_URL,
  VOLCENGINE_CODING_PLAN_DEFAULT_MODEL_ID,
} from "./onboard-auth.models.js";

export function applyAuthProfileConfig(
  cfg: ClawdbotConfig,
  params: {
    profileId: string;
    provider: string;
    mode: "api_key" | "oauth" | "token";
  },
): ClawdbotConfig {
  const { profileId, provider, mode } = params;

  const auth = cfg.auth || {};
  const profiles = { ...auth.profiles };
  profiles[profileId] = { provider, mode };

  const order = { ...auth.order };
  const existingOrder = order[provider] || [];

  if (!existingOrder.includes(profileId)) {
    order[provider] = [profileId, ...existingOrder];
  }

  return {
    ...cfg,
    auth: {
      ...auth,
      profiles,
      order,
    },
  };
}

export function applyZaiConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[ZAI_DEFAULT_MODEL_REF] = {
    ...models[ZAI_DEFAULT_MODEL_REF],
    alias: models[ZAI_DEFAULT_MODEL_REF]?.alias ?? "GLM-5",
  };

  const existingModel = cfg.agents?.defaults?.model;
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: ZAI_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyOpenrouterProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[OPENROUTER_DEFAULT_MODEL_REF] = {
    ...models[OPENROUTER_DEFAULT_MODEL_REF],
    alias: models[OPENROUTER_DEFAULT_MODEL_REF]?.alias ?? "OpenRouter",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyOpenrouterConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyOpenrouterProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: OPENROUTER_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyVercelAiGatewayProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF] = {
    ...models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF],
    alias: models[VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF]?.alias ?? "Vercel AI Gateway",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyVercelAiGatewayConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyVercelAiGatewayProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyCloudflareAiGatewayProviderConfig(
  cfg: ClawdbotConfig,
  opts?: { accountId?: string; gatewayId?: string },
): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  const modelsRef = CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF;
  models[modelsRef] = {
    ...models[modelsRef],
    alias: models[modelsRef]?.alias ?? "Cloudflare AI Gateway",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers["cloudflare-ai-gateway"];
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildCloudflareAiGatewayModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  const baseUrl = resolveCloudflareAiGatewayBaseUrl({
    accountId: opts?.accountId ?? "",
    gatewayId: opts?.gatewayId ?? "",
  });

  providers["cloudflare-ai-gateway"] = {
    ...existingProviderRest,
    baseUrl: baseUrl || existingProvider?.baseUrl || "",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyCloudflareAiGatewayConfig(
  cfg: ClawdbotConfig,
  opts?: { accountId?: string; gatewayId?: string },
): ClawdbotConfig {
  const next = applyCloudflareAiGatewayProviderConfig(cfg, opts);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyMoonshotProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[MOONSHOT_DEFAULT_MODEL_REF] = {
    ...models[MOONSHOT_DEFAULT_MODEL_REF],
    alias: models[MOONSHOT_DEFAULT_MODEL_REF]?.alias ?? "Moonshot AI",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.moonshot;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildMoonshotModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.moonshot = {
    ...existingProviderRest,
    baseUrl: MOONSHOT_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyMoonshotConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyMoonshotProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: MOONSHOT_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyMoonshotCnProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[MOONSHOT_DEFAULT_MODEL_REF] = {
    ...models[MOONSHOT_DEFAULT_MODEL_REF],
    alias: models[MOONSHOT_DEFAULT_MODEL_REF]?.alias ?? "Moonshot AI (CN)",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.moonshot;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildMoonshotModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.moonshot = {
    ...existingProviderRest,
    baseUrl: MOONSHOT_CN_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyMoonshotCnConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyMoonshotCnProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: MOONSHOT_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyKimiCodingProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[KIMI_CODING_MODEL_REF] = {
    ...models[KIMI_CODING_MODEL_REF],
    alias: models[KIMI_CODING_MODEL_REF]?.alias ?? "Kimi Coding",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyKimiCodingConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyKimiCodingProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: KIMI_CODING_MODEL_REF,
        },
      },
    },
  };
}

export function applySyntheticProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[SYNTHETIC_DEFAULT_MODEL_REF] = {
    ...models[SYNTHETIC_DEFAULT_MODEL_REF],
    alias: models[SYNTHETIC_DEFAULT_MODEL_REF]?.alias ?? "Synthetic",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.synthetic;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildSyntheticModelDefinition(
    SYNTHETIC_MODEL_CATALOG.find((m) => m.id === SYNTHETIC_DEFAULT_MODEL_ID)!,
  );
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.synthetic = {
    ...existingProviderRest,
    baseUrl: SYNTHETIC_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applySyntheticConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applySyntheticProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: SYNTHETIC_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyVeniceProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[VENICE_DEFAULT_MODEL_REF] = {
    ...models[VENICE_DEFAULT_MODEL_REF],
    alias: models[VENICE_DEFAULT_MODEL_REF]?.alias ?? "Venice",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.venice;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildVeniceModelDefinition(
    VENICE_MODEL_CATALOG.find((m) => m.id === VENICE_DEFAULT_MODEL_ID)!,
  );
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.venice = {
    ...existingProviderRest,
    baseUrl: VENICE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyVeniceConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyVeniceProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: VENICE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyXiaomiProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[XIAOMI_DEFAULT_MODEL_REF] = {
    ...models[XIAOMI_DEFAULT_MODEL_REF],
    alias: models[XIAOMI_DEFAULT_MODEL_REF]?.alias ?? "Xiaomi",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.xiaomi;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  const provider = buildXiaomiProvider();
  providers.xiaomi = {
    ...existingProviderRest,
    ...provider,
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyXiaomiConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyXiaomiProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: XIAOMI_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyVolcengineProviderConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.volcengine;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  const provider = buildVolcengineProvider();

  // Start with existing models or empty array
  const models = Array.isArray(existingProvider?.models)
    ? [...existingProvider.models]
    : [...(provider.models || [])];

  if (modelId && !models.some((m) => m.id === modelId)) {
    models.push({
      id: modelId,
      name: modelId,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    });
  }

  providers.volcengine = {
    ...existingProviderRest,
    ...provider,
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models,
  };

  return {
    ...cfg,
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyVolcengineConfig(cfg: ClawdbotConfig, modelId?: string): ClawdbotConfig {
  const next = applyVolcengineProviderConfig(cfg, modelId);

  if (modelId) {
    const targetModelRef = `volcengine/${modelId}`;
    const existingModel = next.agents?.defaults?.model;

    // Also add alias for the model
    const models = { ...next.agents?.defaults?.models };
    models[targetModelRef] = {
      ...models[targetModelRef],
      alias: models[targetModelRef]?.alias ?? modelId,
    };

    return {
      ...next,
      agents: {
        ...next.agents,
        defaults: {
          ...next.agents?.defaults,
          models,
          model: {
            ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
              ? {
                  fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
                }
              : undefined),
            primary: targetModelRef,
          },
        },
      },
    };
  }

  return next;
}

export function applyEphoneProviderConfig(cfg: ClawdbotConfig, modelId?: string): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  const modelRef = modelId ? `ephone/${modelId}` : EPHONE_DEFAULT_MODEL_REF;
  models[modelRef] = {
    ...models[modelRef],
    alias: models[modelRef]?.alias ?? "ePhone",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.ephone;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildEphoneModelDefinition(modelId);
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.ephone = {
    ...existingProviderRest,
    baseUrl: EPHONE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels,
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyEphoneConfig(cfg: ClawdbotConfig, modelId?: string): ClawdbotConfig {
  const next = applyEphoneProviderConfig(cfg, modelId);
  const modelRef = modelId ? `ephone/${modelId}` : EPHONE_DEFAULT_MODEL_REF;
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: modelRef,
        },
      },
    },
  };
}

// 新增：硅基流动提供商配置
export function applySiliconflowProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[SILICONFLOW_DEFAULT_MODEL_REF] = {
    ...models[SILICONFLOW_DEFAULT_MODEL_REF],
    alias: models[SILICONFLOW_DEFAULT_MODEL_REF]?.alias ?? "SiliconFlow",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.siliconflow;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildSiliconflowModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.siliconflow = {
    ...existingProviderRest,
    baseUrl: SILICONFLOW_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applySiliconflowConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applySiliconflowProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: SILICONFLOW_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

// 新增：DeepSeek提供商配置
export function applyDeepseekProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[DEEPSEEK_DEFAULT_MODEL_REF] = {
    ...models[DEEPSEEK_DEFAULT_MODEL_REF],
    alias: models[DEEPSEEK_DEFAULT_MODEL_REF]?.alias ?? "DeepSeek",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.deepseek;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildDeepseekModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.deepseek = {
    ...existingProviderRest,
    baseUrl: DEEPSEEK_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyDeepseekConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyDeepseekProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: DEEPSEEK_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

// 新增：阿里云百炼（DashScope）提供商配置
export function applyDashscopeProviderConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[DASHSCOPE_DEFAULT_MODEL_REF] = {
    ...models[DASHSCOPE_DEFAULT_MODEL_REF],
    alias: models[DASHSCOPE_DEFAULT_MODEL_REF]?.alias ?? "DashScope",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.dashscope;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildDashscopeModelDefinition();
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.dashscope = {
    ...existingProviderRest,
    baseUrl: DASHSCOPE_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyDashscopeConfig(cfg: ClawdbotConfig): ClawdbotConfig {
  const next = applyDashscopeProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: DASHSCOPE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

// 新增：阿里云百炼（Coding Plan）提供商配置
export function applyDashscopeCodingPlanProviderConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const targetModelId = modelId || DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `dashscope-coding-plan/${targetModelId}`;

  const models = { ...cfg.agents?.defaults?.models };
  models[targetModelRef] = {
    ...models[targetModelRef],
    alias: models[targetModelRef]?.alias ?? (modelId ? modelId : "Qwen 2.5 Coder"),
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers["dashscope-coding-plan"];
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildDashscopeCodingPlanModelDefinition(modelId);
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers["dashscope-coding-plan"] = {
    ...existingProviderRest,
    baseUrl: DASHSCOPE_CODING_PLAN_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyDashscopeCodingPlanConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const next = applyDashscopeCodingPlanProviderConfig(cfg, modelId);
  const existingModel = next.agents?.defaults?.model;
  const targetModelId = modelId || DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `dashscope-coding-plan/${targetModelId}`;

  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: targetModelRef,
        },
      },
    },
  };
}

// 新增：火山引擎 Coding Plan 提供商配置
export function applyVolcengineCodingPlanProviderConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const targetModelId = modelId || VOLCENGINE_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `volcengine-coding-plan/${targetModelId}`;

  const models = { ...cfg.agents?.defaults?.models };
  models[targetModelRef] = {
    ...models[targetModelRef],
    alias: models[targetModelRef]?.alias ?? (modelId ? modelId : "Doubao Seed 2.0 Code"),
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers["volcengine-coding-plan"];
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildVolcengineCodingPlanModelDefinition(modelId);
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers["volcengine-coding-plan"] = {
    ...existingProviderRest,
    baseUrl: VOLCENGINE_CODING_PLAN_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyVolcengineCodingPlanConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const next = applyVolcengineCodingPlanProviderConfig(cfg, modelId);
  const existingModel = next.agents?.defaults?.model;
  const targetModelId = modelId || VOLCENGINE_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `volcengine-coding-plan/${targetModelId}`;

  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: targetModelRef,
        },
      },
    },
  };
}

// 新增：Kimi Coding Plan 提供商配置
export function applyMoonshotCodingPlanProviderConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const targetModelId = modelId || MOONSHOT_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `moonshot-coding-plan/${targetModelId}`;

  const models = { ...cfg.agents?.defaults?.models };
  models[targetModelRef] = {
    ...models[targetModelRef],
    alias: models[targetModelRef]?.alias ?? (modelId ? modelId : "Kimi Coding"),
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers["moonshot-coding-plan"];
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const defaultModel = buildMoonshotCodingPlanModelDefinition(modelId);
  const hasDefaultModel = existingModels.some((model) => model.id === defaultModel.id);
  const mergedModels = hasDefaultModel ? existingModels : [...existingModels, defaultModel];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as {
    apiKey?: string;
  };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers["moonshot-coding-plan"] = {
    ...existingProviderRest,
    baseUrl: MOONSHOT_CODING_PLAN_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : [defaultModel],
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyMoonshotCodingPlanConfig(
  cfg: ClawdbotConfig,
  modelId?: string,
): ClawdbotConfig {
  const next = applyMoonshotCodingPlanProviderConfig(cfg, modelId);
  const existingModel = next.agents?.defaults?.model;
  const targetModelId = modelId || MOONSHOT_CODING_PLAN_DEFAULT_MODEL_ID;
  const targetModelRef = `moonshot-coding-plan/${targetModelId}`;

  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: targetModelRef,
        },
      },
    },
  };
}

// 新增：自定义模型提供商配置
export function applyCustomProviderConfig(
  cfg: ClawdbotConfig,
  params: {
    providerId: string;
    protocol: "openai-completions" | "anthropic-messages";
    baseUrl?: string;
    modelId: string;
    apiKey?: string;
  },
): ClawdbotConfig {
  const { providerId, protocol, baseUrl, modelId, apiKey } = params;
  const targetModelRef = `${providerId}/${modelId}`;

  // Update models aliases
  const models = { ...cfg.agents?.defaults?.models };
  models[targetModelRef] = {
    ...models[targetModelRef],
    alias: models[targetModelRef]?.alias ?? modelId,
  };

  // Update providers
  const providers = { ...cfg.models?.providers };
  const existingProvider = providers[providerId];
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];

  // Build model definition
  const modelDef = {
    id: modelId,
    name: modelId,
    reasoning: false,
    input: ["text"],
    contextWindow: 128000, // Default assumption
    maxTokens: 4096, // Default assumption
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  };

  const hasModel = existingModels.some((m) => m.id === modelId);
  const mergedModels = hasModel ? existingModels : [...existingModels, modelDef];

  const { apiKey: existingApiKey, ...rest } = (existingProvider ?? {}) as any;
  const resolvedApiKey =
    apiKey ?? (typeof existingApiKey === "string" ? existingApiKey : undefined);
  const normalizedApiKey = resolvedApiKey?.trim();

  providers[providerId] = {
    ...rest,
    ...(baseUrl ? { baseUrl } : {}),
    api: protocol,
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels,
  };

  // Update primary model
  const existingModel = cfg.agents?.defaults?.model;

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: targetModelRef,
        },
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}
