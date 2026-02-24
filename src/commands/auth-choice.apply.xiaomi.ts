import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import { XIAOMI_API_BASE_URL } from "../agents/models-config.providers.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import { applyAuthProfileConfig, applyXiaomiConfig, setXiaomiApiKey } from "./onboard-auth.js";
import { normalizeModelListConfig } from "../config/model-input.js";

export async function applyAuthChoiceXiaomi(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  const authChoice = params.authChoice;

  if (authChoice !== "xiaomi-api-key") {
    return null;
  }

  // 1. Get API Key
  let apiKey = resolveEnvApiKey("xiaomi")?.apiKey;

  if (params.opts?.tokenProvider === "xiaomi" && params.opts?.token) {
    apiKey = params.opts.token;
  }

  // @ts-ignore -- cherry-pick upstream type mismatch
  // @ts-ignore -- cherry-pick upstream type mismatch
  if (params.opts?.xiaomiApiKey) {
    // @ts-ignore -- cherry-pick upstream type mismatch
    apiKey = params.opts.xiaomiApiKey;
  }

  if (apiKey) {
    const useExisting = await params.prompter.confirm({
      message: `Use existing XIAOMI_API_KEY (${formatApiKeyPreview(apiKey)})?`,
      initialValue: true,
    });
    if (!useExisting) {
      apiKey = undefined;
    }
  }

  if (!apiKey) {
    const input = await params.prompter.text({
      message: "请输入小米 MiMo API key",
      validate: validateApiKeyInput,
    });
    if (typeof input === "symbol") {
      return null;
    } // Aborted
    apiKey = normalizeApiKeyInput(String(input));
  }

  // Save API Key
  await setXiaomiApiKey(apiKey, params.agentDir);

  // 2. Select Model
  let modelId: string | null = null;
  let selectionMessage = "选择模型（自动验证）";

  // Helper to verify model access
  const verifyModelAccess = async (id: string): Promise<boolean> => {
    const verifySpin = params.prompter.progress(`正在验证模型 ${id} 的访问权限 (10秒超时)...`);
    try {
      const res = await fetch(`${XIAOMI_API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "api-key": apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: id,
          messages: [{ role: "user", content: "hi" }],
          max_completion_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || res.statusText;
        throw new Error(errMsg);
      }
      verifySpin.stop(`验证通过: ${id}`);
      return true;
    } catch (err: any) {
      verifySpin.stop("访问被拒绝或超时");
      await params.prompter.note(
        `模型 "${id}" 验证失败:\n${err.message}\n\n提示: 请确保您已在 platform.xiaomimimo.com 开通服务并充值。`,
        "验证错误",
      );
      return false;
    }
  };

  while (!modelId) {
    const PREDEFINED_MODELS = ["mimo-v2-flash"];

    const choices = [
      // 1. Predefined Models
      ...PREDEFINED_MODELS.map((id) => ({
        value: id,
        label: id,
        hint: id === "mimo-v2-flash" ? "推荐 · 支持深度思考" : "预定义",
      })),
      // 2. Manual Entry (Always available as fallback)
      {
        value: "__manual__",
        label: "手动输入模型ID",
        hint: "如果您的模型不在列表中",
      },
    ];

    const selection = await params.prompter.select({
      message: selectionMessage,
      options: choices,
    });

    if (typeof selection === "symbol") {
      return null;
    }

    let candidateId: string;
    if (selection === "__manual__") {
      const input = await params.prompter.text({
        message: "输入模型ID（例如 mimo-v2-flash）",
        validate: (val) => (val.length > 0 ? undefined : "模型ID不能为空"),
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
      selectionMessage = "访问被拒绝 - 请确保您已开通该模型服务";
    }
  }

  // 3. Update Config
  let nextConfig = applyAuthProfileConfig(params.config, {
    profileId: "xiaomi:default",
    provider: "xiaomi",
    mode: "api_key",
  });

  // @ts-ignore -- cherry-pick upstream type mismatch
  if (params.agentId) {
    // If setting for a specific agent, we need to handle it specially
    // @ts-ignore -- cherry-pick upstream type mismatch
    nextConfig = applyXiaomiConfig(nextConfig, modelId);
    // But then force the agent override
    nextConfig = {
      ...nextConfig,
      agents: {
        ...nextConfig.agents,
        defaults: {
          ...nextConfig.agents?.defaults,
          model: {
            ...normalizeModelListConfig(nextConfig.agents?.defaults?.model),
            primary: `xiaomi/${modelId}`,
          },
        },
      },
      // @ts-ignore -- cherry-pick upstream type mismatch
    };
  } else {
    // Workspace default
    // @ts-ignore -- cherry-pick upstream type mismatch
    nextConfig = applyXiaomiConfig(nextConfig, modelId);
  }

  return { config: nextConfig, agentModelOverride: modelId };
}
