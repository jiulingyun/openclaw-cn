# 🦞 Clawdbot 中文版 — 私有化部署的 AI 智能助手

> **🇨🇳 这是 [clawdbot/clawdbot](https://github.com/clawdbot/clawdbot) 的简体中文版本，定期与上游保持同步。**
>
> 欢迎提交 Issue 和 PR！Bug 修复和功能优化会考虑贡献回上游。

> **正在进行的工作：** 目前正在完成各项翻译工作，后续将研究接入国内社交软件，例如QQ、微信、钉钉、企业微信、飞书等。

<p align="center">
  <img src="https://raw.githubusercontent.com/clawdbot/clawdbot/main/docs/whatsapp-clawd.jpg" alt="Clawdbot" width="400">
</p>

<p align="center">
  <strong>EXFOLIATE! EXFOLIATE!</strong>
</p>

<p align="center">
  <a href="https://github.com/jiulingyun/clawdbot-chinese/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/jiulingyun/clawdbot-chinese/ci.yml?branch=main&style=for-the-badge" alt="CI 状态"></a>
  <a href="https://github.com/jiulingyun/clawdbot-chinese/releases"><img src="https://img.shields.io/github/v/release/jiulingyun/clawdbot-chinese?include_prereleases&style=for-the-badge" alt="GitHub 发布"></a>
  <a href="https://deepwiki.com/clawdbot/clawdbot"><img src="https://img.shields.io/badge/DeepWiki-clawdbot-111111?style=for-the-badge" alt="DeepWiki"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT 许可证"></a>
</p>

**Clawdbot** 是一款可在你自己设备上运行的*私有 AI 智能助手*。
它可以在你常用的渠道上回复你（WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Microsoft Teams、WebChat），还支持 BlueBubbles、Matrix、Zalo 等扩展渠道。它可以在 macOS/iOS/Android 上进行语音交互，还能渲染你可控制的实时 Canvas 画布。Gateway 只是控制平面——产品的核心是智能助手本身。

如果你想要一个本地优先、快速响应、始终在线的私人单用户助手，这就是你要找的。

[官网](https://clawdbot.com) · [文档](https://docs.clawd.bot) · [快速开始](https://docs.clawd.bot/start/getting-started) · [更新指南](https://docs.clawd.bot/install/updating) · [案例展示](https://docs.clawd.bot/start/showcase) · [常见问题](https://docs.clawd.bot/start/faq) · [安装向导](https://docs.clawd.bot/start/wizard) · [Nix](https://github.com/clawdbot/nix-clawdbot) · [Docker](https://docs.clawd.bot/install/docker) · [Discord](https://discord.gg/clawd)

推荐方式：运行安装向导（`clawdbot onboard`）。它会引导你完成 Gateway、工作区、渠道和技能的配置。CLI 向导是推荐的安装路径，支持 **macOS、Linux 和 Windows（通过 WSL2，强烈推荐）**。
支持 npm、pnpm 或 bun。
新用户？从这里开始：[快速开始](https://docs.clawd.bot/start/getting-started)

**订阅服务（OAuth）：**
- **[Anthropic](https://www.anthropic.com/)**（Claude Pro/Max）
- **[OpenAI](https://openai.com/)**（ChatGPT/Codex）

模型建议：虽然支持任何模型，但强烈推荐 **Anthropic Pro/Max (100/200) + Opus 4.5**，具有更强的长上下文能力和更好的提示注入防护。详见 [安装引导](https://docs.clawd.bot/start/onboarding)。

## 模型配置与认证

- 模型配置 + CLI：[模型](https://docs.clawd.bot/concepts/models)
- 认证配置轮换（OAuth vs API 密钥）+ 故障转移：[模型故障转移](https://docs.clawd.bot/concepts/model-failover)

## 安装（推荐方式）

运行时要求：**Node ≥22**

```bash
npm install -g clawdbot@latest
# 或者：pnpm add -g clawdbot@latest

clawdbot onboard --install-daemon
```

向导会安装 Gateway 守护进程（launchd/systemd 用户服务），使其保持运行。

## 快速开始

运行时要求：**Node ≥22**

完整新手指南（认证、配对、渠道）：[快速开始](https://docs.clawd.bot/start/getting-started)

```bash
clawdbot onboard --install-daemon

clawdbot gateway --port 18789 --verbose

# 发送消息
clawdbot message send --to +1234567890 --message "你好，来自 Clawdbot"

# 与助手对话（可选择将回复发送到任何已连接的渠道：WhatsApp/Telegram/Slack/Discord/Google Chat/Signal/iMessage/BlueBubbles/Microsoft Teams/Matrix/Zalo/Zalo Personal/WebChat）
clawdbot agent --message "发货清单" --thinking high
```

升级？参考 [更新指南](https://docs.clawd.bot/install/updating)（并运行 `clawdbot doctor`）。

## 发布渠道

- **stable**：标签发布版（`vYYYY.M.D` 或 `vYYYY.M.D-<patch>`），npm dist-tag `latest`。
- **beta**：预发布标签（`vYYYY.M.D-beta.N`），npm dist-tag `beta`（macOS 应用可能缺失）。
- **dev**：`main` 分支最新代码，npm dist-tag `dev`（如有发布）。

切换渠道（git + npm）：`clawdbot update --channel stable|beta|dev`
详情：[发布渠道](https://docs.clawd.bot/install/development-channels)

## 从源码构建（开发）

源码构建推荐使用 `pnpm`。Bun 可选，用于直接运行 TypeScript。

```bash
git clone https://github.com/jiulingyun/clawdbot-chinese.git
cd clawdbot-chinese

pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build

pnpm clawdbot onboard --install-daemon

# 开发循环（TS 文件变更时自动重载）
pnpm gateway:watch
```

注意：`pnpm clawdbot ...` 通过 `tsx` 直接运行 TypeScript。`pnpm build` 生成 `dist/` 目录，用于通过 Node 或打包后的 `clawdbot` 二进制文件运行。

## 安全默认设置（私信访问）

Clawdbot 连接到真实的消息平台。请将收到的私信视为**不可信输入**。

完整安全指南：[安全](https://docs.clawd.bot/gateway/security)

Telegram/WhatsApp/Signal/iMessage/Microsoft Teams/Discord/Google Chat/Slack 的默认行为：
- **私信配对**（`dmPolicy="pairing"` / `channels.discord.dm.policy="pairing"` / `channels.slack.dm.policy="pairing"`）：未知发送者会收到一个短配对码，机器人不会处理他们的消息。
- 批准方式：`clawdbot pairing approve <channel> <code>`（发送者会被添加到本地白名单存储中）。
- 公开接收私信需要明确选择加入：设置 `dmPolicy="open"` 并在渠道白名单中包含 `"*"`（`allowFrom` / `channels.discord.dm.allowFrom` / `channels.slack.dm.allowFrom`）。

运行 `clawdbot doctor` 可发现有风险或配置错误的私信策略。

## 亮点功能

- **[本地优先 Gateway](https://docs.clawd.bot/gateway)** — 会话、渠道、工具和事件的统一控制平面。
- **[多渠道收件箱](https://docs.clawd.bot/channels)** — WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、BlueBubbles、Microsoft Teams、Matrix、Zalo、Zalo Personal、WebChat、macOS、iOS/Android。
- **[多智能体路由](https://docs.clawd.bot/gateway/configuration)** — 将入站渠道/账户/对等节点路由到隔离的智能体（工作区 + 每智能体会话）。
- **[语音唤醒](https://docs.clawd.bot/nodes/voicewake) + [对话模式](https://docs.clawd.bot/nodes/talk)** — macOS/iOS/Android 上的始终在线语音，支持 ElevenLabs。
- **[实时 Canvas](https://docs.clawd.bot/platforms/mac/canvas)** — 智能体驱动的可视化工作区，支持 [A2UI](https://docs.clawd.bot/platforms/mac/canvas#canvas-a2ui)。
- **[一流的工具支持](https://docs.clawd.bot/tools)** — 浏览器、Canvas、节点、定时任务、会话以及 Discord/Slack 操作。
- **[配套应用](https://docs.clawd.bot/platforms/macos)** — macOS 菜单栏应用 + iOS/Android [节点](https://docs.clawd.bot/nodes)。
- **[安装引导](https://docs.clawd.bot/start/wizard) + [技能](https://docs.clawd.bot/tools/skills)** — 向导式设置，支持内置/托管/工作区技能。

## 已构建的功能

### 核心平台
- [Gateway WS 控制平面](https://docs.clawd.bot/gateway)：会话、在线状态、配置、定时任务、Webhook、[控制 UI](https://docs.clawd.bot/web) 和 [Canvas 主机](https://docs.clawd.bot/platforms/mac/canvas#canvas-a2ui)。
- [CLI 命令行](https://docs.clawd.bot/tools/agent-send)：gateway、agent、send、[向导](https://docs.clawd.bot/start/wizard) 和 [doctor](https://docs.clawd.bot/gateway/doctor)。
- [Pi 智能体运行时](https://docs.clawd.bot/concepts/agent)：RPC 模式，支持工具流和块流。
- [会话模型](https://docs.clawd.bot/concepts/session)：`main` 用于直接聊天，群组隔离、激活模式、队列模式、回复返回。群组规则：[群组](https://docs.clawd.bot/concepts/groups)。
- [媒体管道](https://docs.clawd.bot/nodes/images)：图片/音频/视频、转录钩子、大小限制、临时文件生命周期。音频详情：[音频](https://docs.clawd.bot/nodes/audio)。

### 渠道
- [渠道](https://docs.clawd.bot/channels)：[WhatsApp](https://docs.clawd.bot/channels/whatsapp) (Baileys)、[Telegram](https://docs.clawd.bot/channels/telegram) (grammY)、[Slack](https://docs.clawd.bot/channels/slack) (Bolt)、[Discord](https://docs.clawd.bot/channels/discord) (discord.js)、[Google Chat](https://docs.clawd.bot/channels/googlechat) (Chat API)、[Signal](https://docs.clawd.bot/channels/signal) (signal-cli)、[iMessage](https://docs.clawd.bot/channels/imessage) (imsg)、[BlueBubbles](https://docs.clawd.bot/channels/bluebubbles) (扩展)、[Microsoft Teams](https://docs.clawd.bot/channels/msteams) (扩展)、[Matrix](https://docs.clawd.bot/channels/matrix) (扩展)、[Zalo](https://docs.clawd.bot/channels/zalo) (扩展)、[Zalo Personal](https://docs.clawd.bot/channels/zalouser) (扩展)、[WebChat](https://docs.clawd.bot/web/webchat)。
- [群组路由](https://docs.clawd.bot/concepts/group-messages)：@提及门控、回复标签、按渠道分块和路由。渠道规则：[渠道](https://docs.clawd.bot/channels)。

### 应用 + 节点
- [macOS 应用](https://docs.clawd.bot/platforms/macos)：菜单栏控制平面、[语音唤醒](https://docs.clawd.bot/nodes/voicewake)/PTT、[对话模式](https://docs.clawd.bot/nodes/talk)悬浮窗、[WebChat](https://docs.clawd.bot/web/webchat)、调试工具、[远程 Gateway](https://docs.clawd.bot/gateway/remote) 控制。
- [iOS 节点](https://docs.clawd.bot/platforms/ios)：[Canvas](https://docs.clawd.bot/platforms/mac/canvas)、[语音唤醒](https://docs.clawd.bot/nodes/voicewake)、[对话模式](https://docs.clawd.bot/nodes/talk)、相机、屏幕录制、Bonjour 配对。
- [Android 节点](https://docs.clawd.bot/platforms/android)：[Canvas](https://docs.clawd.bot/platforms/mac/canvas)、[对话模式](https://docs.clawd.bot/nodes/talk)、相机、屏幕录制、可选短信。
- [macOS 节点模式](https://docs.clawd.bot/nodes)：system.run/notify + Canvas/相机暴露。

### 工具 + 自动化
- [浏览器控制](https://docs.clawd.bot/tools/browser)：专用 clawd Chrome/Chromium、快照、操作、上传、配置文件。
- [Canvas](https://docs.clawd.bot/platforms/mac/canvas)：[A2UI](https://docs.clawd.bot/platforms/mac/canvas#canvas-a2ui) push/reset、eval、snapshot。
- [节点](https://docs.clawd.bot/nodes)：相机拍照/录制、屏幕录制、[location.get](https://docs.clawd.bot/nodes/location-command)、通知。
- [定时任务 + 唤醒](https://docs.clawd.bot/automation/cron-jobs)；[Webhook](https://docs.clawd.bot/automation/webhook)；[Gmail Pub/Sub](https://docs.clawd.bot/automation/gmail-pubsub)。
- [技能平台](https://docs.clawd.bot/tools/skills)：内置、托管和工作区技能，支持安装门控 + UI。

### 运行时 + 安全
- [渠道路由](https://docs.clawd.bot/concepts/channel-routing)、[重试策略](https://docs.clawd.bot/concepts/retry) 和 [流式/分块](https://docs.clawd.bot/concepts/streaming)。
- [在线状态](https://docs.clawd.bot/concepts/presence)、[输入指示器](https://docs.clawd.bot/concepts/typing-indicators) 和 [用量追踪](https://docs.clawd.bot/concepts/usage-tracking)。
- [模型](https://docs.clawd.bot/concepts/models)、[模型故障转移](https://docs.clawd.bot/concepts/model-failover) 和 [会话裁剪](https://docs.clawd.bot/concepts/session-pruning)。
- [安全](https://docs.clawd.bot/gateway/security) 和 [故障排除](https://docs.clawd.bot/channels/troubleshooting)。

### 运维 + 打包
- [控制 UI](https://docs.clawd.bot/web) + [WebChat](https://docs.clawd.bot/web/webchat) 直接由 Gateway 提供服务。
- [Tailscale Serve/Funnel](https://docs.clawd.bot/gateway/tailscale) 或 [SSH 隧道](https://docs.clawd.bot/gateway/remote)，支持 token/密码认证。
- [Nix 模式](https://docs.clawd.bot/install/nix) 用于声明式配置；[Docker](https://docs.clawd.bot/install/docker) 安装。
- [Doctor](https://docs.clawd.bot/gateway/doctor) 迁移、[日志](https://docs.clawd.bot/logging)。

## 工作原理（简图）

```
WhatsApp / Telegram / Slack / Discord / Google Chat / Signal / iMessage / BlueBubbles / Microsoft Teams / Matrix / Zalo / Zalo Personal / WebChat
               │
               ▼
┌───────────────────────────────┐
│            Gateway            │
│         （控制平面）            │
│     ws://127.0.0.1:18789      │
└──────────────┬────────────────┘
               │
               ├─ Pi 智能体 (RPC)
               ├─ CLI (clawdbot …)
               ├─ WebChat UI
               ├─ macOS 应用
               └─ iOS / Android 节点
```

## 核心子系统

- **[Gateway WebSocket 网络](https://docs.clawd.bot/concepts/architecture)** — 客户端、工具和事件的单一 WS 控制平面（运维：[Gateway 手册](https://docs.clawd.bot/gateway)）。
- **[Tailscale 暴露](https://docs.clawd.bot/gateway/tailscale)** — Gateway 仪表盘 + WS 的 Serve/Funnel（远程访问：[远程](https://docs.clawd.bot/gateway/remote)）。
- **[浏览器控制](https://docs.clawd.bot/tools/browser)** — clawd 托管的 Chrome/Chromium，CDP 控制。
- **[Canvas + A2UI](https://docs.clawd.bot/platforms/mac/canvas)** — 智能体驱动的可视化工作区（A2UI 主机：[Canvas/A2UI](https://docs.clawd.bot/platforms/mac/canvas#canvas-a2ui)）。
- **[语音唤醒](https://docs.clawd.bot/nodes/voicewake) + [对话模式](https://docs.clawd.bot/nodes/talk)** — 始终在线语音和持续对话。
- **[节点](https://docs.clawd.bot/nodes)** — Canvas、相机拍照/录制、屏幕录制、`location.get`、通知，以及 macOS 专属的 `system.run`/`system.notify`。

## Tailscale 访问（Gateway 仪表盘）

Clawdbot 可以自动配置 Tailscale **Serve**（仅 tailnet）或 **Funnel**（公开），同时 Gateway 保持绑定到 loopback。配置 `gateway.tailscale.mode`：

- `off`：不启用 Tailscale 自动化（默认）。
- `serve`：通过 `tailscale serve` 提供仅 tailnet 的 HTTPS（默认使用 Tailscale 身份头）。
- `funnel`：通过 `tailscale funnel` 提供公开 HTTPS（需要共享密码认证）。

注意事项：
- 启用 Serve/Funnel 时，`gateway.bind` 必须保持为 `loopback`（Clawdbot 强制执行此规则）。
- 可以通过设置 `gateway.auth.mode: "password"` 或 `gateway.auth.allowTailscale: false` 强制 Serve 要求密码。
- 除非设置 `gateway.auth.mode: "password"`，否则 Funnel 拒绝启动。
- 可选：`gateway.tailscale.resetOnExit` 用于在关闭时撤销 Serve/Funnel。

详情：[Tailscale 指南](https://docs.clawd.bot/gateway/tailscale) · [Web 界面](https://docs.clawd.bot/web)

## 远程 Gateway（Linux 是个好选择）

在小型 Linux 实例上运行 Gateway 完全没问题。客户端（macOS 应用、CLI、WebChat）可以通过 **Tailscale Serve/Funnel** 或 **SSH 隧道** 连接，你仍然可以配对设备节点（macOS/iOS/Android）来在需要时执行设备本地操作。

- **Gateway 主机** 默认运行 exec 工具和渠道连接。
- **设备节点** 通过 `node.invoke` 运行设备本地操作（`system.run`、相机、屏幕录制、通知）。

简而言之：exec 在 Gateway 所在位置运行；设备操作在设备所在位置运行。

详情：[远程访问](https://docs.clawd.bot/gateway/remote) · [节点](https://docs.clawd.bot/nodes) · [安全](https://docs.clawd.bot/gateway/security)

## macOS 权限（通过 Gateway 协议）

macOS 应用可以在**节点模式**下运行，并通过 Gateway WebSocket 广播其能力和权限映射（`node.list` / `node.describe`）。客户端可以通过 `node.invoke` 执行本地操作：

- `system.run` 运行本地命令并返回 stdout/stderr/退出码；设置 `needsScreenRecording: true` 以要求屏幕录制权限（否则会得到 `PERMISSION_MISSING`）。
- `system.notify` 发布用户通知，如果通知被拒绝则失败。
- `canvas.*`、`camera.*`、`screen.record` 和 `location.get` 也通过 `node.invoke` 路由，遵循 TCC 权限状态。

提升的 bash（主机权限）与 macOS TCC 分开：

- 使用 `/elevated on|off` 在启用并加入白名单时切换每会话的提升访问。
- Gateway 通过 `sessions.patch`（WS 方法）持久化每会话的切换，与 `thinkingLevel`、`verboseLevel`、`model`、`sendPolicy` 和 `groupActivation` 一起。

详情：[节点](https://docs.clawd.bot/nodes) · [macOS 应用](https://docs.clawd.bot/platforms/macos) · [Gateway 协议](https://docs.clawd.bot/concepts/architecture)

## 智能体间通信（sessions_* 工具）

- 使用这些工具在会话间协调工作，无需在聊天界面间切换。
- `sessions_list` — 发现活跃会话（智能体）及其元数据。
- `sessions_history` — 获取会话的对话日志。
- `sessions_send` — 向另一个会话发送消息；可选回复返回乒乓 + 公告步骤（`REPLY_SKIP`、`ANNOUNCE_SKIP`）。

详情：[会话工具](https://docs.clawd.bot/concepts/session-tool)

## 技能注册表（ClawdHub）

ClawdHub 是一个简洁的技能注册表。启用 ClawdHub 后，智能体可以自动搜索技能并根据需要引入新技能。

[ClawdHub](https://ClawdHub.com)

## 聊天命令

在 WhatsApp/Telegram/Slack/Google Chat/Microsoft Teams/WebChat 中发送这些命令（群组命令仅限所有者）：

- `/status` — 简洁的会话状态（模型 + token 数，可用时显示费用）
- `/new` 或 `/reset` — 重置会话
- `/compact` — 压缩会话上下文（摘要）
- `/think <level>` — off|minimal|low|medium|high|xhigh（仅 GPT-5.2 + Codex 模型）
- `/verbose on|off`
- `/usage off|tokens|full` — 每次响应的用量页脚
- `/restart` — 重启 Gateway（群组中仅限所有者）
- `/activation mention|always` — 群组激活切换（仅群组）

## 应用（可选）

单独的 Gateway 就能提供很好的体验。所有应用都是可选的，用于添加额外功能。

如果你计划构建/运行配套应用，请参考以下平台手册。

### macOS (Clawdbot.app)（可选）

- Gateway 和健康状态的菜单栏控制。
- 语音唤醒 + 按键说话悬浮窗。
- WebChat + 调试工具。
- 通过 SSH 进行远程 Gateway 控制。

注意：需要签名构建才能使 macOS 权限在重建后保持（见 `docs/mac/permissions.md`）。

### iOS 节点（可选）

- 通过 Bridge 作为节点配对。
- 语音触发转发 + Canvas 界面。
- 通过 `clawdbot nodes …` 控制。

运行手册：[iOS 连接](https://docs.clawd.bot/platforms/ios)

### Android 节点（可选）

- 与 iOS 使用相同的 Bridge + 配对流程进行配对。
- 暴露 Canvas、相机和屏幕捕获命令。
- 运行手册：[Android 连接](https://docs.clawd.bot/platforms/android)

## 智能体工作区 + 技能

- 工作区根目录：`~/clawd`（可通过 `agents.defaults.workspace` 配置）。
- 注入的提示文件：`AGENTS.md`、`SOUL.md`、`TOOLS.md`。
- 技能：`~/clawd/skills/<skill>/SKILL.md`。

## 配置

最小化 `~/.clawdbot-cn/clawdbot-cn.json`（模型 + 默认值）：

```json5
{
  agent: {
    model: "anthropic/claude-opus-4-5"
  }
}
```

[完整配置参考（所有键 + 示例）](https://docs.clawd.bot/gateway/configuration)

## 安全模型（重要）

- **默认：** 工具在 **main** 会话的主机上运行，所以当只有你一个人时，智能体拥有完全访问权限。
- **群组/渠道安全：** 设置 `agents.defaults.sandbox.mode: "non-main"` 以在每会话的 Docker 沙箱中运行**非 main 会话**（群组/渠道）；这些会话的 bash 会在 Docker 中运行。
- **沙箱默认值：** 白名单：`bash`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`；黑名单：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`。

详情：[安全指南](https://docs.clawd.bot/gateway/security) · [Docker + 沙箱](https://docs.clawd.bot/install/docker) · [沙箱配置](https://docs.clawd.bot/gateway/configuration)

### [WhatsApp](https://docs.clawd.bot/channels/whatsapp)

- 链接设备：`pnpm clawdbot-cn channels login`（凭证存储在 `~/.clawdbot-cn/credentials`）。
- 或者使用：`pnpm clawdbot-cn channels login`（凭证存储在 `~/.clawdbot-cn/credentials`）。

- 通过 `channels.whatsapp.allowFrom` 配置允许与助手对话的人员白名单。
- 如果设置了 `channels.whatsapp.groups`，它会成为群组白名单；包含 `"*"` 表示允许所有。

### [Telegram](https://docs.clawd.bot/channels/telegram)

- 设置 `TELEGRAM_BOT_TOKEN` 或 `channels.telegram.botToken`（环境变量优先）。
- 可选：设置 `channels.telegram.groups`（使用 `channels.telegram.groups."*".requireMention`）；设置后它是群组白名单（包含 `"*"` 表示允许所有）。也可根据需要设置 `channels.telegram.allowFrom` 或 `channels.telegram.webhookUrl`。

```json5
{
  channels: {
    telegram: {
      botToken: "123456:ABCDEF"
    }
  }
}
```

### [Slack](https://docs.clawd.bot/channels/slack)

- 设置 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`（或 `channels.slack.botToken` + `channels.slack.appToken`）。

### [Discord](https://docs.clawd.bot/channels/discord)

- 设置 `DISCORD_BOT_TOKEN` 或 `channels.discord.token`（环境变量优先）。
- 可选：设置 `commands.native`、`commands.text` 或 `commands.useAccessGroups`，以及 `channels.discord.dm.allowFrom`、`channels.discord.guilds` 或 `channels.discord.mediaMaxMb`。

```json5
{
  channels: {
    discord: {
      token: "1234abcd"
    }
  }
}
```

### [Signal](https://docs.clawd.bot/channels/signal)

- 需要 `signal-cli` 和 `channels.signal` 配置部分。

### [iMessage](https://docs.clawd.bot/channels/imessage)

- 仅限 macOS；需要登录信息应用。
- 如果设置了 `channels.imessage.groups`，它会成为群组白名单；包含 `"*"` 表示允许所有。

### [Microsoft Teams](https://docs.clawd.bot/channels/msteams)

- 配置 Teams 应用 + Bot Framework，然后添加 `msteams` 配置部分。
- 通过 `msteams.allowFrom` 配置允许对话的人员白名单；群组访问通过 `msteams.groupAllowFrom` 或 `msteams.groupPolicy: "open"`。

### [WebChat](https://docs.clawd.bot/web/webchat)

- 使用 Gateway WebSocket；无需单独的 WebChat 端口/配置。

浏览器控制（可选）：

```json5
{
  browser: {
    enabled: true,
    controlUrl: "http://127.0.0.1:18791",
    color: "#FF4500"
  }
}
```

## 文档

当你完成安装引导流程并想查看更深入的参考时，使用这些文档。
- [从文档索引开始，了解导航和“什么在哪里”](https://docs.clawd.bot)
- [阅读架构概述，了解 Gateway + 协议模型](https://docs.clawd.bot/concepts/architecture)
- [需要所有键和示例时，使用完整配置参考](https://docs.clawd.bot/gateway/configuration)
- [按照运维手册运行 Gateway](https://docs.clawd.bot/gateway)
- [了解控制 UI/Web 界面如何工作以及如何安全地暴露它们](https://docs.clawd.bot/web)
- [了解通过 SSH 隧道或 tailnet 进行远程访问](https://docs.clawd.bot/gateway/remote)
- [按照安装向导流程进行引导式设置](https://docs.clawd.bot/start/wizard)
- [通过 Webhook 界面连接外部触发器](https://docs.clawd.bot/automation/webhook)
- [设置 Gmail Pub/Sub 触发器](https://docs.clawd.bot/automation/gmail-pubsub)
- [了解 macOS 菜单栏配套应用详情](https://docs.clawd.bot/platforms/mac/menu-bar)
- [平台指南：Windows (WSL2)](https://docs.clawd.bot/platforms/windows)、[Linux](https://docs.clawd.bot/platforms/linux)、[macOS](https://docs.clawd.bot/platforms/macos)、[iOS](https://docs.clawd.bot/platforms/ios)、[Android](https://docs.clawd.bot/platforms/android)
- [使用故障排除指南调试常见故障](https://docs.clawd.bot/channels/troubleshooting)
- [在暴露任何内容之前查看安全指南](https://docs.clawd.bot/gateway/security)

## 高级文档（发现 + 控制）

- [发现 + 传输](https://docs.clawd.bot/gateway/discovery)
- [Bonjour/mDNS](https://docs.clawd.bot/gateway/bonjour)
- [Gateway 配对](https://docs.clawd.bot/gateway/pairing)
- [远程 Gateway 自述文件](https://docs.clawd.bot/gateway/remote-gateway-readme)
- [控制 UI](https://docs.clawd.bot/web/control-ui)
- [仪表盘](https://docs.clawd.bot/web/dashboard)

## 运维与故障排除

- [健康检查](https://docs.clawd.bot/gateway/health)
- [Gateway 锁](https://docs.clawd.bot/gateway/gateway-lock)
- [后台进程](https://docs.clawd.bot/gateway/background-process)
- [浏览器故障排除 (Linux)](https://docs.clawd.bot/tools/browser-linux-troubleshooting)
- [日志](https://docs.clawd.bot/logging)

## 深入探讨

- [智能体循环](https://docs.clawd.bot/concepts/agent-loop)
- [在线状态](https://docs.clawd.bot/concepts/presence)
- [TypeBox 模式](https://docs.clawd.bot/concepts/typebox)
- [RPC 适配器](https://docs.clawd.bot/reference/rpc)
- [队列](https://docs.clawd.bot/concepts/queue)

## 工作区与技能

- [技能配置](https://docs.clawd.bot/tools/skills-config)
- [默认 AGENTS](https://docs.clawd.bot/reference/AGENTS.default)
- [模板：AGENTS](https://docs.clawd.bot/reference/templates/AGENTS)
- [模板：BOOTSTRAP](https://docs.clawd.bot/reference/templates/BOOTSTRAP)
- [模板：IDENTITY](https://docs.clawd.bot/reference/templates/IDENTITY)
- [模板：SOUL](https://docs.clawd.bot/reference/templates/SOUL)
- [模板：TOOLS](https://docs.clawd.bot/reference/templates/TOOLS)
- [模板：USER](https://docs.clawd.bot/reference/templates/USER)

## 平台内部细节

- [macOS 开发设置](https://docs.clawd.bot/platforms/mac/dev-setup)
- [macOS 菜单栏](https://docs.clawd.bot/platforms/mac/menu-bar)
- [macOS 语音唤醒](https://docs.clawd.bot/platforms/mac/voicewake)
- [iOS 节点](https://docs.clawd.bot/platforms/ios)
- [Android 节点](https://docs.clawd.bot/platforms/android)
- [Windows (WSL2)](https://docs.clawd.bot/platforms/windows)
- [Linux 应用](https://docs.clawd.bot/platforms/linux)

## 邮件钩子 (Gmail)

- [docs.clawd.bot/gmail-pubsub](https://docs.clawd.bot/automation/gmail-pubsub)

## Clawd

Clawdbot 是为 **Clawd** 而构建的，一只太空龙虾 AI 助手。🦞
由 Peter Steinberger 和社区共同开发。

- [clawd.me](https://clawd.me)
- [soul.md](https://soul.md)
- [steipete.me](https://steipete.me)

## 社区

参考 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南、维护者和如何提交 PR。
欢迎 AI/vibe-coded PR！🤖

特别感谢 [Mario Zechner](https://mariozechner.at/) 的支持以及 [pi-mono](https://github.com/badlogic/pi-mono) 项目。

感谢所有贡献者：

<p align="left">
  <a href="https://github.com/steipete"><img src="https://avatars.githubusercontent.com/u/58493?v=4&s=48" width="48" height="48" alt="steipete" title="steipete"/></a> <a href="https://github.com/plum-dawg"><img src="https://avatars.githubusercontent.com/u/5909950?v=4&s=48" width="48" height="48" alt="plum-dawg" title="plum-dawg"/></a> <a href="https://github.com/bohdanpodvirnyi"><img src="https://avatars.githubusercontent.com/u/31819391?v=4&s=48" width="48" height="48" alt="bohdanpodvirnyi" title="bohdanpodvirnyi"/></a> <a href="https://github.com/iHildy"><img src="https://avatars.githubusercontent.com/u/25069719?v=4&s=48" width="48" height="48" alt="iHildy" title="iHildy"/></a> <a href="https://github.com/joaohlisboa"><img src="https://avatars.githubusercontent.com/u/8200873?v=4&s=48" width="48" height="48" alt="joaohlisboa" title="joaohlisboa"/></a> <a href="https://github.com/mneves75"><img src="https://avatars.githubusercontent.com/u/2423436?v=4&s=48" width="48" height="48" alt="mneves75" title="mneves75"/></a> <a href="https://github.com/MatthieuBizien"><img src="https://avatars.githubusercontent.com/u/173090?v=4&s=48" width="48" height="48" alt="MatthieuBizien" title="MatthieuBizien"/></a> <a href="https://github.com/MaudeBot"><img src="https://avatars.githubusercontent.com/u/255777700?v=4&s=48" width="48" height="48" alt="MaudeBot" title="MaudeBot"/></a> <a href="https://github.com/Glucksberg"><img src="https://avatars.githubusercontent.com/u/80581902?v=4&s=48" width="48" height="48" alt="Glucksberg" title="Glucksberg"/></a> <a href="https://github.com/rahthakor"><img src="https://avatars.githubusercontent.com/u/8470553?v=4&s=48" width="48" height="48" alt="rahthakor" title="rahthakor"/></a>
  <a href="https://github.com/vrknetha"><img src="https://avatars.githubusercontent.com/u/20596261?v=4&s=48" width="48" height="48" alt="vrknetha" title="vrknetha"/></a> <a href="https://github.com/radek-paclt"><img src="https://avatars.githubusercontent.com/u/50451445?v=4&s=48" width="48" height="48" alt="radek-paclt" title="radek-paclt"/></a> <a href="https://github.com/tobiasbischoff"><img src="https://avatars.githubusercontent.com/u/711564?v=4&s=48" width="48" height="48" alt="Tobias Bischoff" title="Tobias Bischoff"/></a> <a href="https://github.com/joshp123"><img src="https://avatars.githubusercontent.com/u/1497361?v=4&s=48" width="48" height="48" alt="joshp123" title="joshp123"/></a> <a href="https://github.com/czekaj"><img src="https://avatars.githubusercontent.com/u/1464539?v=4&s=48" width="48" height="48" alt="czekaj" title="czekaj"/></a> <a href="https://github.com/mukhtharcm"><img src="https://avatars.githubusercontent.com/u/56378562?v=4&s=48" width="48" height="48" alt="mukhtharcm" title="mukhtharcm"/></a> <a href="https://github.com/sebslight"><img src="https://avatars.githubusercontent.com/u/19554889?v=4&s=48" width="48" height="48" alt="sebslight" title="sebslight"/></a> <a href="https://github.com/maxsumrall"><img src="https://avatars.githubusercontent.com/u/628843?v=4&s=48" width="48" height="48" alt="maxsumrall" title="maxsumrall"/></a> <a href="https://github.com/xadenryan"><img src="https://avatars.githubusercontent.com/u/165437834?v=4&s=48" width="48" height="48" alt="xadenryan" title="xadenryan"/></a> <a href="https://github.com/rodrigouroz"><img src="https://avatars.githubusercontent.com/u/384037?v=4&s=48" width="48" height="48" alt="rodrigouroz" title="rodrigouroz"/></a>
  <a href="https://github.com/juanpablodlc"><img src="https://avatars.githubusercontent.com/u/92012363?v=4&s=48" width="48" height="48" alt="juanpablodlc" title="juanpablodlc"/></a> <a href="https://github.com/hsrvc"><img src="https://avatars.githubusercontent.com/u/129702169?v=4&s=48" width="48" height="48" alt="hsrvc" title="hsrvc"/></a> <a href="https://github.com/magimetal"><img src="https://avatars.githubusercontent.com/u/36491250?v=4&s=48" width="48" height="48" alt="magimetal" title="magimetal"/></a> <a href="https://github.com/zerone0x"><img src="https://avatars.githubusercontent.com/u/39543393?v=4&s=48" width="48" height="48" alt="zerone0x" title="zerone0x"/></a> <a href="https://github.com/meaningfool"><img src="https://avatars.githubusercontent.com/u/2862331?v=4&s=48" width="48" height="48" alt="meaningfool" title="meaningfool"/></a> <a href="https://github.com/tyler6204"><img src="https://avatars.githubusercontent.com/u/64381258?v=4&s=48" width="48" height="48" alt="tyler6204" title="tyler6204"/></a> <a href="https://github.com/patelhiren"><img src="https://avatars.githubusercontent.com/u/172098?v=4&s=48" width="48" height="48" alt="patelhiren" title="patelhiren"/></a> <a href="https://github.com/NicholasSpisak"><img src="https://avatars.githubusercontent.com/u/129075147?v=4&s=48" width="48" height="48" alt="NicholasSpisak" title="NicholasSpisak"/></a> <a href="https://github.com/jonisjongithub"><img src="https://avatars.githubusercontent.com/u/86072337?v=4&s=48" width="48" height="48" alt="jonisjongithub" title="jonisjongithub"/></a> <a href="https://github.com/AbhisekBasu1"><img src="https://avatars.githubusercontent.com/u/40645221?v=4&s=48" width="48" height="48" alt="abhisekbasu1" title="abhisekbasu1"/></a>
  <a href="https://github.com/jamesgroat"><img src="https://avatars.githubusercontent.com/u/2634024?v=4&s=48" width="48" height="48" alt="jamesgroat" title="jamesgroat"/></a> <a href="https://github.com/claude"><img src="https://avatars.githubusercontent.com/u/81847?v=4&s=48" width="48" height="48" alt="claude" title="claude"/></a> <a href="https://github.com/JustYannicc"><img src="https://avatars.githubusercontent.com/u/52761674?v=4&s=48" width="48" height="48" alt="JustYannicc" title="JustYannicc"/></a> <a href="https://github.com/Hyaxia"><img src="https://avatars.githubusercontent.com/u/36747317?v=4&s=48" width="48" height="48" alt="Hyaxia" title="Hyaxia"/></a> <a href="https://github.com/dantelex"><img src="https://avatars.githubusercontent.com/u/631543?v=4&s=48" width="48" height="48" alt="dantelex" title="dantelex"/></a> <a href="https://github.com/SocialNerd42069"><img src="https://avatars.githubusercontent.com/u/118244303?v=4&s=48" width="48" height="48" alt="SocialNerd42069" title="SocialNerd42069"/></a> <a href="https://github.com/daveonkels"><img src="https://avatars.githubusercontent.com/u/533642?v=4&s=48" width="48" height="48" alt="daveonkels" title="daveonkels"/></a> <a href="https://github.com/apps/google-labs-jules"><img src="https://avatars.githubusercontent.com/in/842251?v=4&s=48" width="48" height="48" alt="google-labs-jules[bot]" title="google-labs-jules[bot]"/></a> <a href="https://github.com/lc0rp"><img src="https://avatars.githubusercontent.com/u/2609441?v=4&s=48" width="48" height="48" alt="lc0rp" title="lc0rp"/></a> <a href="https://github.com/mousberg"><img src="https://avatars.githubusercontent.com/u/57605064?v=4&s=48" width="48" height="48" alt="mousberg" title="mousberg"/></a>
  <a href="https://github.com/vignesh07"><img src="https://avatars.githubusercontent.com/u/1436853?v=4&s=48" width="48" height="48" alt="vignesh07" title="vignesh07"/></a> <a href="https://github.com/mteam88"><img src="https://avatars.githubusercontent.com/u/84196639?v=4&s=48" width="48" height="48" alt="mteam88" title="mteam88"/></a> <a href="https://github.com/joeynyc"><img src="https://avatars.githubusercontent.com/u/17919866?v=4&s=48" width="48" height="48" alt="joeynyc" title="joeynyc"/></a> <a href="https://github.com/orlyjamie"><img src="https://avatars.githubusercontent.com/u/6668807?v=4&s=48" width="48" height="48" alt="orlyjamie" title="orlyjamie"/></a> <a href="https://github.com/dbhurley"><img src="https://avatars.githubusercontent.com/u/5251425?v=4&s=48" width="48" height="48" alt="dbhurley" title="dbhurley"/></a> <a href="https://github.com/mbelinky"><img src="https://avatars.githubusercontent.com/u/132747814?v=4&s=48" width="48" height="48" alt="Mariano Belinky" title="Mariano Belinky"/></a> <a href="https://github.com/omniwired"><img src="https://avatars.githubusercontent.com/u/322761?v=4&s=48" width="48" height="48" alt="Eng. Juan Combetto" title="Eng. Juan Combetto"/></a> <a href="https://github.com/TSavo"><img src="https://avatars.githubusercontent.com/u/877990?v=4&s=48" width="48" height="48" alt="TSavo" title="TSavo"/></a> <a href="https://github.com/julianengel"><img src="https://avatars.githubusercontent.com/u/10634231?v=4&s=48" width="48" height="48" alt="julianengel" title="julianengel"/></a> <a href="https://github.com/bradleypriest"><img src="https://avatars.githubusercontent.com/u/167215?v=4&s=48" width="48" height="48" alt="bradleypriest" title="bradleypriest"/></a>
  <a href="https://github.com/benithors"><img src="https://avatars.githubusercontent.com/u/20652882?v=4&s=48" width="48" height="48" alt="benithors" title="benithors"/></a> <a href="https://github.com/rohannagpal"><img src="https://avatars.githubusercontent.com/u/4009239?v=4&s=48" width="48" height="48" alt="rohannagpal" title="rohannagpal"/></a> <a href="https://github.com/timolins"><img src="https://avatars.githubusercontent.com/u/1440854?v=4&s=48" width="48" height="48" alt="timolins" title="timolins"/></a> <a href="https://github.com/f-trycua"><img src="https://avatars.githubusercontent.com/u/195596869?v=4&s=48" width="48" height="48" alt="f-trycua" title="f-trycua"/></a> <a href="https://github.com/benostein"><img src="https://avatars.githubusercontent.com/u/31802821?v=4&s=48" width="48" height="48" alt="benostein" title="benostein"/></a> <a href="https://github.com/Nachx639"><img src="https://avatars.githubusercontent.com/u/71144023?v=4&s=48" width="48" height="48" alt="nachx639" title="nachx639"/></a> <a href="https://github.com/pvoo"><img src="https://avatars.githubusercontent.com/u/20116814?v=4&s=48" width="48" height="48" alt="pvoo" title="pvoo"/></a> <a href="https://github.com/sreekaransrinath"><img src="https://avatars.githubusercontent.com/u/50989977?v=4&s=48" width="48" height="48" alt="sreekaransrinath" title="sreekaransrinath"/></a> <a href="https://github.com/gupsammy"><img src="https://avatars.githubusercontent.com/u/20296019?v=4&s=48" width="48" height="48" alt="gupsammy" title="gupsammy"/></a> <a href="https://github.com/cristip73"><img src="https://avatars.githubusercontent.com/u/24499421?v=4&s=48" width="48" height="48" alt="cristip73" title="cristip73"/></a>
  <a href="https://github.com/stefangalescu"><img src="https://avatars.githubusercontent.com/u/52995748?v=4&s=48" width="48" height="48" alt="stefangalescu" title="stefangalescu"/></a> <a href="https://github.com/nachoiacovino"><img src="https://avatars.githubusercontent.com/u/50103937?v=4&s=48" width="48" height="48" alt="nachoiacovino" title="nachoiacovino"/></a> <a href="https://github.com/vsabavat"><img src="https://avatars.githubusercontent.com/u/50385532?v=4&s=48" width="48" height="48" alt="Vasanth Rao Naik Sabavat" title="Vasanth Rao Naik Sabavat"/></a> <a href="https://github.com/petter-b"><img src="https://avatars.githubusercontent.com/u/62076402?v=4&s=48" width="48" height="48" alt="petter-b" title="petter-b"/></a> <a href="https://github.com/cpojer"><img src="https://avatars.githubusercontent.com/u/13352?v=4&s=48" width="48" height="48" alt="cpojer" title="cpojer"/></a> <a href="https://github.com/scald"><img src="https://avatars.githubusercontent.com/u/1215913?v=4&s=48" width="48" height="48" alt="scald" title="scald"/></a> <a href="https://github.com/gumadeiras"><img src="https://avatars.githubusercontent.com/u/5599352?v=4&s=48" width="48" height="48" alt="gumadeiras" title="gumadeiras"/></a> <a href="https://github.com/andranik-sahakyan"><img src="https://avatars.githubusercontent.com/u/8908029?v=4&s=48" width="48" height="48" alt="andranik-sahakyan" title="andranik-sahakyan"/></a> <a href="https://github.com/davidguttman"><img src="https://avatars.githubusercontent.com/u/431696?v=4&s=48" width="48" height="48" alt="davidguttman" title="davidguttman"/></a> <a href="https://github.com/sleontenko"><img src="https://avatars.githubusercontent.com/u/7135949?v=4&s=48" width="48" height="48" alt="sleontenko" title="sleontenko"/></a>
  <a href="https://github.com/denysvitali"><img src="https://avatars.githubusercontent.com/u/4939519?v=4&s=48" width="48" height="48" alt="denysvitali" title="denysvitali"/></a> <a href="https://github.com/thewilloftheshadow"><img src="https://avatars.githubusercontent.com/u/35580099?v=4&s=48" width="48" height="48" alt="thewilloftheshadow" title="thewilloftheshadow"/></a> <a href="https://github.com/shakkernerd"><img src="https://avatars.githubusercontent.com/u/165377636?v=4&s=48" width="48" height="48" alt="shakkernerd" title="shakkernerd"/></a> <a href="https://github.com/sircrumpet"><img src="https://avatars.githubusercontent.com/u/4436535?v=4&s=48" width="48" height="48" alt="sircrumpet" title="sircrumpet"/></a> <a href="https://github.com/peschee"><img src="https://avatars.githubusercontent.com/u/63866?v=4&s=48" width="48" height="48" alt="peschee" title="peschee"/></a> <a href="https://github.com/rafaelreis-r"><img src="https://avatars.githubusercontent.com/u/57492577?v=4&s=48" width="48" height="48" alt="rafaelreis-r" title="rafaelreis-r"/></a> <a href="https://github.com/ratulsarna"><img src="https://avatars.githubusercontent.com/u/105903728?v=4&s=48" width="48" height="48" alt="ratulsarna" title="ratulsarna"/></a> <a href="https://github.com/lutr0"><img src="https://avatars.githubusercontent.com/u/76906369?v=4&s=48" width="48" height="48" alt="lutr0" title="lutr0"/></a> <a href="https://github.com/danielz1z"><img src="https://avatars.githubusercontent.com/u/235270390?v=4&s=48" width="48" height="48" alt="danielz1z" title="danielz1z"/></a> <a href="https://github.com/emanuelst"><img src="https://avatars.githubusercontent.com/u/9994339?v=4&s=48" width="48" height="48" alt="emanuelst" title="emanuelst"/></a>
  <a href="https://github.com/KristijanJovanovski"><img src="https://avatars.githubusercontent.com/u/8942284?v=4&s=48" width="48" height="48" alt="KristijanJovanovski" title="KristijanJovanovski"/></a> <a href="https://github.com/rdev"><img src="https://avatars.githubusercontent.com/u/8418866?v=4&s=48" width="48" height="48" alt="rdev" title="rdev"/></a> <a href="https://github.com/rhuanssauro"><img src="https://avatars.githubusercontent.com/u/164682191?v=4&s=48" width="48" height="48" alt="rhuanssauro" title="rhuanssauro"/></a> <a href="https://github.com/joshrad-dev"><img src="https://avatars.githubusercontent.com/u/62785552?v=4&s=48" width="48" height="48" alt="joshrad-dev" title="joshrad-dev"/></a> <a href="https://github.com/kiranjd"><img src="https://avatars.githubusercontent.com/u/25822851?v=4&s=48" width="48" height="48" alt="kiranjd" title="kiranjd"/></a> <a href="https://github.com/osolmaz"><img src="https://avatars.githubusercontent.com/u/2453968?v=4&s=48" width="48" height="48" alt="osolmaz" title="osolmaz"/></a> <a href="https://github.com/adityashaw2"><img src="https://avatars.githubusercontent.com/u/41204444?v=4&s=48" width="48" height="48" alt="adityashaw2" title="adityashaw2"/></a> <a href="https://github.com/CashWilliams"><img src="https://avatars.githubusercontent.com/u/613573?v=4&s=48" width="48" height="48" alt="CashWilliams" title="CashWilliams"/></a> <a href="https://github.com/search?q=sheeek"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="sheeek" title="sheeek"/></a> <a href="https://github.com/artuskg"><img src="https://avatars.githubusercontent.com/u/11966157?v=4&s=48" width="48" height="48" alt="artuskg" title="artuskg"/></a>
  <a href="https://github.com/Takhoffman"><img src="https://avatars.githubusercontent.com/u/781889?v=4&s=48" width="48" height="48" alt="Takhoffman" title="Takhoffman"/></a> <a href="https://github.com/onutc"><img src="https://avatars.githubusercontent.com/u/152018508?v=4&s=48" width="48" height="48" alt="onutc" title="onutc"/></a> <a href="https://github.com/pauloportella"><img src="https://avatars.githubusercontent.com/u/22947229?v=4&s=48" width="48" height="48" alt="pauloportella" title="pauloportella"/></a> <a href="https://github.com/neooriginal"><img src="https://avatars.githubusercontent.com/u/54811660?v=4&s=48" width="48" height="48" alt="neooriginal" title="neooriginal"/></a> <a href="https://github.com/ManuelHettich"><img src="https://avatars.githubusercontent.com/u/17690367?v=4&s=48" width="48" height="48" alt="manuelhettich" title="manuelhettich"/></a> <a href="https://github.com/minghinmatthewlam"><img src="https://avatars.githubusercontent.com/u/14224566?v=4&s=48" width="48" height="48" alt="minghinmatthewlam" title="minghinmatthewlam"/></a> <a href="https://github.com/myfunc"><img src="https://avatars.githubusercontent.com/u/19294627?v=4&s=48" width="48" height="48" alt="myfunc" title="myfunc"/></a> <a href="https://github.com/travisirby"><img src="https://avatars.githubusercontent.com/u/5958376?v=4&s=48" width="48" height="48" alt="travisirby" title="travisirby"/></a> <a href="https://github.com/buddyh"><img src="https://avatars.githubusercontent.com/u/31752869?v=4&s=48" width="48" height="48" alt="buddyh" title="buddyh"/></a> <a href="https://github.com/connorshea"><img src="https://avatars.githubusercontent.com/u/2977353?v=4&s=48" width="48" height="48" alt="connorshea" title="connorshea"/></a>
  <a href="https://github.com/kyleok"><img src="https://avatars.githubusercontent.com/u/58307870?v=4&s=48" width="48" height="48" alt="kyleok" title="kyleok"/></a> <a href="https://github.com/mcinteerj"><img src="https://avatars.githubusercontent.com/u/3613653?v=4&s=48" width="48" height="48" alt="mcinteerj" title="mcinteerj"/></a> <a href="https://github.com/apps/dependabot"><img src="https://avatars.githubusercontent.com/in/29110?v=4&s=48" width="48" height="48" alt="dependabot[bot]" title="dependabot[bot]"/></a> <a href="https://github.com/John-Rood"><img src="https://avatars.githubusercontent.com/u/62669593?v=4&s=48" width="48" height="48" alt="John-Rood" title="John-Rood"/></a> <a href="https://github.com/timkrase"><img src="https://avatars.githubusercontent.com/u/38947626?v=4&s=48" width="48" height="48" alt="timkrase" title="timkrase"/></a> <a href="https://github.com/uos-status"><img src="https://avatars.githubusercontent.com/u/255712580?v=4&s=48" width="48" height="48" alt="uos-status" title="uos-status"/></a> <a href="https://github.com/gerardward2007"><img src="https://avatars.githubusercontent.com/u/3002155?v=4&s=48" width="48" height="48" alt="gerardward2007" title="gerardward2007"/></a> <a href="https://github.com/obviyus"><img src="https://avatars.githubusercontent.com/u/22031114?v=4&s=48" width="48" height="48" alt="obviyus" title="obviyus"/></a> <a href="https://github.com/roshanasingh4"><img src="https://avatars.githubusercontent.com/u/88576930?v=4&s=48" width="48" height="48" alt="roshanasingh4" title="roshanasingh4"/></a> <a href="https://github.com/tosh-hamburg"><img src="https://avatars.githubusercontent.com/u/58424326?v=4&s=48" width="48" height="48" alt="tosh-hamburg" title="tosh-hamburg"/></a>
  <a href="https://github.com/azade-c"><img src="https://avatars.githubusercontent.com/u/252790079?v=4&s=48" width="48" height="48" alt="azade-c" title="azade-c"/></a> <a href="https://github.com/JonUleis"><img src="https://avatars.githubusercontent.com/u/7644941?v=4&s=48" width="48" height="48" alt="JonUleis" title="JonUleis"/></a> <a href="https://github.com/bjesuiter"><img src="https://avatars.githubusercontent.com/u/2365676?v=4&s=48" width="48" height="48" alt="bjesuiter" title="bjesuiter"/></a> <a href="https://github.com/cheeeee"><img src="https://avatars.githubusercontent.com/u/21245729?v=4&s=48" width="48" height="48" alt="cheeeee" title="cheeeee"/></a> <a href="https://github.com/j1philli"><img src="https://avatars.githubusercontent.com/u/3744255?v=4&s=48" width="48" height="48" alt="Josh Phillips" title="Josh Phillips"/></a> <a href="https://github.com/YuriNachos"><img src="https://avatars.githubusercontent.com/u/19365375?v=4&s=48" width="48" height="48" alt="YuriNachos" title="YuriNachos"/></a> <a href="https://github.com/robbyczgw-cla"><img src="https://avatars.githubusercontent.com/u/239660374?v=4&s=48" width="48" height="48" alt="robbyczgw-cla" title="robbyczgw-cla"/></a> <a href="https://github.com/dlauer"><img src="https://avatars.githubusercontent.com/u/757041?v=4&s=48" width="48" height="48" alt="dlauer" title="dlauer"/></a> <a href="https://github.com/pookNast"><img src="https://avatars.githubusercontent.com/u/14242552?v=4&s=48" width="48" height="48" alt="pookNast" title="pookNast"/></a> <a href="https://github.com/Whoaa512"><img src="https://avatars.githubusercontent.com/u/1581943?v=4&s=48" width="48" height="48" alt="Whoaa512" title="Whoaa512"/></a>
  <a href="https://github.com/chriseidhof"><img src="https://avatars.githubusercontent.com/u/5382?v=4&s=48" width="48" height="48" alt="chriseidhof" title="chriseidhof"/></a> <a href="https://github.com/ngutman"><img src="https://avatars.githubusercontent.com/u/1540134?v=4&s=48" width="48" height="48" alt="ngutman" title="ngutman"/></a> <a href="https://github.com/ysqander"><img src="https://avatars.githubusercontent.com/u/80843820?v=4&s=48" width="48" height="48" alt="ysqander" title="ysqander"/></a> <a href="https://github.com/aj47"><img src="https://avatars.githubusercontent.com/u/8023513?v=4&s=48" width="48" height="48" alt="aj47" title="aj47"/></a> <a href="https://github.com/superman32432432"><img src="https://avatars.githubusercontent.com/u/7228420?v=4&s=48" width="48" height="48" alt="superman32432432" title="superman32432432"/></a> <a href="https://github.com/search?q=Yurii%20Chukhlib"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Yurii Chukhlib" title="Yurii Chukhlib"/></a> <a href="https://github.com/grp06"><img src="https://avatars.githubusercontent.com/u/1573959?v=4&s=48" width="48" height="48" alt="grp06" title="grp06"/></a> <a href="https://github.com/antons"><img src="https://avatars.githubusercontent.com/u/129705?v=4&s=48" width="48" height="48" alt="antons" title="antons"/></a> <a href="https://github.com/austinm911"><img src="https://avatars.githubusercontent.com/u/31991302?v=4&s=48" width="48" height="48" alt="austinm911" title="austinm911"/></a> <a href="https://github.com/apps/blacksmith-sh"><img src="https://avatars.githubusercontent.com/in/807020?v=4&s=48" width="48" height="48" alt="blacksmith-sh[bot]" title="blacksmith-sh[bot]"/></a>
  <a href="https://github.com/damoahdominic"><img src="https://avatars.githubusercontent.com/u/4623434?v=4&s=48" width="48" height="48" alt="damoahdominic" title="damoahdominic"/></a> <a href="https://github.com/dan-dr"><img src="https://avatars.githubusercontent.com/u/6669808?v=4&s=48" width="48" height="48" alt="dan-dr" title="dan-dr"/></a> <a href="https://github.com/HeimdallStrategy"><img src="https://avatars.githubusercontent.com/u/223014405?v=4&s=48" width="48" height="48" alt="HeimdallStrategy" title="HeimdallStrategy"/></a> <a href="https://github.com/imfing"><img src="https://avatars.githubusercontent.com/u/5097752?v=4&s=48" width="48" height="48" alt="imfing" title="imfing"/></a> <a href="https://github.com/jalehman"><img src="https://avatars.githubusercontent.com/u/550978?v=4&s=48" width="48" height="48" alt="jalehman" title="jalehman"/></a> <a href="https://github.com/jarvis-medmatic"><img src="https://avatars.githubusercontent.com/u/252428873?v=4&s=48" width="48" height="48" alt="jarvis-medmatic" title="jarvis-medmatic"/></a> <a href="https://github.com/kkarimi"><img src="https://avatars.githubusercontent.com/u/875218?v=4&s=48" width="48" height="48" alt="kkarimi" title="kkarimi"/></a> <a href="https://github.com/mahmoudashraf93"><img src="https://avatars.githubusercontent.com/u/9130129?v=4&s=48" width="48" height="48" alt="mahmoudashraf93" title="mahmoudashraf93"/></a> <a href="https://github.com/pkrmf"><img src="https://avatars.githubusercontent.com/u/1714267?v=4&s=48" width="48" height="48" alt="pkrmf" title="pkrmf"/></a> <a href="https://github.com/RandyVentures"><img src="https://avatars.githubusercontent.com/u/149904821?v=4&s=48" width="48" height="48" alt="RandyVentures" title="RandyVentures"/></a>
  <a href="https://github.com/search?q=Ryan%20Lisse"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Ryan Lisse" title="Ryan Lisse"/></a> <a href="https://github.com/dougvk"><img src="https://avatars.githubusercontent.com/u/401660?v=4&s=48" width="48" height="48" alt="dougvk" title="dougvk"/></a> <a href="https://github.com/erikpr1994"><img src="https://avatars.githubusercontent.com/u/6299331?v=4&s=48" width="48" height="48" alt="erikpr1994" title="erikpr1994"/></a> <a href="https://github.com/search?q=Ghost"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Ghost" title="Ghost"/></a> <a href="https://github.com/jonasjancarik"><img src="https://avatars.githubusercontent.com/u/2459191?v=4&s=48" width="48" height="48" alt="jonasjancarik" title="jonasjancarik"/></a> <a href="https://github.com/search?q=Keith%20the%20Silly%20Goose"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Keith the Silly Goose" title="Keith the Silly Goose"/></a> <a href="https://github.com/search?q=L36%20Server"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="L36 Server" title="L36 Server"/></a> <a href="https://github.com/search?q=Marc"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Marc" title="Marc"/></a> <a href="https://github.com/mitschabaude-bot"><img src="https://avatars.githubusercontent.com/u/247582884?v=4&s=48" width="48" height="48" alt="mitschabaude-bot" title="mitschabaude-bot"/></a> <a href="https://github.com/mkbehr"><img src="https://avatars.githubusercontent.com/u/1285?v=4&s=48" width="48" height="48" alt="mkbehr" title="mkbehr"/></a>
  <a href="https://github.com/neist"><img src="https://avatars.githubusercontent.com/u/1029724?v=4&s=48" width="48" height="48" alt="neist" title="neist"/></a> <a href="https://github.com/sibbl"><img src="https://avatars.githubusercontent.com/u/866535?v=4&s=48" width="48" height="48" alt="sibbl" title="sibbl"/></a> <a href="https://github.com/chrisrodz"><img src="https://avatars.githubusercontent.com/u/2967620?v=4&s=48" width="48" height="48" alt="chrisrodz" title="chrisrodz"/></a> <a href="https://github.com/search?q=Friederike%20Seiler"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Friederike Seiler" title="Friederike Seiler"/></a> <a href="https://github.com/gabriel-trigo"><img src="https://avatars.githubusercontent.com/u/38991125?v=4&s=48" width="48" height="48" alt="gabriel-trigo" title="gabriel-trigo"/></a> <a href="https://github.com/Iamadig"><img src="https://avatars.githubusercontent.com/u/102129234?v=4&s=48" width="48" height="48" alt="iamadig" title="iamadig"/></a> <a href="https://github.com/jdrhyne"><img src="https://avatars.githubusercontent.com/u/7828464?v=4&s=48" width="48" height="48" alt="Jonathan D. Rhyne (DJ-D)" title="Jonathan D. Rhyne (DJ-D)"/></a> <a href="https://github.com/search?q=Kit"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Kit" title="Kit"/></a> <a href="https://github.com/koala73"><img src="https://avatars.githubusercontent.com/u/996596?v=4&s=48" width="48" height="48" alt="koala73" title="koala73"/></a> <a href="https://github.com/manmal"><img src="https://avatars.githubusercontent.com/u/142797?v=4&s=48" width="48" height="48" alt="manmal" title="manmal"/></a>
  <a href="https://github.com/ogulcancelik"><img src="https://avatars.githubusercontent.com/u/7064011?v=4&s=48" width="48" height="48" alt="ogulcancelik" title="ogulcancelik"/></a> <a href="https://github.com/pasogott"><img src="https://avatars.githubusercontent.com/u/23458152?v=4&s=48" width="48" height="48" alt="pasogott" title="pasogott"/></a> <a href="https://github.com/petradonka"><img src="https://avatars.githubusercontent.com/u/7353770?v=4&s=48" width="48" height="48" alt="petradonka" title="petradonka"/></a> <a href="https://github.com/rubyrunsstuff"><img src="https://avatars.githubusercontent.com/u/246602379?v=4&s=48" width="48" height="48" alt="rubyrunsstuff" title="rubyrunsstuff"/></a> <a href="https://github.com/siddhantjain"><img src="https://avatars.githubusercontent.com/u/4835232?v=4&s=48" width="48" height="48" alt="siddhantjain" title="siddhantjain"/></a> <a href="https://github.com/suminhthanh"><img src="https://avatars.githubusercontent.com/u/2907636?v=4&s=48" width="48" height="48" alt="suminhthanh" title="suminhthanh"/></a> <a href="https://github.com/svkozak"><img src="https://avatars.githubusercontent.com/u/31941359?v=4&s=48" width="48" height="48" alt="svkozak" title="svkozak"/></a> <a href="https://github.com/VACInc"><img src="https://avatars.githubusercontent.com/u/3279061?v=4&s=48" width="48" height="48" alt="VACInc" title="VACInc"/></a> <a href="https://github.com/wes-davis"><img src="https://avatars.githubusercontent.com/u/16506720?v=4&s=48" width="48" height="48" alt="wes-davis" title="wes-davis"/></a> <a href="https://github.com/zats"><img src="https://avatars.githubusercontent.com/u/2688806?v=4&s=48" width="48" height="48" alt="zats" title="zats"/></a>
  <a href="https://github.com/24601"><img src="https://avatars.githubusercontent.com/u/1157207?v=4&s=48" width="48" height="48" alt="24601" title="24601"/></a> <a href="https://github.com/adam91holt"><img src="https://avatars.githubusercontent.com/u/9592417?v=4&s=48" width="48" height="48" alt="adam91holt" title="adam91holt"/></a> <a href="https://github.com/ameno-"><img src="https://avatars.githubusercontent.com/u/2416135?v=4&s=48" width="48" height="48" alt="ameno-" title="ameno-"/></a> <a href="https://github.com/search?q=Chris%20Taylor"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Chris Taylor" title="Chris Taylor"/></a> <a href="https://github.com/djangonavarro220"><img src="https://avatars.githubusercontent.com/u/251162586?v=4&s=48" width="48" height="48" alt="Django Navarro" title="Django Navarro"/></a> <a href="https://github.com/evalexpr"><img src="https://avatars.githubusercontent.com/u/23485511?v=4&s=48" width="48" height="48" alt="evalexpr" title="evalexpr"/></a> <a href="https://github.com/henrino3"><img src="https://avatars.githubusercontent.com/u/4260288?v=4&s=48" width="48" height="48" alt="henrino3" title="henrino3"/></a> <a href="https://github.com/humanwritten"><img src="https://avatars.githubusercontent.com/u/206531610?v=4&s=48" width="48" height="48" alt="humanwritten" title="humanwritten"/></a> <a href="https://github.com/larlyssa"><img src="https://avatars.githubusercontent.com/u/13128869?v=4&s=48" width="48" height="48" alt="larlyssa" title="larlyssa"/></a> <a href="https://github.com/odysseus0"><img src="https://avatars.githubusercontent.com/u/8635094?v=4&s=48" width="48" height="48" alt="odysseus0" title="odysseus0"/></a>
  <a href="https://github.com/oswalpalash"><img src="https://avatars.githubusercontent.com/u/6431196?v=4&s=48" width="48" height="48" alt="oswalpalash" title="oswalpalash"/></a> <a href="https://github.com/pcty-nextgen-service-account"><img src="https://avatars.githubusercontent.com/u/112553441?v=4&s=48" width="48" height="48" alt="pcty-nextgen-service-account" title="pcty-nextgen-service-account"/></a> <a href="https://github.com/rmorse"><img src="https://avatars.githubusercontent.com/u/853547?v=4&s=48" width="48" height="48" alt="rmorse" title="rmorse"/></a> <a href="https://github.com/Syhids"><img src="https://avatars.githubusercontent.com/u/671202?v=4&s=48" width="48" height="48" alt="Syhids" title="Syhids"/></a> <a href="https://github.com/search?q=Aaron%20Konyer"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Aaron Konyer" title="Aaron Konyer"/></a> <a href="https://github.com/aaronveklabs"><img src="https://avatars.githubusercontent.com/u/225997828?v=4&s=48" width="48" height="48" alt="aaronveklabs" title="aaronveklabs"/></a> <a href="https://github.com/andreabadesso"><img src="https://avatars.githubusercontent.com/u/3586068?v=4&s=48" width="48" height="48" alt="andreabadesso" title="andreabadesso"/></a> <a href="https://github.com/search?q=Andrii"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Andrii" title="Andrii"/></a> <a href="https://github.com/cash-echo-bot"><img src="https://avatars.githubusercontent.com/u/252747386?v=4&s=48" width="48" height="48" alt="cash-echo-bot" title="cash-echo-bot"/></a> <a href="https://github.com/search?q=Clawd"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Clawd" title="Clawd"/></a>
  <a href="https://github.com/search?q=ClawdFx"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="ClawdFx" title="ClawdFx"/></a> <a href="https://github.com/dguido"><img src="https://avatars.githubusercontent.com/u/294844?v=4&s=48" width="48" height="48" alt="dguido" title="dguido"/></a> <a href="https://github.com/EnzeD"><img src="https://avatars.githubusercontent.com/u/9866900?v=4&s=48" width="48" height="48" alt="EnzeD" title="EnzeD"/></a> <a href="https://github.com/erik-agens"><img src="https://avatars.githubusercontent.com/u/80908960?v=4&s=48" width="48" height="48" alt="erik-agens" title="erik-agens"/></a> <a href="https://github.com/Evizero"><img src="https://avatars.githubusercontent.com/u/10854026?v=4&s=48" width="48" height="48" alt="Evizero" title="Evizero"/></a> <a href="https://github.com/fcatuhe"><img src="https://avatars.githubusercontent.com/u/17382215?v=4&s=48" width="48" height="48" alt="fcatuhe" title="fcatuhe"/></a> <a href="https://github.com/itsjaydesu"><img src="https://avatars.githubusercontent.com/u/220390?v=4&s=48" width="48" height="48" alt="itsjaydesu" title="itsjaydesu"/></a> <a href="https://github.com/ivancasco"><img src="https://avatars.githubusercontent.com/u/2452858?v=4&s=48" width="48" height="48" alt="ivancasco" title="ivancasco"/></a> <a href="https://github.com/ivanrvpereira"><img src="https://avatars.githubusercontent.com/u/183991?v=4&s=48" width="48" height="48" alt="ivanrvpereira" title="ivanrvpereira"/></a> <a href="https://github.com/jayhickey"><img src="https://avatars.githubusercontent.com/u/1676460?v=4&s=48" width="48" height="48" alt="jayhickey" title="jayhickey"/></a>
  <a href="https://github.com/jeffersonwarrior"><img src="https://avatars.githubusercontent.com/u/89030989?v=4&s=48" width="48" height="48" alt="jeffersonwarrior" title="jeffersonwarrior"/></a> <a href="https://github.com/search?q=jeffersonwarrior"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="jeffersonwarrior" title="jeffersonwarrior"/></a> <a href="https://github.com/jverdi"><img src="https://avatars.githubusercontent.com/u/345050?v=4&s=48" width="48" height="48" alt="jverdi" title="jverdi"/></a> <a href="https://github.com/longmaba"><img src="https://avatars.githubusercontent.com/u/9361500?v=4&s=48" width="48" height="48" alt="longmaba" title="longmaba"/></a> <a href="https://github.com/mickahouan"><img src="https://avatars.githubusercontent.com/u/31423109?v=4&s=48" width="48" height="48" alt="mickahouan" title="mickahouan"/></a> <a href="https://github.com/mjrussell"><img src="https://avatars.githubusercontent.com/u/1641895?v=4&s=48" width="48" height="48" alt="mjrussell" title="mjrussell"/></a> <a href="https://github.com/odnxe"><img src="https://avatars.githubusercontent.com/u/403141?v=4&s=48" width="48" height="48" alt="odnxe" title="odnxe"/></a> <a href="https://github.com/p6l-richard"><img src="https://avatars.githubusercontent.com/u/18185649?v=4&s=48" width="48" height="48" alt="p6l-richard" title="p6l-richard"/></a> <a href="https://github.com/philipp-spiess"><img src="https://avatars.githubusercontent.com/u/458591?v=4&s=48" width="48" height="48" alt="philipp-spiess" title="philipp-spiess"/></a> <a href="https://github.com/robaxelsen"><img src="https://avatars.githubusercontent.com/u/13132899?v=4&s=48" width="48" height="48" alt="robaxelsen" title="robaxelsen"/></a>
  <a href="https://github.com/search?q=Sash%20Catanzarite"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Sash Catanzarite" title="Sash Catanzarite"/></a> <a href="https://github.com/T5-AndyML"><img src="https://avatars.githubusercontent.com/u/22801233?v=4&s=48" width="48" height="48" alt="T5-AndyML" title="T5-AndyML"/></a> <a href="https://github.com/travisp"><img src="https://avatars.githubusercontent.com/u/165698?v=4&s=48" width="48" height="48" alt="travisp" title="travisp"/></a> <a href="https://github.com/search?q=VAC"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="VAC" title="VAC"/></a> <a href="https://github.com/search?q=william%20arzt"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="william arzt" title="william arzt"/></a> <a href="https://github.com/zknicker"><img src="https://avatars.githubusercontent.com/u/1164085?v=4&s=48" width="48" height="48" alt="zknicker" title="zknicker"/></a> <a href="https://github.com/abhaymundhara"><img src="https://avatars.githubusercontent.com/u/62872231?v=4&s=48" width="48" height="48" alt="abhaymundhara" title="abhaymundhara"/></a> <a href="https://github.com/search?q=alejandro%20maza"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="alejandro maza" title="alejandro maza"/></a> <a href="https://github.com/Alex-Alaniz"><img src="https://avatars.githubusercontent.com/u/88956822?v=4&s=48" width="48" height="48" alt="Alex-Alaniz" title="Alex-Alaniz"/></a> <a href="https://github.com/andrewting19"><img src="https://avatars.githubusercontent.com/u/10536704?v=4&s=48" width="48" height="48" alt="andrewting19" title="andrewting19"/></a>
  <a href="https://github.com/anpoirier"><img src="https://avatars.githubusercontent.com/u/1245729?v=4&s=48" width="48" height="48" alt="anpoirier" title="anpoirier"/></a> <a href="https://github.com/arthyn"><img src="https://avatars.githubusercontent.com/u/5466421?v=4&s=48" width="48" height="48" alt="arthyn" title="arthyn"/></a> <a href="https://github.com/Asleep123"><img src="https://avatars.githubusercontent.com/u/122379135?v=4&s=48" width="48" height="48" alt="Asleep123" title="Asleep123"/></a> <a href="https://github.com/bolismauro"><img src="https://avatars.githubusercontent.com/u/771999?v=4&s=48" width="48" height="48" alt="bolismauro" title="bolismauro"/></a> <a href="https://github.com/conhecendoia"><img src="https://avatars.githubusercontent.com/u/82890727?v=4&s=48" width="48" height="48" alt="conhecendoia" title="conhecendoia"/></a> <a href="https://github.com/dasilva333"><img src="https://avatars.githubusercontent.com/u/947827?v=4&s=48" width="48" height="48" alt="dasilva333" title="dasilva333"/></a> <a href="https://github.com/search?q=Developer"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Developer" title="Developer"/></a> <a href="https://github.com/search?q=Dimitrios%20Ploutarchos"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Dimitrios Ploutarchos" title="Dimitrios Ploutarchos"/></a> <a href="https://github.com/search?q=Drake%20Thomsen"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Drake Thomsen" title="Drake Thomsen"/></a> <a href="https://github.com/fal3"><img src="https://avatars.githubusercontent.com/u/6484295?v=4&s=48" width="48" height="48" alt="fal3" title="fal3"/></a>
  <a href="https://github.com/search?q=Felix%20Krause"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Felix Krause" title="Felix Krause"/></a> <a href="https://github.com/foeken"><img src="https://avatars.githubusercontent.com/u/13864?v=4&s=48" width="48" height="48" alt="foeken" title="foeken"/></a> <a href="https://github.com/search?q=ganghyun%20kim"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="ganghyun kim" title="ganghyun kim"/></a> <a href="https://github.com/grrowl"><img src="https://avatars.githubusercontent.com/u/907140?v=4&s=48" width="48" height="48" alt="grrowl" title="grrowl"/></a> <a href="https://github.com/gtsifrikas"><img src="https://avatars.githubusercontent.com/u/8904378?v=4&s=48" width="48" height="48" alt="gtsifrikas" title="gtsifrikas"/></a> <a href="https://github.com/HazAT"><img src="https://avatars.githubusercontent.com/u/363802?v=4&s=48" width="48" height="48" alt="HazAT" title="HazAT"/></a> <a href="https://github.com/hrdwdmrbl"><img src="https://avatars.githubusercontent.com/u/554881?v=4&s=48" width="48" height="48" alt="hrdwdmrbl" title="hrdwdmrbl"/></a> <a href="https://github.com/hugobarauna"><img src="https://avatars.githubusercontent.com/u/2719?v=4&s=48" width="48" height="48" alt="hugobarauna" title="hugobarauna"/></a> <a href="https://github.com/search?q=Jamie%20Openshaw"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Jamie Openshaw" title="Jamie Openshaw"/></a> <a href="https://github.com/search?q=Jarvis"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Jarvis" title="Jarvis"/></a>
  <a href="https://github.com/search?q=Jefferson%20Nunn"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Jefferson Nunn" title="Jefferson Nunn"/></a> <a href="https://github.com/search?q=Kevin%20Lin"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Kevin Lin" title="Kevin Lin"/></a> <a href="https://github.com/kitze"><img src="https://avatars.githubusercontent.com/u/1160594?v=4&s=48" width="48" height="48" alt="kitze" title="kitze"/></a> <a href="https://github.com/levifig"><img src="https://avatars.githubusercontent.com/u/1605?v=4&s=48" width="48" height="48" alt="levifig" title="levifig"/></a> <a href="https://github.com/search?q=Lloyd"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Lloyd" title="Lloyd"/></a> <a href="https://github.com/loukotal"><img src="https://avatars.githubusercontent.com/u/18210858?v=4&s=48" width="48" height="48" alt="loukotal" title="loukotal"/></a> <a href="https://github.com/louzhixian"><img src="https://avatars.githubusercontent.com/u/7994361?v=4&s=48" width="48" height="48" alt="louzhixian" title="louzhixian"/></a> <a href="https://github.com/martinpucik"><img src="https://avatars.githubusercontent.com/u/5503097?v=4&s=48" width="48" height="48" alt="martinpucik" title="martinpucik"/></a> <a href="https://github.com/search?q=Matt%20mini"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Matt mini" title="Matt mini"/></a> <a href="https://github.com/mertcicekci0"><img src="https://avatars.githubusercontent.com/u/179321902?v=4&s=48" width="48" height="48" alt="mertcicekci0" title="mertcicekci0"/></a>
  <a href="https://github.com/search?q=Miles"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Miles" title="Miles"/></a> <a href="https://github.com/mrdbstn"><img src="https://avatars.githubusercontent.com/u/58957632?v=4&s=48" width="48" height="48" alt="mrdbstn" title="mrdbstn"/></a> <a href="https://github.com/MSch"><img src="https://avatars.githubusercontent.com/u/7475?v=4&s=48" width="48" height="48" alt="MSch" title="MSch"/></a> <a href="https://github.com/search?q=Mustafa%20Tag%20Eldeen"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Mustafa Tag Eldeen" title="Mustafa Tag Eldeen"/></a> <a href="https://github.com/ndraiman"><img src="https://avatars.githubusercontent.com/u/12609607?v=4&s=48" width="48" height="48" alt="ndraiman" title="ndraiman"/></a> <a href="https://github.com/nexty5870"><img src="https://avatars.githubusercontent.com/u/3869659?v=4&s=48" width="48" height="48" alt="nexty5870" title="nexty5870"/></a> <a href="https://github.com/Noctivoro"><img src="https://avatars.githubusercontent.com/u/183974570?v=4&s=48" width="48" height="48" alt="Noctivoro" title="Noctivoro"/></a> <a href="https://github.com/prathamdby"><img src="https://avatars.githubusercontent.com/u/134331217?v=4&s=48" width="48" height="48" alt="prathamdby" title="prathamdby"/></a> <a href="https://github.com/ptn1411"><img src="https://avatars.githubusercontent.com/u/57529765?v=4&s=48" width="48" height="48" alt="ptn1411" title="ptn1411"/></a> <a href="https://github.com/reeltimeapps"><img src="https://avatars.githubusercontent.com/u/637338?v=4&s=48" width="48" height="48" alt="reeltimeapps" title="reeltimeapps"/></a>
  <a href="https://github.com/RLTCmpe"><img src="https://avatars.githubusercontent.com/u/10762242?v=4&s=48" width="48" height="48" alt="RLTCmpe" title="RLTCmpe"/></a> <a href="https://github.com/search?q=Rolf%20Fredheim"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Rolf Fredheim" title="Rolf Fredheim"/></a> <a href="https://github.com/search?q=Rony%20Kelner"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Rony Kelner" title="Rony Kelner"/></a> <a href="https://github.com/search?q=Samrat%20Jha"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Samrat Jha" title="Samrat Jha"/></a> <a href="https://github.com/senoldogann"><img src="https://avatars.githubusercontent.com/u/45736551?v=4&s=48" width="48" height="48" alt="senoldogann" title="senoldogann"/></a> <a href="https://github.com/Seredeep"><img src="https://avatars.githubusercontent.com/u/22802816?v=4&s=48" width="48" height="48" alt="Seredeep" title="Seredeep"/></a> <a href="https://github.com/sergical"><img src="https://avatars.githubusercontent.com/u/3760543?v=4&s=48" width="48" height="48" alt="sergical" title="sergical"/></a> <a href="https://github.com/shiv19"><img src="https://avatars.githubusercontent.com/u/9407019?v=4&s=48" width="48" height="48" alt="shiv19" title="shiv19"/></a> <a href="https://github.com/shiyuanhai"><img src="https://avatars.githubusercontent.com/u/1187370?v=4&s=48" width="48" height="48" alt="shiyuanhai" title="shiyuanhai"/></a> <a href="https://github.com/siraht"><img src="https://avatars.githubusercontent.com/u/73152895?v=4&s=48" width="48" height="48" alt="siraht" title="siraht"/></a>
  <a href="https://github.com/snopoke"><img src="https://avatars.githubusercontent.com/u/249606?v=4&s=48" width="48" height="48" alt="snopoke" title="snopoke"/></a> <a href="https://github.com/testingabc321"><img src="https://avatars.githubusercontent.com/u/8577388?v=4&s=48" width="48" height="48" alt="testingabc321" title="testingabc321"/></a> <a href="https://github.com/search?q=The%20Admiral"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="The Admiral" title="The Admiral"/></a> <a href="https://github.com/thesash"><img src="https://avatars.githubusercontent.com/u/1166151?v=4&s=48" width="48" height="48" alt="thesash" title="thesash"/></a> <a href="https://github.com/search?q=Ubuntu"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Ubuntu" title="Ubuntu"/></a> <a href="https://github.com/voidserf"><img src="https://avatars.githubusercontent.com/u/477673?v=4&s=48" width="48" height="48" alt="voidserf" title="voidserf"/></a> <a href="https://github.com/search?q=Vultr-Clawd%20Admin"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Vultr-Clawd Admin" title="Vultr-Clawd Admin"/></a> <a href="https://github.com/search?q=Wimmie"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Wimmie" title="Wimmie"/></a> <a href="https://github.com/wstock"><img src="https://avatars.githubusercontent.com/u/1394687?v=4&s=48" width="48" height="48" alt="wstock" title="wstock"/></a> <a href="https://github.com/yazinsai"><img src="https://avatars.githubusercontent.com/u/1846034?v=4&s=48" width="48" height="48" alt="yazinsai" title="yazinsai"/></a>
  <a href="https://github.com/search?q=ymat19"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="ymat19" title="ymat19"/></a> <a href="https://github.com/search?q=Zach%20Knickerbocker"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Zach Knickerbocker" title="Zach Knickerbocker"/></a> <a href="https://github.com/0xJonHoldsCrypto"><img src="https://avatars.githubusercontent.com/u/81202085?v=4&s=48" width="48" height="48" alt="0xJonHoldsCrypto" title="0xJonHoldsCrypto"/></a> <a href="https://github.com/aaronn"><img src="https://avatars.githubusercontent.com/u/1653630?v=4&s=48" width="48" height="48" alt="aaronn" title="aaronn"/></a> <a href="https://github.com/Alphonse-arianee"><img src="https://avatars.githubusercontent.com/u/254457365?v=4&s=48" width="48" height="48" alt="Alphonse-arianee" title="Alphonse-arianee"/></a> <a href="https://github.com/atalovesyou"><img src="https://avatars.githubusercontent.com/u/3534502?v=4&s=48" width="48" height="48" alt="atalovesyou" title="atalovesyou"/></a> <a href="https://github.com/search?q=Azade"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Azade" title="Azade"/></a> <a href="https://github.com/carlulsoe"><img src="https://avatars.githubusercontent.com/u/34673973?v=4&s=48" width="48" height="48" alt="carlulsoe" title="carlulsoe"/></a> <a href="https://github.com/search?q=ddyo"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="ddyo" title="ddyo"/></a> <a href="https://github.com/search?q=Erik"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Erik" title="Erik"/></a>
  <a href="https://github.com/hougangdev"><img src="https://avatars.githubusercontent.com/u/105773686?v=4&s=48" width="48" height="48" alt="hougangdev" title="hougangdev"/></a> <a href="https://github.com/latitudeki5223"><img src="https://avatars.githubusercontent.com/u/119656367?v=4&s=48" width="48" height="48" alt="latitudeki5223" title="latitudeki5223"/></a> <a href="https://github.com/search?q=Manuel%20Maly"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Manuel Maly" title="Manuel Maly"/></a> <a href="https://github.com/search?q=Mourad%20Boustani"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Mourad Boustani" title="Mourad Boustani"/></a> <a href="https://github.com/odrobnik"><img src="https://avatars.githubusercontent.com/u/333270?v=4&s=48" width="48" height="48" alt="odrobnik" title="odrobnik"/></a> <a href="https://github.com/pcty-nextgen-ios-builder"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="pcty-nextgen-ios-builder" title="pcty-nextgen-ios-builder"/></a> <a href="https://github.com/search?q=Quentin"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Quentin" title="Quentin"/></a> <a href="https://github.com/search?q=Randy%20Torres"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="Randy Torres" title="Randy Torres"/></a> <a href="https://github.com/rhjoh"><img src="https://avatars.githubusercontent.com/u/105699450?v=4&s=48" width="48" height="48" alt="rhjoh" title="rhjoh"/></a> <a href="https://github.com/ronak-guliani"><img src="https://avatars.githubusercontent.com/u/23518228?v=4&s=48" width="48" height="48" alt="ronak-guliani" title="ronak-guliani"/></a>
  <a href="https://github.com/search?q=William%20Stock"><img src="assets/avatar-placeholder.svg" width="48" height="48" alt="William Stock" title="William Stock"/></a>
</p>
