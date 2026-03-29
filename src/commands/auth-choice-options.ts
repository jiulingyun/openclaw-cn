import type { AuthProfileStore } from "../agents/auth-profiles.js";
import type { AuthChoice } from "./onboard-types.js";

export type AuthChoiceOption = {
  value: AuthChoice;
  label: string;
  hint?: string;
};

export type AuthChoiceGroupId =
  | "ephone"
  | "openai"
  | "anthropic"
  | "google"
  | "copilot"
  | "openrouter"
  | "ai-gateway"
  | "cloudflare-ai-gateway"
  | "moonshot"
  | "zai"
  | "xiaomi"
  | "opencode-zen"
  | "minimax"
  | "synthetic"
  | "venice"
  | "qwen"
  // 新增：OpenAI兼容供应商
  | "siliconflow"
  | "dashscope"
  | "deepseek"
  | "volcengine"
  | "ollama"
  | "custom";

export type AuthChoiceGroup = {
  value: AuthChoiceGroupId;
  label: string;
  hint?: string;
  options: AuthChoiceOption[];
};

const AUTH_CHOICE_GROUP_DEFS: {
  value: AuthChoiceGroupId;
  label: string;
  hint?: string;
  choices: AuthChoice[];
}[] = [
  // ── 赞助商（始终第一）──
  {
    value: "ephone",
    label: "ePhone AI",
    hint: "支持Claude等主流模型，官方优惠",
    choices: ["ephone-api-key"],
  },
  // ── 国内模型厂商 ──
  {
    value: "minimax",
    label: "MiniMax",
    hint: "M2.5（推荐）",
    choices: ["minimax-portal", "minimax-api-key"],
  },
  {
    value: "moonshot",
    label: "Moonshot AI (Kimi K2.5)",
    hint: "Kimi K2.5 + Kimi Coding",
    choices: [
      "moonshot-api-key",
      "moonshot-api-key-cn",
      "kimi-code-api-key",
      "moonshot-coding-plan-api-key",
    ],
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    hint: "OpenAI兼容 · API key",
    choices: ["deepseek-api-key"],
  },
  {
    value: "dashscope",
    label: "阿里云百炼 (DashScope)",
    hint: "OpenAI兼容 · API key",
    choices: ["dashscope-api-key", "dashscope-coding-plan-api-key"],
  },
  {
    value: "siliconflow",
    label: "硅基流动 (SiliconFlow)",
    hint: "OpenAI兼容 · API key",
    choices: ["siliconflow-api-key"],
  },
  {
    value: "volcengine",
    label: "火山引擎 (VolcanoEngine)",
    hint: "ARK API key + Coding Plan",
    choices: ["volcengine-api-key", "volcengine-coding-plan-api-key"],
  },
  {
    value: "zai",
    label: "Z.AI (GLM-5)",
    hint: "API key",
    choices: ["zai-api-key"],
  },
  {
    value: "xiaomi",
    label: "Xiaomi (MiMo)",
    hint: "API key",
    choices: ["xiaomi-api-key"],
  },
  {
    value: "qwen",
    label: "Qwen (通义千问)",
    hint: "OAuth",
    choices: ["qwen-portal"],
  },
  // ── 国际厂商 ──
  {
    value: "openai",
    label: "OpenAI",
    hint: "Codex OAuth + API key",
    choices: ["openai-codex", "openai-api-key"],
  },
  {
    value: "anthropic",
    label: "Anthropic",
    hint: "setup-token + API key",
    choices: ["token", "apiKey"],
  },
  {
    value: "google",
    label: "Google",
    hint: "Gemini API key + OAuth",
    choices: ["gemini-api-key", "google-antigravity", "google-gemini-cli"],
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    hint: "API key",
    choices: ["openrouter-api-key"],
  },
  {
    value: "copilot",
    label: "Copilot",
    hint: "GitHub + local proxy",
    choices: ["github-copilot", "copilot-proxy"],
  },
  // ── 通用 / 其他 ──
  {
    value: "ollama",
    label: "Ollama (本地)",
    hint: "本地运行的 Ollama 服务",
    choices: ["ollama-local"],
  },
  {
    value: "custom",
    label: "自定义模型 (兼容 OpenAI/Anthropic)",
    hint: "Bring your own model",
    choices: ["custom-provider-api-key"],
  },
  {
    value: "ai-gateway",
    label: "Vercel AI Gateway",
    hint: "API key",
    choices: ["ai-gateway-api-key"],
  },
  {
    value: "opencode-zen",
    label: "OpenCode Zen",
    hint: "API key",
    choices: ["opencode-zen"],
  },
  {
    value: "synthetic",
    label: "Synthetic",
    hint: "Anthropic-compatible (multi-model)",
    choices: ["synthetic-api-key"],
  },
  {
    value: "venice",
    label: "Venice AI",
    hint: "Privacy-focused (uncensored models)",
    choices: ["venice-api-key"],
  },
  {
    value: "cloudflare-ai-gateway",
    label: "Cloudflare AI Gateway",
    hint: "Account ID + Gateway ID + API key",
    choices: ["cloudflare-ai-gateway-api-key"],
  },
];

