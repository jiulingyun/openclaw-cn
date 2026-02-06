---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 配置（认证 + 模型选择）"
read_when:
  - 您想在 Clawdbot 中使用 Vercel AI Gateway
  - 您需要 API 密钥环境变量或 CLI 认证选项
---
# Vercel AI Gateway

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供统一 API，通过单一端点访问数百种模型。

- 供应商：`vercel-ai-gateway`
- 认证：`AI_GATEWAY_API_KEY`
- API：兼容 Anthropic Messages 格式

## 快速开始

1) 设置 API 密钥（推荐：为网关存储）：

```bash
openclaw-cn onboard --auth-choice ai-gateway-api-key
```

2) 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.5" }
    }
  }
}
```

## 非交互式示例

```bash
openclaw-cn onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 环境说明

如果网关以守护进程运行（launchd/systemd），请确保该进程能访问 `AI_GATEWAY_API_KEY`
（例如写在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置）。
