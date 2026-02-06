---
summary: "在 Clawdbot 中使用 OpenCode Zen（精选模型）"
read_when:
  - 您想通过 OpenCode Zen 访问模型
  - 您想要一个精选的编程友好模型列表
---
# OpenCode Zen

OpenCode Zen 是由 OpenCode 团队推荐的**精选编程模型列表**。
它是一个可选的托管模型访问方式，使用 API 密钥和 `opencode` 供应商。
Zen 目前处于 Beta 阶段。

## CLI 配置

```bash
openclaw-cn onboard --auth-choice opencode-zen
# 或非交互式
openclaw-cn onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

## 配置示例

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-5" } } }
}
```

## 说明

- 也支持 `OPENCODE_ZEN_API_KEY` 环境变量。
- 登录 Zen 后添加账单信息，然后复制 API 密钥即可使用。
- OpenCode Zen 按请求计费，详情请查看 OpenCode 控制台。
