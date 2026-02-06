---
summary: "在 Clawdbot 中使用 Venice AI 隐私优先模型"
read_when:
  - 您想在 Clawdbot 中使用隐私优先的推理
  - 您需要 Venice AI 配置指南
---
# Venice AI（Venius 推荐方案）

**Venius** 是我们推荐的 Venice 配置方案，提供隐私优先的推理，并可选择通过匿名代理访问主流商业模型。

Venice AI 提供隐私优先的 AI 推理服务，支持无审查模型，以及通过匿名代理访问主流商业模型。所有推理默认私密——不会用您的数据训练，不记录日志。

## 为什么选择 Venice

- **私密推理** — 开源模型完全不记录日志
- **无审查模型** — 在需要时使用
- **匿名访问** — 通过代理使用商业模型（Opus/GPT/Gemini），元数据被剥离
- 兼容 OpenAI `/v1` 端点

## 隐私模式

Venice 提供两种隐私级别，选择模型时需要了解：

| 模式 | 说明 | 适用模型 |
|------|------|---------|
| **私密 (Private)** | 完全私密。提示和回复**永不存储或记录**。 | Llama、Qwen、DeepSeek、Venice Uncensored 等 |
| **匿名 (Anonymized)** | 通过 Venice 代理转发，元数据被剥离。底层供应商（OpenAI、Anthropic）看到的是匿名请求。 | Claude、GPT、Gemini、Grok、Kimi、MiniMax |

## 功能特性

- **隐私优先**：可选"私密"（完全私密）或"匿名"（代理转发）模式
- **无审查模型**：可访问无内容限制的模型
- **主流模型访问**：通过 Venice 匿名代理使用 Claude、GPT-5.2、Gemini、Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点，易于集成
- **流式传输**：所有模型支持
- **函数调用**：部分模型支持（查看模型功能）
- **视觉理解**：支持视觉功能的模型可用
- **无硬性速率限制**：极端使用量下可能有公平使用限流

## 配置

### 1. 获取 API 密钥

