---
title: CLI 常用命令速查
summary: "openclaw-cn / openclaw CLI 常用命令速查表，涵盖安装、配置、网关、渠道、模型、代理、插件等核心操作"
read_when:
  - 快速查找某个 CLI 命令的用法
  - 不确定某个操作对应哪个命令
  - Agent 需要执行 CLI 操作时参考
---

# CLI 常用命令速查

本文档是 `openclaw-cn`（中文社区版）和 `openclaw`（官方版）CLI 的常用命令速查表。两者命令结构完全一致，仅二进制名不同。

<Note>
以下示例统一使用 `openclaw-cn`。如果你使用官方版，将 `openclaw-cn` 替换为 `openclaw` 即可。
</Note>

## 安装与初始化

```bash
# npm 全局安装
sudo npm i -g openclaw-cn

# 安装指定版本/通道
sudo npm i -g openclaw-cn@latest        # 稳定版
sudo npm i -g openclaw-cn@beta          # 内测版

# 交互式引导（首次使用推荐）
openclaw-cn onboard

# 快速引导（最少交互）
openclaw-cn onboard --flow quickstart

# 非交互式引导（脚本/自动化）
openclaw-cn onboard --non-interactive --auth-choice token --token-provider anthropic --token "$TOKEN"
```

## 配置管理

```bash
# 交互式配置向导
openclaw-cn configure

# 读取配置
openclaw-cn config get agents.defaults.model.primary
openclaw-cn config get gateway.port

# 设置配置
openclaw-cn config set agents.defaults.model.primary "volcengine-coding-plan/doubao-seed-2.0-code"
openclaw-cn config set gateway.port 19001 --json
openclaw-cn config set channels.whatsapp.groups '["*"]' --json

# 删除配置
openclaw-cn config unset tools.web.search.apiKey
```

## 网关 (Gateway)

```bash
# 前台运行网关
openclaw-cn gateway run --bind loopback --port 18789

# 强制运行（杀掉已有监听）
openclaw-cn gateway run --bind loopback --port 18789 --force

# 后台运行（生产环境）
nohup openclaw-cn gateway run --bind loopback --port 18789 --force > /tmp/clawdbot-gateway.log 2>&1 &

# 安装为系统服务（launchd/systemd）
openclaw-cn gateway install
openclaw-cn gateway install --port 18789 --runtime node

# 服务管理
openclaw-cn gateway start
openclaw-cn gateway stop
openclaw-cn gateway restart
openclaw-cn gateway uninstall

# 网关状态与健康检查
openclaw-cn gateway status
openclaw-cn gateway status --deep
openclaw-cn gateway health
openclaw-cn gateway probe

# 查看网关日志
openclaw-cn logs --follow
openclaw-cn logs --limit 200 --json

# 发现局域网/Tailnet 网关
openclaw-cn gateway discover

# 低级 RPC 调用
openclaw-cn gateway call status
openclaw-cn gateway call config.get
openclaw-cn gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 模型管理

```bash
# 查看模型状态（默认模型 + 认证概览）
openclaw-cn models status
openclaw-cn models status --probe           # 在线探测认证状态（会消耗 token）

# 列出可用模型
openclaw-cn models list
openclaw-cn models list --provider volcengine-coding-plan

# 设置默认模型
openclaw-cn models set volcengine-coding-plan/doubao-seed-2.0-code
openclaw-cn models set-image openai/gpt-4o   # 设置图像模型

# 模型别名
openclaw-cn models aliases list
openclaw-cn models aliases add fast volcengine-coding-plan/doubao-seed-2.0-code

# 模型回退
openclaw-cn models fallbacks list
openclaw-cn models fallbacks add openrouter/moonshotai/kimi-k2

# 认证管理
openclaw-cn models auth add                  # 交互式添加
openclaw-cn models auth setup-token          # Claude Code token
openclaw-cn models auth paste-token          # 粘贴 token

# 扫描可用模型（自动探测）
openclaw-cn models scan
openclaw-cn models scan --provider openrouter --set-default
```

## 渠道管理

```bash
# 列出已配置渠道
openclaw-cn channels list
openclaw-cn channels list --json

# 渠道状态检查
openclaw-cn channels status
openclaw-cn channels status --probe          # 深度探测

# 添加渠道
openclaw-cn channels add                     # 交互式
openclaw-cn channels add --channel telegram --token "$TELEGRAM_BOT_TOKEN"
openclaw-cn channels add --channel discord --token "$DISCORD_BOT_TOKEN"
openclaw-cn channels add --channel slack --token "$SLACK_BOT_TOKEN" --app-token "$SLACK_APP_TOKEN"

