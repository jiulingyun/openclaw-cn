---
summary: "网关调度器的定时任务 + 唤醒功能"
read_when:
  - 调度后台任务或唤醒
  - 连接应该与心跳一起运行的自动化
  - 在心跳和定时任务之间选择调度任务
---
# 定时任务（网关调度器）

> **定时任务 vs 心跳？** 请参阅 [定时任务 vs 心跳](/automation/cron-vs-heartbeat) 了解何时使用每种方式。

定时任务是网关内置的调度器。它持久化任务，在正确的时间唤醒代理，并可选择将输出发送回聊天。

如果您想要 *"每天早上运行这个"* 或 *"20分钟后提醒代理"*，
定时任务就是实现机制。

## 简要说明
- 定时任务在 **网关内部** 运行（不在模型内部）。
- 任务持久化存储在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- 两种执行方式：
  - **主会话**：排队系统事件，然后在下次心跳时运行。
  - **独立**：在 `cron:<jobId>` 中运行专用代理回合，可选择发送输出。
- 唤醒是一等公民：任务可以请求 "立即唤醒" 或 "下次心跳"。

## 新手友好概述
可以把定时任务看作：**何时** 运行 + **做什么**。

1) **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复任务 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳省略了时区，则视为 **UTC**。

2) **选择运行位置**
   - `sessionTarget: "main"` → 在下次心跳时使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用代理回合。

3) **选择载荷**
   - 主会话 → `payload.kind = "systemEvent"`
   - 独立会话 → `payload.kind = "agentTurn"`

可选：`deleteAfterRun: true` 会在成功运行后从存储中删除一次性任务。

## 概念

### 任务
定时任务是一个存储记录，包含：
- **时间表**（何时运行），
- **载荷**（做什么），
- 可选的 **发送**（输出应发送到哪里）。
- 可选的 **代理绑定**（`agentId`）：在特定代理下运行任务；如果
  缺失或未知，网关会回退到默认代理。

任务通过稳定的 `jobId` 标识（CLI/网关 API 使用）。
在代理工具调用中，`jobId` 是标准的；为了兼容性接受旧的 `id`。
任务可以在成功的一次性运行后通过 `deleteAfterRun: true` 可选地自动删除。

### 时间表
定时任务支持三种时间表类型：
- `at`：一次性时间戳（自纪元以来的毫秒数）。网关接受 ISO 8601 并强制转换为 UTC。
- `every`：固定间隔（毫秒）。
- `cron`：5字段的 cron 表达式，带可选的 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用网关主机的本地时区。

### 主执行 vs 独立执行

#### 主会话任务（系统事件）
主任务排队一个系统事件，并可选择唤醒心跳运行器。
它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "next-heartbeat"`（默认）：事件等待下一个计划的心跳。
- `wakeMode: "now"`：事件触发立即心跳运行。

当您想要正常的 心跳提示 + 主会话上下文时，这是最佳选择。
请参阅 [心跳](/gateway/heartbeat)。

#### 独立任务（专用定时会话）
独立任务在会话 `cron:<jobId>` 中运行专用代理回合。

关键行为：
- 提示前缀为 `[cron:<jobId> <任务名称>]` 以便追踪。
- 每次运行启动一个 **新的会话 ID**（没有先前对话的延续）。
- 摘要发布到主会话（前缀 `Cron`，可配置）。
- `wakeMode: "now"` 在发布摘要后触发立即心跳。
- 如果 `payload.deliver: true`，输出被发送到频道；否则保持内部。

对嘈杂、频繁或 "后台杂务" 使用独立任务，这些不应该刷屏
您的主要聊天历史。

### 载荷形状（运行什么）
支持两种载荷类型：
- `systemEvent`：仅主会话，通过心跳提示路由。
- `agentTurn`：仅独立会话，运行专用代理回合。

常见的 `agentTurn` 字段：
- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选超时覆盖。
- `deliver`：`true` 将输出发送到频道目标。
- `channel`：`last` 或特定频道。
- `to`：频道特定目标（电话/聊天/频道 ID）。
- `bestEffortDeliver`：如果发送失败则避免任务失败。

隔离选项（仅适用于 `session=isolated`）：
- `postToMainPrefix` (CLI: `--post-prefix`)：主会话中系统事件的前缀。
- `postToMainMode`：`summary`（默认）或 `full`。
- `postToMainMaxChars`：当 `postToMainMode=full` 时的最大字符数（默认 8000）。

### 模型和思考级别覆盖
独立任务（`agentTurn`）可以覆盖模型和思考级别：
- `model`：提供商/模型字符串（例如，`anthropic/claude-sonnet-4-20250514`）或别名（例如，`opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅限 GPT-5.2 + Codex 模型）

