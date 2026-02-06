---
summary: "在 Clawdbot 中通过设备流程登录 GitHub Copilot"
read_when:
  - 您想使用 GitHub Copilot 作为模型供应商
  - 您需要 `openclaw-cn models auth login-github-copilot` 流程
---
# GitHub Copilot

## 什么是 GitHub Copilot

GitHub Copilot 是 GitHub 的 AI 编程助手，根据您的 GitHub 账户和订阅计划提供
Copilot 模型的访问权限。Clawdbot 支持两种方式使用 Copilot。

## 两种使用方式

### 1) 内置 GitHub Copilot 供应商 (`github-copilot`)

使用原生设备登录流程获取 GitHub token，然后在 Clawdbot 运行时兑换为
Copilot API token。这是**默认且最简单**的方式，不需要 VS Code。

### 2) Copilot Proxy 插件 (`copilot-proxy`)

使用 **Copilot Proxy** VS Code 扩展作为本地桥接。Clawdbot 连接到代理的
`/v1` 端点，使用您在扩展中配置的模型列表。如果您已经在 VS Code 中运行
Copilot Proxy 或需要通过它路由，请选择此方式。需要启用插件并保持 VS Code
扩展运行。

## CLI 配置

```bash
openclaw-cn models auth login-github-copilot
```

系统会提示您访问一个 URL 并输入一次性代码。在完成之前请保持终端打开。

### 可选参数

```bash
openclaw-cn models auth login-github-copilot --profile-id github-copilot:work
openclaw-cn models auth login-github-copilot --yes
```

## 设置默认模型

```bash
openclaw-cn models set github-copilot/gpt-4o
```

### 配置示例

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } }
}
```

## 说明

- 需要交互式终端（TTY），请直接在终端中运行。
- Copilot 可用的模型取决于您的订阅计划；如果某个模型被拒绝，请尝试
  其他 ID（例如 `github-copilot/gpt-4.1`）。
- 登录后会将 GitHub token 存储在认证配置中，Clawdbot 运行时兑换为
  Copilot API token。