# 移除渠道
openclaw-cn channels remove --channel telegram
openclaw-cn channels remove --channel discord --delete  # 同时删除配置

# WhatsApp 登录/登出
openclaw-cn channels login --channel whatsapp
openclaw-cn channels logout --channel whatsapp

# 渠道日志
openclaw-cn channels logs --channel all
openclaw-cn channels logs --channel telegram --lines 100

# 渠道能力探测
openclaw-cn channels capabilities
openclaw-cn channels capabilities --channel discord --target channel:123456
```

## 代理 (Agent)

```bash
# 列出代理
openclaw-cn agents list
openclaw-cn agents list --json --bindings

# 添加代理
openclaw-cn agents add work --workspace ~/clawd-work
openclaw-cn agents add work --workspace ~/clawd-work --model volcengine-coding-plan/glm-4.7

# 删除代理
openclaw-cn agents delete work

# 设置代理身份
openclaw-cn agents set-identity --agent main --name "Clawd" --emoji "🦞"
openclaw-cn agents set-identity --workspace ~/clawd --from-identity

# 单次代理调用
openclaw-cn agent --message "你好" --local
openclaw-cn agent --message "帮我写个脚本" --to "+15555550123" --deliver
```

## 消息发送

```bash
# 发送文本消息
openclaw-cn message send --channel telegram --target "123456789" --message "你好"
openclaw-cn message send --channel discord --target "channel:123" --message "Hello"
openclaw-cn message send --channel whatsapp --target "+15555550123" --message "Hi"

# 发送媒体
openclaw-cn message send --channel telegram --target "123456789" --media ./photo.jpg

# 投票
openclaw-cn message poll --channel discord --target "channel:123" --poll-question "午饭吃什么?" --poll-option "披萨" --poll-option "寿司"

# 表情回应
openclaw-cn message react --channel discord --target "channel:123" --message-id "456" --emoji "👍"

# 搜索消息
openclaw-cn message search --channel slack --target "channel:C123" --query "部署"
```

## 状态与诊断

```bash
# 综合状态
openclaw-cn status
openclaw-cn status --all                    # 完整诊断（可粘贴分享）
openclaw-cn status --deep                   # 深度探测渠道
openclaw-cn status --usage                  # 显示模型用量

# 健康检查
openclaw-cn health
openclaw-cn health --json

# 诊断修复
openclaw-cn doctor
openclaw-cn doctor --deep                   # 深度扫描
openclaw-cn doctor --repair                 # 自动修复

# 安全审计
openclaw-cn security audit
openclaw-cn security audit --deep           # 在线 Gateway 探测
openclaw-cn security audit --fix            # 自动加固
```

## 插件管理

```bash
# 列出插件
openclaw-cn plugins list
openclaw-cn plugins info <plugin-id>

# 安装插件
openclaw-cn plugins install <path-or-npm-spec>
openclaw-cn plugins install -l ./my-plugin   # 链接本地目录

# 启用/禁用
openclaw-cn plugins enable <plugin-id>
openclaw-cn plugins disable <plugin-id>

# 更新插件
openclaw-cn plugins update <plugin-id>
openclaw-cn plugins update --all

# 插件诊断
openclaw-cn plugins doctor
```

## Hooks (事件钩子)

```bash
# 列出所有钩子
openclaw-cn hooks list
openclaw-cn hooks list --eligible            # 仅显示可用钩子

# 查看钩子详情
openclaw-cn hooks info session-memory

# 启用/禁用内置钩子
openclaw-cn hooks enable session-memory      # 会话记忆（/new 时自动保存）
openclaw-cn hooks enable boot-md             # 启动时执行 BOOT.md
openclaw-cn hooks enable command-logger      # 命令审计日志

openclaw-cn hooks disable command-logger

# 安装外部钩子
openclaw-cn hooks install ./my-hook-pack
openclaw-cn hooks update --all
```

## 定时任务 (Cron)

```bash
# 查看状态和任务列表
openclaw-cn cron status
openclaw-cn cron list

# 添加定时任务
openclaw-cn cron add --name "日报" --every 24h --system-event "生成今日工作日报"
openclaw-cn cron add --name "提醒" --at "2026-03-03T09:00:00" --message "开会提醒"
openclaw-cn cron add --name "周报" --cron "0 9 * * 1" --system-event "生成本周周报" --announce --channel telegram --to "123456789"

# 管理任务
openclaw-cn cron enable <job-id>
openclaw-cn cron disable <job-id>
openclaw-cn cron edit <job-id> --every 12h
openclaw-cn cron rm <job-id>

