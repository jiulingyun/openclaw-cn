---
summary: "Clawdbot 支持的模型供应商（LLM）"
read_when:
  - 您想选择一个模型供应商
  - 您需要快速了解支持的 LLM 后端
---
# 模型供应商

Clawdbot 支持多种 LLM 供应商。选择供应商、完成认证，然后将默认模型设为 `provider/model` 即可。

如果您在找聊天渠道文档（WhatsApp / Telegram / Discord / Slack / Mattermost（插件）等），请查看 [渠道](/channels)。

## 推荐：Venius (Venice AI)

Venius 是我们推荐的 Venice AI 配置方案，提供隐私优先的推理，并可选用 Opus 处理高难度任务。

- 默认模型：`venice/llama-3.3-70b`
- 最佳综合：`venice/claude-opus-45`（Opus 仍然是最强的）

详见 [Venice AI](/providers/venice)。

## 快速开始

1) 通过供应商完成认证（通常运行 `openclaw-cn onboard`）。
2) 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 供应商文档

- [OpenAI（API + Codex）](/providers/openai)
- [Anthropic（API + Claude Code CLI）](/providers/anthropic)
- [Qwen（通义千问，OAuth）](/providers/qwen)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Moonshot AI（月之暗面）/ Kimi + Kimi Code](/providers/moonshot)
- [OpenCode Zen](/providers/opencode)
- [Amazon Bedrock](/bedrock)
- [Z.AI（智谱）](/providers/zai)
- [GLM 模型](/providers/glm)
- [MiniMax](/providers/minimax)
- [火山引擎 / 豆包](/providers/volcengine)
- [Venius（Venice AI，隐私优先）](/providers/venice)
- [Ollama（本地模型）](/providers/ollama)

## 语音转写供应商

- [Deepgram（音频转写）](/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - 将 Claude Max/Pro 订阅用作 OpenAI 兼容 API 端点

完整供应商目录（xAI、Groq、Mistral 等）及高级配置，请查看[模型供应商](/concepts/model-providers)。
