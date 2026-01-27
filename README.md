# 🦞 Clawdbot 中文版

**私有化部署的 AI 智能助手，完整中文本地化。**

<p align="center">
  <img src="docs/images/main-view.png" alt="Clawdbot 中文版控制界面" width="800">
</p>

<p align="center">
  <a href="https://github.com/jiulingyun/clawdbot-chinese/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/jiulingyun/clawdbot-chinese/ci.yml?branch=main&style=for-the-badge&label=构建状态" alt="CI 状态"></a>
  <a href="https://github.com/jiulingyun/clawdbot-chinese/releases"><img src="https://img.shields.io/github/v/release/jiulingyun/clawdbot-chinese?include_prereleases&style=for-the-badge&label=版本" alt="GitHub 发布"></a>
  <a href="https://www.npmjs.com/package/clawdbot-cn"><img src="https://img.shields.io/npm/v/clawdbot-cn?style=for-the-badge&label=npm" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-blue.svg?style=for-the-badge" alt="MIT 许可证"></a>
</p>

<p align="center">
  <a href="https://clawd.org.cn">🌐 官网</a> ·
  <a href="https://clawd.org.cn/docs">📖 文档</a> ·
  <a href="https://github.com/jiulingyun/clawdbot-chinese/issues">💬 反馈</a>
</p>

---

## ✨ 特性

- **🇨🇳 完整中文化** — CLI、Web 控制界面、配置向导全部汉化
- **🏠 本地优先** — 数据存储在你自己的设备上，隐私可控
- **📱 多渠道支持** — WhatsApp、Telegram、Slack、Discord、Signal、iMessage、微信（开发中）
- **🎙️ 语音交互** — macOS/iOS/Android 语音唤醒和对话
- **🖼️ Canvas 画布** — 智能体驱动的可视化工作区
- **🔧 技能扩展** — 内置技能 + 自定义工作区技能

## 🚀 快速开始

**环境要求：** Node.js ≥ 22

```bash
# 安装
npm install -g clawdbot-cn@latest

# 运行安装向导
clawdbot-cn onboard --install-daemon

# 启动网关
clawdbot-cn gateway --port 18789 --verbose
```

## 📦 安装方式

### npm（推荐）

```bash
npm install -g clawdbot-cn@latest
# 或
pnpm add -g clawdbot-cn@latest
```

### 从源码构建

```bash
git clone https://github.com/jiulingyun/clawdbot-chinese.git
cd clawdbot-chinese

pnpm install
pnpm ui:build
pnpm build

pnpm clawdbot-cn onboard --install-daemon
```

## 🔧 配置

最小配置 `~/.clawdbot-cn/clawdbot-cn.json`：

```json
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  }
}
```

## 📚 文档

- [快速开始](https://clawd.org.cn/docs/start/getting-started)
- [Gateway 配置](https://clawd.org.cn/docs/gateway/configuration)
- [渠道接入](https://clawd.org.cn/docs/channels)
- [技能开发](https://clawd.org.cn/docs/tools/skills)

## 🔄 版本同步

本项目基于 [clawdbot/clawdbot](https://github.com/clawdbot/clawdbot) 进行中文本地化，定期与上游保持同步。

版本格式：`vYYYY.M.D-cn.N`（如 `v2026.1.24-cn.1`）

## 🤝 参与贡献

欢迎提交 Issue 和 PR！

- Bug 修复和功能优化会考虑贡献回上游
- 翻译改进、文档完善、国内渠道适配都非常欢迎

## 📋 开发计划

- [x] CLI 界面汉化
- [x] Web 控制界面汉化
- [x] 配置向导汉化
- [x] 中文官网和文档
- [ ] 微信渠道适配
- [ ] QQ 渠道适配
- [ ] 钉钉/企业微信/飞书适配

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">
  基于 <a href="https://github.com/clawdbot/clawdbot">Clawdbot</a> · 感谢原项目开发者 🦞
</p>