1. 在 [venice.ai](https://venice.ai) 注册
2. 前往 **Settings → API Keys → Create new key**
3. 复制 API 密钥（格式：`vapi_xxxxxxxxxxxx`）

### 2. 配置 Clawdbot

**方式 A：环境变量**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**方式 B：交互式配置（推荐）**

```bash
openclaw-cn onboard --auth-choice venice-api-key
```

这将：
1. 提示输入 API 密钥（或使用已有的 `VENICE_API_KEY`）
2. 显示所有可用的 Venice 模型
3. 让您选择默认模型
4. 自动配置供应商

**方式 C：非交互式**

```bash
openclaw-cn onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 验证配置

```bash
clawdbot chat --model venice/llama-3.3-70b "Hello, are you working?"
```

## 模型选择

配置完成后，Clawdbot 会显示所有可用的 Venice 模型。根据需求选择：

- **默认推荐**：`venice/llama-3.3-70b` — 私密，性能均衡
- **最佳综合质量**：`venice/claude-opus-45` — 适合高难度任务（Opus 仍然最强）
- **隐私优先**：选择"私密"模型，完全不记录日志
- **能力优先**：选择"匿名"模型，通过 Venice 代理访问 Claude、GPT、Gemini

随时切换默认模型：

```bash
openclaw-cn models set venice/claude-opus-45
openclaw-cn models set venice/llama-3.3-70b
```

列出所有可用模型：

```bash
openclaw-cn models list | grep venice
```

## 通过 `clawdbot configure` 配置

1. 运行 `clawdbot configure`
2. 选择 **Model/auth**
3. 选择 **Venice AI**

## 模型推荐

| 使用场景 | 推荐模型 | 原因 |
|---------|---------|------|
| **日常对话** | `llama-3.3-70b` | 综合表现好，完全私密 |
| **最佳综合质量** | `claude-opus-45` | Opus 处理高难度任务最强 |
| **隐私 + Claude 质量** | `claude-opus-45` | 通过匿名代理获得最佳推理 |
| **编程** | `qwen3-coder-480b-a35b-instruct` | 代码优化，262k 上下文 |
| **视觉任务** | `qwen3-vl-235b-a22b` | 最佳私密视觉模型 |
| **无审查** | `venice-uncensored` | 无内容限制 |
| **快速低成本** | `qwen3-4b` | 轻量级，仍有不错能力 |
| **复杂推理** | `deepseek-v3.2` | 强推理能力，私密 |

## 可用模型（共 25 个）

### 私密模型（15 个）— 完全私密，不记录日志

| 模型 ID | 名称 | 上下文（tokens） | 特性 |
|---------|------|-----------------|------|
| `llama-3.3-70b` | Llama 3.3 70B | 131k | 通用 |
| `llama-3.2-3b` | Llama 3.2 3B | 131k | 快速轻量 |
| `hermes-3-llama-3.1-405b` | Hermes 3 Llama 3.1 405B | 131k | 复杂任务 |
| `qwen3-235b-a22b-thinking-2507` | Qwen3 235B Thinking | 131k | 推理 |
| `qwen3-235b-a22b-instruct-2507` | Qwen3 235B Instruct | 131k | 通用 |
| `qwen3-coder-480b-a35b-instruct` | Qwen3 Coder 480B | 262k | 编程 |
| `qwen3-next-80b` | Qwen3 Next 80B | 262k | 通用 |
| `qwen3-vl-235b-a22b` | Qwen3 VL 235B | 262k | 视觉 |
| `qwen3-4b` | Venice Small (Qwen3 4B) | 32k | 快速推理 |
| `deepseek-v3.2` | DeepSeek V3.2 | 163k | 推理 |
| `venice-uncensored` | Venice Uncensored | 32k | 无审查 |
| `mistral-31-24b` | Venice Medium (Mistral) | 131k | 视觉 |
| `google-gemma-3-27b-it` | Gemma 3 27B Instruct | 202k | 视觉 |
| `openai-gpt-oss-120b` | OpenAI GPT OSS 120B | 131k | 通用 |
| `zai-org-glm-4.7` | GLM 4.7 | 202k | 推理、多语言 |

### 匿名模型（10 个）— 通过 Venice 代理

| 模型 ID | 原始模型 | 上下文（tokens） | 特性 |
|---------|---------|-----------------|------|
| `claude-opus-45` | Claude Opus 4.5 | 202k | 推理、视觉 |
| `claude-sonnet-45` | Claude Sonnet 4.5 | 202k | 推理、视觉 |
| `openai-gpt-52` | GPT-5.2 | 262k | 推理 |
| `openai-gpt-52-codex` | GPT-5.2 Codex | 262k | 推理、视觉 |
| `gemini-3-pro-preview` | Gemini 3 Pro | 202k | 推理、视觉 |
| `gemini-3-flash-preview` | Gemini 3 Flash | 262k | 推理、视觉 |
| `grok-41-fast` | Grok 4.1 Fast | 262k | 推理、视觉 |
| `grok-code-fast-1` | Grok Code Fast 1 | 262k | 推理、编程 |
| `kimi-k2-thinking` | Kimi K2 Thinking | 262k | 推理 |
| `minimax-m21` | MiniMax M2.1 | 202k | 推理 |

## 模型发现

设置 `VENICE_API_KEY` 后，Clawdbot 会自动从 Venice API 发现模型。如果 API 不可达，则回退到静态模型目录。

`/models` 端点是公开的（列出模型不需要认证），但推理需要有效的 API 密钥。

## 流式传输和工具支持

| 功能 | 支持情况 |
|------|---------|
| **流式传输** | 所有模型支持 |
| **函数调用** | 大部分模型支持（查看 API 中的 `supportsFunctionCalling`） |
| **视觉/图片** | 标记"视觉"特性的模型支持 |
| **JSON 模式** | 通过 `response_format` 支持 |

## 定价

Venice 使用积分制。当前费率请查看 [venice.ai/pricing](https://venice.ai/pricing)：

- **私密模型**：通常成本更低
- **匿名模型**：接近直接 API 定价 + Venice 小额费用

## 对比：Venice vs 直接 API

| 方面 | Venice（匿名） | 直接 API |
|------|---------------|---------|
| **隐私** | 元数据被剥离，匿名化 | 关联您的账户 |
| **延迟** | +10-50ms（代理） | 直连 |
| **功能** | 大部分功能支持 | 全部功能 |
| **计费** | Venice 积分 | 供应商计费 |

## 使用示例

```bash
# 使用默认私密模型
clawdbot chat --model venice/llama-3.3-70b

# 通过 Venice 使用 Claude（匿名）
clawdbot chat --model venice/claude-opus-45

# 使用无审查模型
clawdbot chat --model venice/venice-uncensored

# 使用视觉模型
clawdbot chat --model venice/qwen3-vl-235b-a22b

# 使用编程模型
clawdbot chat --model venice/qwen3-coder-480b-a35b-instruct
```

## 故障排除

### API 密钥无法识别

```bash
echo $VENICE_API_KEY
openclaw-cn models list | grep venice
```

确保密钥以 `vapi_` 开头。

### 模型不可用

Venice 模型目录动态更新。运行 `openclaw-cn models list` 查看当前可用模型。部分模型可能临时离线。

### 连接问题

Venice API 地址为 `https://api.venice.ai/api/v1`。请确保网络允许 HTTPS 连接。

## 配置文件示例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/llama-3.3-70b" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.3-70b",
            name: "Llama 3.3 70B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## 链接

- [Venice AI](https://venice.ai)
- [API 文档](https://docs.venice.ai)
- [定价](https://venice.ai/pricing)
- [服务状态](https://status.venice.ai)