注意：您也可以在主会话任务上设置 `model`，但这会改变共享的主会话模型。我们建议仅对独立任务进行模型覆盖，以避免意外的上下文转换。

解析优先级：
1. 任务载荷覆盖（最高）
2. 钩子特定默认值（例如，`hooks.gmail.model`）
3. 代理配置默认值

### 发送（频道 + 目标）
独立任务可以将输出发送到频道。任务载荷可以指定：
- `channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`
- `to`：频道特定接收者目标

如果省略 `channel` 或 `to`，定时任务可以回退到主会话的 "最后路线"
（代理上次回复的地方）。

发送说明：
- 如果设置了 `to`，即使省略了 `deliver`，定时任务也会自动发送代理的最终输出。
- 当您想要最后路线发送而不需要显式的 `to` 时，使用 `deliver: true`。
- 使用 `deliver: false` 即使存在 `to` 也要保持输出内部。

目标格式提醒：
- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
- Telegram 主题应使用 `:topic:` 形式（见下文）。

#### Telegram 发送目标（主题 / 论坛帖子）
Telegram 通过 `message_thread_id` 支持论坛主题。对于定时任务发送，您可以将
主题/帖子编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（首选：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

像 `telegram:...` / `telegram:group:...` 这样的前缀目标也被接受：
- `telegram:group:-1001234567890:topic:123`

## 存储和历史
- 任务存储：`~/.openclaw/cron/jobs.json`（网关管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，自动修剪）。
- 覆盖存储路径：配置中的 `cron.store`。

## 配置

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1 // default 1
  }
}
```

完全禁用定时任务：
- `cron.enabled: false`（配置）
- `OPENCLAW_SKIP_CRON=1`（环境变量）

## CLI 快速入门

一次性提醒（UTC ISO，成功后自动删除）：
```bash
openclaw-cn cron add \
  --name "发送提醒" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "提醒：提交费用报告。" \
  --wake now \
  --delete-after-run
```

一次性提醒（主会话，立即唤醒）：
```bash
openclaw-cn cron add \
  --name "日历检查" \
  --at "20m" \
  --session main \
  --system-event "下次心跳：检查日历。" \
  --wake now
```

重复独立任务（发送到 WhatsApp）：
```bash
openclaw-cn cron add \
  --name "早晨状态" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "总结今天的收件箱 + 日历。" \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

重复独立任务（发送到 Telegram 主题）：
```bash
openclaw-cn cron add \
  --name "夜间摘要（主题）" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "总结今天；发送到夜间主题。" \
  --deliver \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

带模型和思考级别覆盖的独立任务：
```bash
openclaw-cn cron add \
  --name "深度分析" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "每周项目进展深度分析。" \
  --model "opus" \
  --thinking high \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"

代理选择（多代理设置）：
```bash
# 将任务固定到代理 "ops"（如果该代理缺失则回退到默认）
openclaw-cn cron add --name "运维扫描" --cron "0 6 * * *" --session isolated --message "检查运维队列" --agent ops

# 切换或清除现有任务上的代理
openclaw-cn cron edit <jobId> --agent ops
openclaw-cn cron edit <jobId> --clear-agent
```
```

手动运行（调试）：
```bash
openclaw-cn cron run <jobId> --force
```

编辑现有任务（修补字段）：
```bash
openclaw-cn cron edit <jobId> \
  --message "更新的提示" \
  --model "opus" \
  --thinking low
```

运行历史：
```bash
openclaw-cn cron runs --id <jobId> --limit 50
```

无需创建任务的即时系统事件：
```bash
openclaw-cn system event --mode now --text "下次心跳：检查电池。"
```

## 网关 API 接口
- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（强制或到期）、`cron.runs`
对于无需任务的即时系统事件，请使用 [`openclaw-cn system event`](/cli/system)。

## 故障排除

### "什么都不运行"
- 检查定时任务是否启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查网关是否持续运行（定时任务在网关进程中运行）。
- 对于 `cron` 时间表：确认时区（`--tz`）与主机时区。

### Telegram 发送到错误的地方
- 对于论坛主题，使用 `-100…:topic:<id>` 使其明确且无歧义。
- 如果您在日志或存储的 "最后路线" 目标中看到 `telegram:...` 前缀，这很正常；
  定时任务发送接受它们并仍能正确解析主题 ID。
