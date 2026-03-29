import { resolveEnvApiKey } from "../agents/model-auth.js";
import {
  discoverOpenAICompatibleModels,
  buildDiscoveredModelOptions,
} from "../agents/openai-models-discovery.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
import { applyAuthChoicePluginProvider } from "./auth-choice.apply.plugin-provider.js";
import {
  applyAuthProfileConfig,
  applyMinimaxApiConfig,
  applyMinimaxApiProviderConfig,
  applyMinimaxConfig,
  applyMinimaxProviderConfig,
  MINIMAX_API_BASE_URL,
  setMinimaxApiKey,
} from "./onboard-auth.js";

export async function applyAuthChoiceMiniMax(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let nextConfig = params.config;
  let agentModelOverride: string | undefined;
  const noteAgentModel = async (model: string) => {
    if (!params.agentId) return;
    await params.prompter.note(
      `Default model set to ${model} for agent "${params.agentId}".`,
      "Model configured",
    );
  };
  if (params.authChoice === "minimax-portal") {
    // Let user choose between Global/CN endpoints
    const endpoint = await params.prompter.select({
      message: "Select MiniMax endpoint",
      options: [
        { value: "oauth", label: "Global", hint: "OAuth for international users" },
        { value: "oauth-cn", label: "CN", hint: "OAuth for users in China" },
      ],
    });

    return await applyAuthChoicePluginProvider(params, {
      authChoice: "minimax-portal",
      pluginId: "minimax-portal-auth",
      providerId: "minimax-portal",
      methodId: endpoint,
      label: "MiniMax",
    });
  }

  if (params.authChoice === "minimax-api-key") {
    let hasCredential = false;
    let resolvedApiKey = "";
    const envKey = resolveEnvApiKey("minimax");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `使用已有 MINIMAX_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})？`,
        initialValue: true,
      });
      if (useExisting) {
        resolvedApiKey = envKey.apiKey;
        await setMinimaxApiKey(resolvedApiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "输入 MiniMax API key",
        validate: validateApiKeyInput,
      });
      resolvedApiKey = normalizeApiKeyInput(String(key));
      await setMinimaxApiKey(resolvedApiKey, params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "minimax:default",
      provider: "minimax",
      mode: "api_key",
    });

    const STATIC_MINIMAX_MODELS = [
      { value: "MiniMax-M2.5", label: "MiniMax M2.5", hint: "顶尖性能与极致性价比（推荐）" },
      {
        value: "MiniMax-M2.5-highspeed",
        label: "MiniMax M2.5 Highspeed",
        hint: "极速版 (~100 TPS)",
      },
      { value: "MiniMax-M2.1", label: "MiniMax M2.1" },
      {
        value: "MiniMax-M2.1-highspeed",
        label: "MiniMax M2.1 Highspeed",
        hint: "极速版 (~100 TPS)",
      },
      {
        value: "MiniMax-M2.1-lightning",
        label: "MiniMax M2.1 Lightning",
        hint: "Faster, higher output cost",
      },
      { value: "MiniMax-M2", label: "MiniMax M2", hint: "专为高效编码与 Agent 工作流而生" },
    ];

    const discovered = await discoverOpenAICompatibleModels({
      baseUrl: MINIMAX_API_BASE_URL,
      apiKey: resolvedApiKey,
    });

    const pinnedIds = STATIC_MINIMAX_MODELS.map((m) => m.value);
    const modelOptions = discovered
      ? buildDiscoveredModelOptions({
          discovered,
          pinnedIds,
          customLabel: "手动输入模型 ID",
        })
      : STATIC_MINIMAX_MODELS.map((m) => ({ value: m.value, label: m.label }));

    const modelChoice = await params.prompter.select({
      message: discovered
        ? `选择 MiniMax 模型（已获取 ${discovered.length} 个可用模型）`
        : "选择 MiniMax 模型",
      options: modelOptions,
      initialValue: "MiniMax-M2.5",
    });

    let modelId: string;
    if (modelChoice === "custom") {
      const input = await params.prompter.text({
        message: "输入模型 ID",
        validate: (val) => (String(val).trim().length > 0 ? undefined : "模型 ID 不能为空"),
      });
      modelId = typeof input === "string" ? input.trim() : "MiniMax-M2.5";
    } else {
      modelId = String(modelChoice);
    }
    {
      const modelRef = `minimax/${modelId}`;
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: modelRef,
        applyDefaultConfig: (config) => applyMinimaxApiConfig(config, modelId),
        applyProviderConfig: (config) => applyMinimaxApiProviderConfig(config, modelId),
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (
    params.authChoice === "minimax-cloud" ||
    params.authChoice === "minimax-api" ||
    params.authChoice === "minimax-api-lightning" ||
    params.authChoice === "minimax-api-m25" ||
    params.authChoice === "minimax-api-m25-highspeed" ||
    params.authChoice === "minimax-api-m21-highspeed" ||
    params.authChoice === "minimax-api-m2"
  ) {
    const modelIdMap: Record<string, string> = {
      "minimax-api-m25": "MiniMax-M2.5",
      "minimax-api-m25-highspeed": "MiniMax-M2.5-highspeed",
      "minimax-api-lightning": "MiniMax-M2.5-Lightning",
      "minimax-api": "MiniMax-M2.1",
      "minimax-api-m21-highspeed": "MiniMax-M2.1-highspeed",
      "minimax-api-m2": "MiniMax-M2",
      "minimax-cloud": "MiniMax-M2.5",
    };
    const modelId = modelIdMap[params.authChoice] ?? "MiniMax-M2.5";
    let hasCredential = false;
    const envKey = resolveEnvApiKey("minimax");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing MINIMAX_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setMinimaxApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter MiniMax API key",
        validate: validateApiKeyInput,
      });
      await setMinimaxApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "minimax:default",
      provider: "minimax",
      mode: "api_key",
    });
    {
      const modelRef = `minimax/${modelId}`;
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: modelRef,
        applyDefaultConfig: (config) => applyMinimaxApiConfig(config, modelId),
        applyProviderConfig: (config) => applyMinimaxApiProviderConfig(config, modelId),
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (params.authChoice === "minimax") {
    const applied = await applyDefaultModelChoice({
      config: nextConfig,
      setDefaultModel: params.setDefaultModel,
      defaultModel: "lmstudio/minimax-m2.1-gs32",
      applyDefaultConfig: applyMinimaxConfig,
      applyProviderConfig: applyMinimaxProviderConfig,
      noteAgentModel,
      prompter: params.prompter,
    });
    nextConfig = applied.config;
    agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    return { config: nextConfig, agentModelOverride };
  }

  return null;
}
