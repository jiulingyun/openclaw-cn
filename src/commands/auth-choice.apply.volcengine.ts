import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import { VOLCENGINE_API_BASE_URL } from "../agents/models-config.providers.js";
import {
  discoverOpenAICompatibleModels,
  buildDiscoveredModelOptions,
} from "../agents/openai-models-discovery.js";
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import {
  applyAuthProfileConfig,
  applyVolcengineConfig,
  setVolcengineApiKey,
  setVolcengineCodingPlanApiKey,
  applyVolcengineCodingPlanConfig,
  applyVolcengineCodingPlanProviderConfig,
} from "./onboard-auth.js";

const VOLCENGINE_CODING_PLAN_MODELS = [
  { value: "doubao-seed-2.0-code", label: "Doubao Seed 2.0 Code", hint: "推荐" },
  { value: "doubao-seed-code", label: "Doubao Seed Code" },
  { value: "glm-4.7", label: "GLM 4.7" },
  { value: "deepseek-v3.2", label: "DeepSeek V3.2" },
  { value: "kimi-k2-thinking", label: "Kimi K2 Thinking" },
  { value: "kimi-k2.5", label: "Kimi K2.5" },
];

export async function applyAuthChoiceVolcengine(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  const authChoice = params.authChoice;

  // @ts-ignore -- cherry-pick upstream type mismatch
  if (authChoice !== "volcengine-api-key" && authChoice !== "volcengine-coding-plan-api-key") {
    return null;
  }

  if (authChoice === "volcengine-coding-plan-api-key") {
    return applyVolcengineCodingPlan(params);
  }

  // @ts-ignore -- cherry-pick upstream type mismatch
  // @ts-ignore -- cherry-pick upstream type mismatch
  // 1. Get API Key
  let apiKey = resolveEnvApiKey("volcengine")?.apiKey;

  if (params.opts?.tokenProvider === "volcengine" && params.opts?.token) {
    apiKey = params.opts.token;
  }

  // @ts-ignore -- cherry-pick upstream type mismatch
  if (params.opts?.volcengineApiKey) {
    // @ts-ignore -- cherry-pick upstream type mismatch
    apiKey = params.opts.volcengineApiKey;
  }
  // @ts-ignore -- cherry-pick upstream type mismatch

  // @ts-ignore -- cherry-pick upstream type mismatch
  // @ts-ignore -- cherry-pick upstream type mismatch
  if (apiKey) {
    // @ts-ignore -- cherry-pick upstream type mismatch
    const useExisting = await params.prompter.confirm({
      message: `Use existing VOLCENGINE_API_KEY (${formatApiKeyPreview(apiKey)})?`,
      initialValue: true,
    });
    if (!useExisting) {
      apiKey = undefined;
    }
  }

  if (!apiKey) {
    const input = await params.prompter.text({
      message: "请输入火山引擎 (ARK) API key",
      validate: validateApiKeyInput,
    });
    if (typeof input === "symbol") {
      return null;
    } // Aborted
    apiKey = normalizeApiKeyInput(String(input));
  }

  // Save API Key
  await setVolcengineApiKey(apiKey, params.agentDir);

  // 2. Models (Used for config generation later)

  // 3. Select Model
  let modelId: string | null = null;
  let selectionMessage = "Select a model (Auto-verified)";

  // Helper to verify model access
  const verifyModelAccess = async (id: string): Promise<boolean> => {
    const verifySpin = params.prompter.progress(`Verifying access to ${id} (10s timeout)...`);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (process.env.MODEL_AGENT_CLIENT_REQ_ID && process.env.MODEL_AGENT_CLIENT_REQ_VALUE) {
        headers[process.env.MODEL_AGENT_CLIENT_REQ_ID] = process.env.MODEL_AGENT_CLIENT_REQ_VALUE;
      }

      const res = await fetch(`${VOLCENGINE_API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: id,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || res.statusText;
        throw new Error(errMsg);
      }
      verifySpin.stop(`Access verified: ${id}`);
      return true;
    } catch (err: any) {
      verifySpin.stop("Access denied or potential timeout");
      await params.prompter.note(
        `Model "${id}" verification failed:\n${err.message}\n\nTip: You may need to create an Endpoint in ARK console or enable Pay-as-you-go.`,
        "Validation Error",
      );
      return false;
    }
  };

  // Try dynamic model discovery from ARK API; fall back to predefined list
  const discovered = await discoverOpenAICompatibleModels({
    baseUrl: VOLCENGINE_API_BASE_URL,
    apiKey: apiKey,
  });

  const PREDEFINED_MODELS = [
    "doubao-seed-2.0-code",
    "doubao-seed-code",
    "glm-4.7",
    "deepseek-v3.2",
    "kimi-k2-thinking",
    "kimi-k2.5",
    "glm-4-7-251222",
    "doubao-seed-1-8-251228",
    "deepseek-v3-2-251201",
    "kimi-k2-thinking-251104",
  ];

  while (!modelId) {
    const choices = discovered
      ? buildDiscoveredModelOptions({
          discovered,
          pinnedIds: PREDEFINED_MODELS,
          customLabel: "手动输入模型 ID / Endpoint ID (ep-2025...)",
        })
      : [
          ...PREDEFINED_MODELS.map((id) => ({
            value: id,
            label: id,
          })),
          {
            value: "custom",
            label: "手动输入模型 ID / Endpoint ID (ep-2025...)",
          },
        ];

    const selection = await params.prompter.select({
      message: discovered
        ? `${selectionMessage}（已获取 ${discovered.length} 个可用模型）`
        : selectionMessage,
      options: choices,
    });

    if (typeof selection === "symbol") {
      return null;
    }

    let candidateId: string;
    if (selection === "custom") {
      const input = await params.prompter.text({
        message: "输入模型 ID 或 Endpoint ID (例如 ep-20250604...)",
        validate: (val) => (val.length > 0 ? undefined : "模型 ID 不能为空"),
      });
      if (typeof input === "symbol") {
        return null;
      }
      candidateId = String(input);
    } else {
      candidateId = String(selection);
    }

    // Verify validity
    const isValid = await verifyModelAccess(candidateId);
    if (isValid) {
      modelId = candidateId;
    } else {
      selectionMessage =
        "Access Denied - Please ensure you have activated this model/endpoint in ARK Console";
    }
  }

  // 4. Update Config
  let nextConfig = applyAuthProfileConfig(params.config, {
    profileId: "volcengine:default",
    provider: "volcengine",
    mode: "api_key",
  });

  // Apply volcengine provider config and set model for both agent and workspace default
  nextConfig = applyVolcengineConfig(nextConfig, modelId);

  return { config: nextConfig, agentModelOverride: modelId };
}

async function applyVolcengineCodingPlan(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let nextConfig = params.config;
  const noteAgentModel = async (model: string) => {
    if (!params.agentId) return;
    await params.prompter.note(
      `Default model set to ${model} for agent "${params.agentId}".`,
      "Model configured",
    );
  };

  let hasCredential = false;
  if (
    !hasCredential &&
    params.opts?.token &&
    params.opts?.tokenProvider === "volcengine-coding-plan"
  ) {
    await setVolcengineCodingPlanApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
    hasCredential = true;
  }
  const envKey = resolveEnvApiKey("volcengine-coding-plan") ?? resolveEnvApiKey("volcengine");
  if (envKey && !hasCredential) {
    const useExisting = await params.prompter.confirm({
      message: `使用已有 API Key (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})？`,
      initialValue: true,
    });
    if (useExisting) {
      await setVolcengineCodingPlanApiKey(envKey.apiKey, params.agentDir);
      hasCredential = true;
    }
  }
  if (!hasCredential) {
    await params.prompter.note(
      [
        "火山引擎 Coding Plan 使用 OpenAI 兼容协议的专用端点。",
        "在火山引擎 ARK 控制台获取 API Key：https://console.volcengine.com/ark",
      ].join("\n"),
      "火山引擎 Coding Plan",
    );
    const key = await params.prompter.text({
      message: "输入火山引擎 API key",
      validate: validateApiKeyInput,
    });
    await setVolcengineCodingPlanApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
  }
  nextConfig = applyAuthProfileConfig(nextConfig, {
    profileId: "volcengine-coding-plan:default",
    provider: "volcengine-coding-plan",
    mode: "api_key",
  });

  const codingPlanDiscovered = await discoverOpenAICompatibleModels({
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
    apiKey:
      resolveEnvApiKey("volcengine-coding-plan")?.apiKey ?? resolveEnvApiKey("volcengine")?.apiKey,
  });

  const codingPlanPinnedIds = VOLCENGINE_CODING_PLAN_MODELS.map((m) => m.value);
  const codingPlanOptions = codingPlanDiscovered
    ? buildDiscoveredModelOptions({
        discovered: codingPlanDiscovered,
        pinnedIds: codingPlanPinnedIds,
        customLabel: "手动输入模型 ID",
      })
    : [
        ...VOLCENGINE_CODING_PLAN_MODELS.map((m) => ({ value: m.value, label: m.label })),
        { value: "custom", label: "手动输入模型 ID" },
      ];

  const modelChoice = await params.prompter.select({
    message: codingPlanDiscovered
      ? `选择模型（已获取 ${codingPlanDiscovered.length} 个可用模型）`
      : "选择模型",
    options: codingPlanOptions,
    initialValue: "doubao-seed-2.0-code",
  });

  let modelId: string;
  if (modelChoice === "custom") {
    const input = await params.prompter.text({
      message: "输入模型 ID",
      validate: (val) => (String(val).trim().length > 0 ? undefined : "模型 ID 不能为空"),
    });
    modelId = String(input).trim();
  } else {
    modelId = String(modelChoice);
  }

  const modelRef = `volcengine-coding-plan/${modelId}`;
  const applied = await applyDefaultModelChoice({
    config: nextConfig,
    setDefaultModel: params.setDefaultModel,
    defaultModel: modelRef,
    applyDefaultConfig: (cfg) => applyVolcengineCodingPlanConfig(cfg, modelId),
    applyProviderConfig: (cfg) => applyVolcengineCodingPlanProviderConfig(cfg, modelId),
    noteDefault: modelRef,
    noteAgentModel,
    prompter: params.prompter,
  });
  nextConfig = applied.config;

  return { config: nextConfig, agentModelOverride: applied.agentModelOverride ?? modelRef };
}