export function buildAuthChoiceOptions(params: {
  store: AuthProfileStore;
  includeSkip: boolean;
}): AuthChoiceOption[] {
  void params.store;
  const options: AuthChoiceOption[] = [];

  options.push({
    value: "ephone-api-key",
    label: "ePhone AI API key",
    hint: "模型聚合平台 · 支持 Claude / GPT / MiniMax 等",
  });

  options.push({
    value: "token",
    label: "Anthropic token (paste setup-token)",
    hint: "run `claude setup-token` elsewhere, then paste the token here",
  });

  options.push({
    value: "openai-codex",
    label: "OpenAI Codex (ChatGPT OAuth)",
  });
  options.push({ value: "chutes", label: "Chutes (OAuth)" });
  options.push({ value: "openai-api-key", label: "OpenAI API key" });
  options.push({ value: "openrouter-api-key", label: "OpenRouter API key" });
  options.push({
    value: "ai-gateway-api-key",
    label: "Vercel AI Gateway API key",
  });
  options.push({
    value: "cloudflare-ai-gateway-api-key",
    label: "Cloudflare AI Gateway",
    hint: "Account ID + Gateway ID + API key",
  });
  options.push({
    value: "moonshot-api-key",
    label: "Kimi API key (.ai)",
  });
  options.push({
    value: "moonshot-api-key-cn",
    label: "Kimi API key (.cn)",
  });
  options.push({ value: "kimi-code-api-key", label: "Kimi Code API key (subscription)" });
  options.push({
    value: "moonshot-coding-plan-api-key",
    label: "Kimi Coding (Coding Plan)",
    hint: "OpenAI 兼容协议",
  });
  options.push({ value: "synthetic-api-key", label: "Synthetic API key" });
  options.push({
    value: "venice-api-key",
    label: "Venice AI API key",
    hint: "Privacy-focused inference (uncensored models)",
  });
  options.push({
    value: "github-copilot",
    label: "GitHub Copilot (GitHub device login)",
    hint: "Uses GitHub device flow",
  });
  options.push({ value: "gemini-api-key", label: "Google Gemini API key" });
  options.push({
    value: "google-antigravity",
    label: "Google Antigravity OAuth",
    hint: "Uses the bundled Antigravity auth plugin",
  });
  options.push({
    value: "google-gemini-cli",
    label: "Google Gemini CLI OAuth",
    hint: "Uses the bundled Gemini CLI auth plugin",
  });
  options.push({ value: "zai-api-key", label: "Z.AI (GLM-5) API key" });
  options.push({
    value: "xiaomi-api-key",
    label: "Xiaomi API key",
  });
  options.push({
    value: "minimax-portal",
    label: "MiniMax OAuth",
    hint: "Oauth plugin for MiniMax",
  });
  options.push({ value: "qwen-portal", label: "Qwen OAuth" });
  options.push({
    value: "copilot-proxy",
    label: "Copilot Proxy (local)",
    hint: "Local proxy for VS Code Copilot models",
  });
  options.push({ value: "apiKey", label: "Anthropic API key" });
  // Token flow is currently Anthropic-only; use CLI for advanced providers.
  options.push({
    value: "opencode-zen",
    label: "OpenCode Zen (multi-model proxy)",
    hint: "Claude, GPT, Gemini via opencode.ai/zen",
  });
  options.push({
    value: "minimax-api-key",
    label: "MiniMax API key",
    hint: "M2.5 / M2.1 / M2",
  });
  // 新增：OpenAI兼容供应商API Key选项
  options.push({ value: "siliconflow-api-key", label: "硅基流动 API key" });
  options.push({ value: "dashscope-api-key", label: "阿里云百炼 (DashScope) API key" });
  options.push({
    value: "dashscope-coding-plan-api-key",
    label: "阿里云百炼 (Coding Plan)",
    hint: "OpenAI/Anthropic 兼容协议",
  });
  options.push({ value: "deepseek-api-key", label: "DeepSeek API key" });
  options.push({ value: "volcengine-api-key", label: "火山引擎 (ARK) API key" });
  options.push({
    value: "volcengine-coding-plan-api-key",
    label: "火山引擎 (Coding Plan)",
    hint: "OpenAI 兼容协议",
  });
  options.push({
    value: "ollama-local",
    label: "Ollama (本地)",
    hint: "http://127.0.0.1:11434",
  });
  options.push({
    value: "custom-provider-api-key",
    label: "Custom Provider API key",
    hint: "OpenAI/Anthropic 兼容接口",
  });
  if (params.includeSkip) {
    options.push({ value: "skip", label: "Skip for now" });
  }

  return options;
}

export function buildAuthChoiceGroups(params: { store: AuthProfileStore; includeSkip: boolean }): {
  groups: AuthChoiceGroup[];
  skipOption?: AuthChoiceOption;
} {
  const options = buildAuthChoiceOptions({
    ...params,
    includeSkip: false,
  });
  const optionByValue = new Map<AuthChoice, AuthChoiceOption>(
    options.map((opt) => [opt.value, opt]),
  );

  const groups = AUTH_CHOICE_GROUP_DEFS.map((group) => ({
    ...group,
    options: group.choices
      .map((choice) => optionByValue.get(choice))
      .filter((opt): opt is AuthChoiceOption => Boolean(opt)),
  }));

  const skipOption = params.includeSkip
    ? ({ value: "skip", label: "Skip for now" } satisfies AuthChoiceOption)
    : undefined;

  return { groups, skipOption };
}
