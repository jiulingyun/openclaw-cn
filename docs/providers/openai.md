---
summary: "在 Clawdbot 中通过 API 密钥或 Codex 订阅使用 OpenAI"
read_when:
  - 您想在 Clawdbot 中使用 OpenAI 模型
  - 您想用 Codex 订阅认证而非 API 密钥
---
# OpenAI

OpenAI 提供 GPT 系列模型的开发者 API。Codex 支持通过 **ChatGPT 登录**使用订阅访问，
或通过 **API 密钥**使用按量计费访问。Codex 云端需要 ChatGPT 登录，而 Codex CLI 两种
方式都支持。Codex CLI 会将登录信息缓存到 `~/.codex/auth.json`（或系统凭证存储），
Clawdbot 可以复用这些凭证。

## 方式 A：OpenAI API 密钥（OpenAI Platform）

**适用场景：** 直接 API 访问，按量计费。
从 OpenAI 控制台获取 API 密钥。

### CLI 配置

```bash
openclaw-cn onboard --auth-choice openai-api-key
# 或非交互式
openclaw-cn onboard --openai-api-key "$OPENAI_API_KEY"
```

### 配置示例

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } }
}
```

## 方式 B：OpenAI Code (Codex) 订阅

**适用场景：** 使用 ChatGPT/Codex 订阅访问，而非 API 密钥。
Codex 云端需要 ChatGPT 登录，Codex CLI 支持 ChatGPT 或 API 密钥登录。

Clawdbot 可以复用您的 **Codex CLI** 登录凭证（`~/.codex/auth.json`）或执行 OAuth 流程。

### CLI 配置

```bash
# 复用已有的 Codex CLI 登录
openclaw-cn onboard --auth-choice codex-cli

# 或在引导向导中执行 Codex OAuth
openclaw-cn onboard --auth-choice openai-codex
```

### 配置示例

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } }
}
```

## 说明

- 模型引用格式始终为 `provider/model`（详见 [/concepts/models](/concepts/models)）。
- 认证详情和复用规则见 [/concepts/oauth](/concepts/oauth)。
