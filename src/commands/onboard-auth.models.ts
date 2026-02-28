import type { ModelDefinitionConfig } from "../config/types.js";

export const DEFAULT_MINIMAX_BASE_URL = "https://api.minimax.io/v1";
export const MINIMAX_API_BASE_URL = "https://api.minimax.chat/v1";
export const MINIMAX_HOSTED_MODEL_ID = "MiniMax-M2.1";
export const MINIMAX_HOSTED_MODEL_REF = `minimax/${MINIMAX_HOSTED_MODEL_ID}`;
export const DEFAULT_MINIMAX_CONTEXT_WINDOW = 200000;
export const DEFAULT_MINIMAX_MAX_TOKENS = 8192;

export const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
export const MOONSHOT_CN_BASE_URL = "https://api.moonshot.cn/v1";
export const MOONSHOT_DEFAULT_MODEL_ID = "kimi-k2.5";
export const MOONSHOT_DEFAULT_MODEL_REF = `moonshot/${MOONSHOT_DEFAULT_MODEL_ID}`;
export const MOONSHOT_DEFAULT_CONTEXT_WINDOW = 256000;
export const MOONSHOT_DEFAULT_MAX_TOKENS = 8192;
export const MOONSHOT_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
export const KIMI_CODING_MODEL_ID = "k2p5";
export const KIMI_CODING_MODEL_REF = `kimi-coding/${KIMI_CODING_MODEL_ID}`;

// Pricing: MiniMax doesn't publish public rates. Override in models.json for accurate costs.
export const MINIMAX_API_COST = {
  input: 15,
  output: 60,
  cacheRead: 2,
  cacheWrite: 10,
};
export const MINIMAX_HOSTED_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
export const MINIMAX_LM_STUDIO_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

// 新增：阿里云百炼（Coding Plan）默认配置
// OpenAI 兼容协议：https://coding.dashscope.aliyuncs.com/v1
// Anthropic 兼容协议：https://coding.dashscope.aliyuncs.com/apps/anthropic
export const DASHSCOPE_CODING_PLAN_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";
// 默认使用 Qwen 2.5 Coder 32B 模型
export const DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID = "qwen2.5-coder-32b-instruct";
export const DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_REF = `dashscope-coding-plan/${DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID}`;

// 新增：OpenAI兼容供应商默认配置（基础URL与模型ID）
// 硅基流动：官方提供OpenAI兼容API，常见基地址如下
export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
// 采用在中文环境中更常见且可用的Qwen 2.5指令模型作为默认
export const SILICONFLOW_DEFAULT_MODEL_ID = "Qwen/Qwen2.5-32B-Instruct";
export const SILICONFLOW_DEFAULT_MODEL_REF = `siliconflow/${SILICONFLOW_DEFAULT_MODEL_ID}`;
export const SILICONFLOW_DEFAULT_CONTEXT_WINDOW = 128000;
export const SILICONFLOW_DEFAULT_MAX_TOKENS = 8192;
export const SILICONFLOW_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

// 阿里云百炼（DashScope）：OpenAI兼容模式端点
export const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
export const DASHSCOPE_DEFAULT_MODEL_ID = "qwen-plus";
export const DASHSCOPE_DEFAULT_MODEL_REF = `dashscope/${DASHSCOPE_DEFAULT_MODEL_ID}`;
export const DASHSCOPE_DEFAULT_CONTEXT_WINDOW = 128000;
export const DASHSCOPE_DEFAULT_MAX_TOKENS = 8192;
export const DASHSCOPE_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

// DeepSeek：官方OpenAI兼容API
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_DEFAULT_MODEL_ID = "deepseek-chat";
export const DEEPSEEK_DEFAULT_MODEL_REF = `deepseek/${DEEPSEEK_DEFAULT_MODEL_ID}`;
export const DEEPSEEK_DEFAULT_CONTEXT_WINDOW = 128000;
export const DEEPSEEK_DEFAULT_MAX_TOKENS = 8192;
export const DEEPSEEK_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

const MINIMAX_MODEL_CATALOG = {
  "MiniMax-M2.5": { name: "MiniMax M2.5", reasoning: false },
  "MiniMax-M2.5-highspeed": {
    name: "MiniMax M2.5 Highspeed",
    reasoning: false,
  },
  "MiniMax-M2.1": { name: "MiniMax M2.1", reasoning: false },
  "MiniMax-M2.1-highspeed": {
    name: "MiniMax M2.1 Highspeed",
    reasoning: false,
  },
  "MiniMax-M2.1-lightning": {
    name: "MiniMax M2.1 Lightning",
    reasoning: false,
  },
  "MiniMax-M2": { name: "MiniMax M2", reasoning: false },
} as const;