# 手动触发
openclaw-cn cron run <job-id>
openclaw-cn cron runs --id <job-id>          # 查看运行历史
```

## 语义记忆 (Memory)

```bash
# 记忆状态
openclaw-cn memory status
openclaw-cn memory status --deep             # 探测向量 + embedding 可用性

# 索引
openclaw-cn memory index
openclaw-cn memory index --agent main --verbose

# 搜索
openclaw-cn memory search "发布流程"
```

## 会话管理

```bash
# 列出会话
openclaw-cn sessions
openclaw-cn sessions --json --verbose
```

## 技能 (Skills)

```bash
# 列出技能
openclaw-cn skills list
openclaw-cn skills list --eligible           # 仅显示可用技能
openclaw-cn skills info <skill-name>
openclaw-cn skills check                     # 就绪摘要
```

## 沙盒 (Sandbox)

```bash
# 查看沙盒容器
openclaw-cn sandbox list
openclaw-cn sandbox list --json

# 查看沙盒策略
openclaw-cn sandbox explain
openclaw-cn sandbox explain --agent work

# 重建沙盒容器
openclaw-cn sandbox recreate --all
openclaw-cn sandbox recreate --agent work
```

## 浏览器控制

```bash
# 启动/停止
openclaw-cn browser start
openclaw-cn browser stop
openclaw-cn browser status

# 标签页管理
openclaw-cn browser tabs
openclaw-cn browser open https://example.com
openclaw-cn browser close

# 截图与快照
openclaw-cn browser screenshot --full-page
openclaw-cn browser snapshot --format ai

# 页面操作
openclaw-cn browser navigate https://example.com
openclaw-cn browser click <ref>
openclaw-cn browser type <ref> "Hello"
openclaw-cn browser press Enter
```

## 远程节点 (Nodes)

```bash
# 查看节点
openclaw-cn nodes status
openclaw-cn nodes list --connected

# 审批节点
openclaw-cn nodes pending
openclaw-cn nodes approve <requestId>

# 远程执行
openclaw-cn nodes run --node <id> -- ls -la
openclaw-cn nodes invoke --node <id> --command status

# 远程摄像头
openclaw-cn nodes camera snap --node <id>
openclaw-cn nodes camera clip --node <id> --duration 10s
```

## 更新与重置

```bash
# 更新
openclaw-cn update
openclaw-cn update --channel beta
openclaw-cn update --channel dev
openclaw-cn update status

# 重置（保留 CLI）
openclaw-cn reset --scope config
openclaw-cn reset --scope full --yes

# 卸载
openclaw-cn uninstall --all --yes
```

## 其他工具

```bash
# 控制面板（Web UI）
openclaw-cn dashboard

# 终端 UI
openclaw-cn tui
openclaw-cn tui --session agent:main:main

# ACP 桥接（IDE 连接）
openclaw-cn acp

# 文档搜索
openclaw-cn docs "如何配置 Telegram"

# DM 配对
openclaw-cn pairing list whatsapp
openclaw-cn pairing approve whatsapp <code>

# DNS 发现
openclaw-cn dns setup --apply
```

## 全局选项

所有命令均支持以下全局选项：

| 选项               | 说明                                          |
| ------------------ | --------------------------------------------- |
| `--dev`            | 开发模式，状态隔离到 `~/.openclaw-dev`        |
| `--profile <name>` | 使用命名配置文件，隔离到 `~/.openclaw-<name>` |
| `--no-color`       | 禁用 ANSI 颜色                                |
| `--json`           | 机器可读 JSON 输出（大部分命令支持）          |
| `-V` / `--version` | 显示版本号                                    |

## 配置文件路径

| 项目       | 路径                                      |
| ---------- | ----------------------------------------- |
| 配置文件   | `~/.openclaw/openclaw.json`               |
| 凭证目录   | `~/.openclaw/credentials/`                |
| 会话目录   | `~/.openclaw/sessions/`                   |
| 默认工作区 | `~/clawd`                                 |
| 网关日志   | `/tmp/clawdbot-gateway.log`（手动运行时） |

## 常见运维操作速查

```bash
# 完整健康检查流程
openclaw-cn doctor && openclaw-cn status --deep && openclaw-cn models status --probe

# 重启网关（生产环境）
pkill -9 -f clawdbot-gateway || true
nohup openclaw-cn gateway run --bind loopback --port 18789 --force > /tmp/clawdbot-gateway.log 2>&1 &

# 验证网关运行
openclaw-cn channels status --probe
ss -ltnp | grep 18789
tail -n 120 /tmp/clawdbot-gateway.log

# 全新安装一键流程
sudo npm i -g openclaw-cn && openclaw-cn onboard
```
