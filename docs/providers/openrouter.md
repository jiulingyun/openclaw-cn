---
summary: "在 Clawdbot 中通过 OpenRouter 统一 API 访问多种模型"
read_when:
  - 您想用一个 API 密钥访问多种 LLM
  - 您想在 Clawdbot 中通过 OpenRouter 使用模型
---
# OpenRouter

OpenRouter 是一个**统一的模型 API 网关**，通过单一端点和 API 密钥将请求路由到多种模型（Claude、GPT、Gemini、Llama、DeepSeek 等）。它兼容 OpenAI API 格式，大多数 OpenAI SDK 只需切换 base URL 即可使用。

OpenRouter 对国内用户特别友好：**支持支付宝 (Alipay) 充值**，无需国际信用卡即可使用海外主流模型。

## CLI 配置

```bash
openclaw-cn onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## 配置示例

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" }
    }
  }
}
```

## 说明

- 模型引用格式为 `openrouter/<provider>/<model>`。
- 更多模型和供应商选项见 [/concepts/model-providers](/concepts/model-providers)。
- OpenRouter 底层使用 Bearer token 配合您的 API 密钥进行认证。