type MinimaxCatalogId = keyof typeof MINIMAX_MODEL_CATALOG;

export function buildMinimaxModelDefinition(params: {
  id: string;
  name?: string;
  reasoning?: boolean;
  cost: ModelDefinitionConfig["cost"];
  contextWindow: number;
  maxTokens: number;
}): ModelDefinitionConfig {
  const catalog = MINIMAX_MODEL_CATALOG[params.id as MinimaxCatalogId];
  return {
    id: params.id,
    name: params.name ?? catalog?.name ?? `MiniMax ${params.id}`,
    reasoning: params.reasoning ?? catalog?.reasoning ?? false,
    input: ["text"],
    cost: params.cost,
    contextWindow: params.contextWindow,
    maxTokens: params.maxTokens,
  };
}

export function buildMinimaxApiModelDefinition(modelId: string): ModelDefinitionConfig {
  return buildMinimaxModelDefinition({
    id: modelId,
    cost: MINIMAX_API_COST,
    contextWindow: DEFAULT_MINIMAX_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MINIMAX_MAX_TOKENS,
  });
}

export function buildMoonshotModelDefinition(): ModelDefinitionConfig {
  return {
    id: MOONSHOT_DEFAULT_MODEL_ID,
    name: "Kimi K2.5",
    reasoning: false,
    input: ["text"],
    cost: MOONSHOT_DEFAULT_COST,
    contextWindow: MOONSHOT_DEFAULT_CONTEXT_WINDOW,
    maxTokens: MOONSHOT_DEFAULT_MAX_TOKENS,
  };
}

export const XAI_BASE_URL = "https://api.x.ai/v1";
export const XAI_DEFAULT_MODEL_ID = "grok-2-latest";
export const ZAI_DEFAULT_MODEL_REF = `xai/${XAI_DEFAULT_MODEL_ID}`;
export const XAI_DEFAULT_CONTEXT_WINDOW = 131072;
export const XAI_DEFAULT_MAX_TOKENS = 8192;
export const XAI_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export function buildXaiModelDefinition(): ModelDefinitionConfig {
  return {
    id: XAI_DEFAULT_MODEL_ID,
    name: "Grok 2",
    reasoning: false,
    input: ["text"],
    cost: XAI_DEFAULT_COST,
    contextWindow: XAI_DEFAULT_CONTEXT_WINDOW,
    maxTokens: XAI_DEFAULT_MAX_TOKENS,
  };
}

// 新增：构建硅基流动默认模型定义（OpenAI兼容）
export function buildSiliconflowModelDefinition(): ModelDefinitionConfig {
  return {
    id: SILICONFLOW_DEFAULT_MODEL_ID,
    name: "SiliconFlow Auto",
    reasoning: false,
    input: ["text"],
    cost: SILICONFLOW_DEFAULT_COST,
    contextWindow: SILICONFLOW_DEFAULT_CONTEXT_WINDOW,
    maxTokens: SILICONFLOW_DEFAULT_MAX_TOKENS,
  };
}

// 新增：构建阿里云百炼（DashScope）默认模型定义（OpenAI兼容）
export function buildDashscopeModelDefinition(): ModelDefinitionConfig {
  return {
    id: DASHSCOPE_DEFAULT_MODEL_ID,
    name: "Qwen Plus",
    reasoning: false,
    input: ["text"],
    cost: DASHSCOPE_DEFAULT_COST,
    contextWindow: DASHSCOPE_DEFAULT_CONTEXT_WINDOW,
    maxTokens: DASHSCOPE_DEFAULT_MAX_TOKENS,
  };
}

// 新增：构建阿里云百炼（Coding Plan）默认模型定义
export function buildDashscopeCodingPlanModelDefinition(): ModelDefinitionConfig {
  return {
    id: DASHSCOPE_CODING_PLAN_DEFAULT_MODEL_ID,
    name: "Qwen 2.5 Coder 32B",
    reasoning: false,
    input: ["text"],
    cost: DASHSCOPE_DEFAULT_COST, // 复用 DashScope 成本配置
    contextWindow: DASHSCOPE_DEFAULT_CONTEXT_WINDOW,
    maxTokens: DASHSCOPE_DEFAULT_MAX_TOKENS,
  };
}

// 新增：构建DeepSeek默认模型定义（OpenAI兼容）
export function buildDeepseekModelDefinition(): ModelDefinitionConfig {
  return {
    id: DEEPSEEK_DEFAULT_MODEL_ID,
    name: "DeepSeek Chat",
    reasoning: false,
    input: ["text"],
    cost: DEEPSEEK_DEFAULT_COST,
    contextWindow: DEEPSEEK_DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEEPSEEK_DEFAULT_MAX_TOKENS,
  };
}
