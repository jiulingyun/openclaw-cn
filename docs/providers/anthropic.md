---
summary: "在 Clawdbot 中通过 API 密钥或 Claude Code CLI 认证使用 Anthropic Claude"
read_when:
  - 您想在 Clawdbot 中使用 Anthropic 模型
  - 您想用 setup-token 或 Claude Code CLI 认证而非 API 密钥
---
# Anthropic (Claude)

Anthropic 开发了 **Claude** 模型系列，并通过 API 提供访问。
在 Clawdbot 中，您可以使用 API 密钥认证，或复用 **Claude Code CLI** 凭证
（setup-token 或 OAuth）。

## 方式 A：Anthropic API 密钥

**适用场景：** 标准 API 访问，按量计费。
在 Anthropic Console 中创建 API 密钥。

### CLI 配置

```bash
openclaw-cn onboard
# 选择：Anthropic API key

# 或非交互式
openclaw-cn onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### 配置示例

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## Prompt 缓存（Anthropic API）

Clawdbot **不会**覆盖 Anthropic 的默认缓存 TTL，除非您手动设置。
此功能仅适用于 **API 密钥**；Claude Code CLI OAuth 会忽略 TTL 设置。

按模型设置 TTL，使用 `cacheControlTtl`：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": {
          params: { cacheControlTtl: "5m" } // 或 "1h"
        }
      }
    }
  }
}
```

Clawdbot 在 Anthropic API 请求中包含 `extended-cache-ttl-2025-04-11` beta 标志；
如果您覆盖了供应商 headers，请保留此标志（详见 [/gateway/configuration](/gateway/configuration)）。

## 方式 B：Claude Code CLI（setup-token 或 OAuth）

**适用场景：** 使用您的 Claude 订阅或已有的 Claude Code CLI 登录。

### 获取 setup-token

setup-token 由 **Claude Code CLI** 生成，不是在 Anthropic Console 中创建。可在**任何机器**上运行：

```bash
claude setup-token
```

将 token 粘贴到 Clawdbot（向导中选择 **Anthropic token (paste setup-token)**），或在网关主机上运行：

```bash
openclaw-cn models auth setup-token --provider anthropic
```

如果您在另一台机器上生成了 token，粘贴它：

```bash
openclaw-cn models auth paste-token --provider anthropic
```

### CLI 配置

```bash
# 复用 Claude Code CLI OAuth 凭证（如果已登录）
openclaw-cn onboard --auth-choice claude-cli
```

### 配置示例

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-5" } } }
}
```

## 说明

- 使用 `claude setup-token` 生成 token 并粘贴，或在网关主机上运行 `openclaw-cn models auth setup-token`。
- 如果看到 "OAuth token refresh failed ..." 错误（Claude 订阅），请重新用 setup-token 认证或在网关主机上重新同步 Claude Code CLI OAuth。详见 [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription)。
- Clawdbot 将 `auth.profiles["anthropic:claude-cli"].mode` 设为 `"oauth"`，使配置文件同时接受 OAuth 和 setup-token 凭证。旧配置中的 `"token"` 在加载时会自动迁移。
- 认证详情和复用规则见 [/concepts/oauth](/concepts/oauth)。

## 故障排除

**401 错误 / token 突然失效**
- Claude 订阅认证可能过期或被撤销。重新运行 `claude setup-token` 并粘贴到**网关主机**。
- 如果 Claude CLI 登录在另一台机器上，在网关主机上使用
  `openclaw-cn models auth paste-token --provider anthropic`。

**No API key found for provider "anthropic"**
- 认证是**按 agent 隔离的**。新 agent 不会继承主 agent 的密钥。
- 为该 agent 重新运行 onboarding，或在网关主机上粘贴 setup-token / API 密钥，
  然后用 `openclaw-cn models status` 验证。

**No credentials found for profile `anthropic:default` or `anthropic:claude-cli`**
- 运行 `openclaw-cn models status` 查看当前活跃的认证配置。
- 重新运行 onboarding，或为该配置粘贴 setup-token / API 密钥。

**No available auth profile (all in cooldown/unavailable)**
- 检查 `openclaw-cn models status --json` 中的 `auth.unusableProfiles`。
- 添加另一个 Anthropic 配置或等待冷却结束。

更多内容：[/gateway/troubleshooting](/gateway/troubleshooting) 和 [/help/faq](/help/faq)。
