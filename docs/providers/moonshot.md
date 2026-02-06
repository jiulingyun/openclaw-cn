---
summary: "配置 Moonshot（月之暗面）K2 与 Kimi Code（独立供应商和密钥）"
read_when:
  - 您想配置 Moonshot（月之暗面）K2 或 Kimi Code
  - 您需要了解它们各自的端点、密钥和模型引用
  - 您需要可直接复制的配置示例
---

# Moonshot AI（月之暗面）/ Kimi

Moonshot（月之暗面）提供 Kimi API，兼容 OpenAI 接口格式。配置供应商后将默认模型
设为 `moonshot/kimi-k2-0905-preview`，或使用 Kimi Code 的 `kimi-code/kimi-for-coding`。

当前 Kimi K2 模型 ID：
{/* moonshot-kimi-k2-ids:start */}
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
{/* moonshot-kimi-k2-ids:end */}

```bash
openclaw-cn onboard --auth-choice moonshot-api-key
```

Kimi Code：

```bash
openclaw-cn onboard --auth-choice kimi-code-api-key
```

注意：Moonshot（月之暗面）和 Kimi Code 是**两个独立的供应商**。API 密钥不互通，端点不同，模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Code 使用 `kimi-code/...`）。

## 配置示例（Moonshot API）

> **国内用户请注意：** 下方配置默认使用国内端点 `api.moonshot.cn`。
> 海外用户如需使用国际端点，请将 `baseUrl` 改为 `https://api.moonshot.ai/v1`。

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2-0905-preview" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2-0905-preview": { alias: "Kimi K2" },
        "moonshot/kimi-k2-turbo-preview": { alias: "Kimi K2 Turbo" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" }
        // moonshot-kimi-k2-aliases:end
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        // 国内端点（默认）；海外用户请改为 https://api.moonshot.ai/v1
        baseUrl: "https://api.moonshot.cn/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2-0905-preview",
            name: "Kimi K2 0905 Preview",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192
          },
          {
            id: "kimi-k2-turbo-preview",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192
          }
          // moonshot-kimi-k2-models:end
        ]
      }
    }
  }
}
```

## Kimi Code

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-code/kimi-for-coding" },
      models: {
        "kimi-code/kimi-for-coding": { alias: "Kimi Code" }
      }
    }
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-for-coding",
            name: "Kimi For Coding",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32768,
            headers: { "User-Agent": "KimiCLI/0.77" },
            compat: { supportsDeveloperRole: false }
          }
        ]
      }
    }
  }
}
```

## 说明

- Moonshot（月之暗面）模型引用格式为 `moonshot/<modelId>`，Kimi Code 模型引用格式为 `kimi-code/<modelId>`。
- 如需自定义定价和上下文元数据，可在 `models.providers` 中覆盖。
- 如果 Moonshot（月之暗面）发布了不同的上下文长度限制，请相应调整 `contextWindow`。
- **国内端点：** `https://api.moonshot.cn/v1`（本文档默认）
- **海外端点：** `https://api.moonshot.ai/v1`
