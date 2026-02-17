---
summary: "常见 OpenClaw 故障的快速故障排除指南"
read_when:
  - 调查运行时问题或故障时
---
# 故障排除 🔧

当 OpenClaw 表现异常时，这里是如何修复它的方法。

如果您只是想要一个快速分类方案，请从 FAQ 的 [前 60 秒](/help/faq#first-60-seconds-if-somethings-broken) 开始。本页面深入探讨运行时故障和诊断。

特定提供者的快捷方式：[/channels/troubleshooting](/channels/troubleshooting)

## 状态和诊断

快速分类命令（按顺序）：

| 命令 | 告诉你什么 | 何时使用 |
|---|---|---|
| `openclaw-cn status` | 本地摘要：操作系统 + 更新，网关可达性/模式，服务，代理/会话，提供者配置状态 | 首次检查，快速概览 |
| `openclaw-cn status --all` | 完整本地诊断（只读，可粘贴，相对安全）包括日志尾部 | 当您需要分享调试报告时 |
| `openclaw-cn status --deep` | 运行网关健康检查（包括提供者探测；需要可访问的网关） | 当"已配置"不等于"正在工作"时 |
| `openclaw-cn gateway probe` | 网关发现 + 可达性（本地 + 远程目标） | 当您怀疑您正在探测错误的网关时 |
| `openclaw-cn channels status --probe` | 向运行的网关询问通道状态（并可选地进行探测） | 当网关可访问但通道表现异常时 |
| `openclaw-cn gateway status` | 监督者状态（launchd/systemd/schtasks），运行时 PID/退出，最后的网关错误 | 当服务"看起来已加载"但没有运行任何东西时 |
| `openclaw-cn logs --follow` | 实时日志（运行时问题的最佳信号） | 当您需要实际失败原因时 |

**分享输出：** 优先使用 `openclaw-cn status --all`（它会编辑令牌）。如果您粘贴 `openclaw-cn status`，请考虑先设置 `OPENCLAW_SHOW_SECRETS=0`（令牌预览）。

另请参阅：[健康检查](/gateway/health) 和 [日志](/logging)。

## 常见问题

### 未找到提供者 "anthropic" 的 API 密钥

这意味着 **代理的身份验证存储为空** 或缺少 Anthropic 凭据。
身份验证是 **按代理** 的，所以新代理不会继承主代理的密钥。

修复选项：
- 重新运行入门设置并为该代理选择 **Anthropic**。
- 或在 **网关主机** 上粘贴一个设置令牌：
  ```bash
  openclaw-cn models auth setup-token --provider anthropic
  ```
- 或从主代理目录复制 `auth-profiles.json` 到新代理目录。

验证：
```bash
openclaw-cn models status
```

### OAuth 令牌刷新失败（Anthropic Claude 订阅）

这意味着存储的 Anthropic OAuth 令牌已过期且刷新失败。
如果您使用的是 Claude 订阅（没有 API 密钥），最可靠的修复方法是
切换到 **Claude Code 设置令牌** 或在
**网关主机** 上重新同步 Claude Code CLI OAuth。

**推荐（设置令牌）：**

```bash
# 在网关主机上运行（运行 Claude Code CLI）
openclaw-cn models auth setup-token --provider anthropic
openclaw-cn models status
```

如果您在其他地方生成了令牌：

```bash
openclaw-cn models auth paste-token --provider anthropic
openclaw-cn models status
```

**如果您希望保持 OAuth 重用：**
在网关主机上使用 Claude Code CLI 登录，然后运行 `openclaw-cn models status`
将刷新的令牌同步到 OpenClaw 的身份验证存储中。

更多详细信息：[Anthropic](/providers/anthropic) 和 [OAuth](/concepts/oauth)。

### 控制 UI 在 HTTP 上失败（"需要设备身份" / "连接失败"）

如果您通过普通 HTTP 打开仪表板（例如 `http://<lan-ip>:18789/` 或
`http://<tailscale-ip>:18789/`），浏览器在 **非安全上下文** 中运行并
阻止 WebCrypto，因此无法生成设备身份。

**修复：**
- 优先通过 [Tailscale Serve](/gateway/tailscale) 使用 HTTPS。
- 或在网关主机上本地打开：`http://127.0.0.1:18789/`。
- 如果您必须保持在 HTTP 上，请启用 `gateway.controlUi.allowInsecureAuth: true` 并
  使用网关令牌（仅令牌；无设备身份/配对）。参见
  [控制 UI](/web/control-ui#insecure-http)。

### Web UI 显示 "disconnected (1008): pairing required" 错误

当您访问 Web UI 时，可能会遇到以下错误：

```
disconnected (1008): pairing required
```

这个错误通常出现在 **容器化部署**（Docker、Kubernetes）中。

**详细说明和解决方案：** 见 [配对要求故障排除](/gateway/pairing-required-troubleshooting)

**快速修复（Docker）：**
```bash
docker compose run --rm openclaw-cn-cli config set gateway.controlUi.allowInsecureAuth true
docker compose restart openclaw-cn-gateway
```

**快速修复（本地）：**
```bash
openclaw-cn config set gateway.controlUi.allowInsecureAuth true
openclaw-cn gateway restart
```

### Web UI 显示 "disconnected (1006): no reason" 错误 {#web-ui-1006-no-reason}

当您访问 Web 网关管理页面时，可能会遇到以下错误：

```
disconnected (1006): no reason
```

**问题原因：**

WebSocket 错误码 1006 表示“异常关闭”，连接在没有收到正常关闭帧的情况下断开。

常见原因包括：
1. **浏览器缓存旧 token**：更新版本后，浏览器 localStorage 中的旧设备认证数据与新版网关不兼容
2. **网关进程崩溃/重启**：网关突然退出，没有机会发送正常的关闭帧（常见于 Docker 部署）
3. **网络中断**：容器网络问题、反向代理超时或资源限制导致连接被强制断开

---

#### 场景 1：更新后首次连接失败

如果您刚更新了 OpenClaw 版本，最可能的原因是浏览器缓存了旧的设备认证数据。

**解决方案：**

**方法 1：清除浏览器本地存储（推荐）**

<details>
<summary>Chrome</summary>

1. 按 `F12` 打开开发者工具
2. 点击 **Application**（应用）选项卡
3. 左侧展开 **Local Storage**
4. 找到 `http://127.0.0.1:18789` 或您的网关地址
5. 右键删除以下条目：
   - `OpenClaw-device-identity-v1`
   - `OpenClaw.device.auth.v1`
6. 刷新页面

</details>

<details>
<summary>Firefox</summary>

1. 按 `F12` 打开开发者工具
2. 点击 **存储**（Storage）选项卡
3. 左侧展开 **本地存储**（Local Storage）
4. 找到并删除 `OpenClaw` 相关条目
5. 刷新页面

</details>

<details>
<summary>Safari</summary>

1. 菜单栏 → 开发 → 显示 Web 检查器
2. 点击 **存储**（Storage）选项卡
3. 左侧展开 **本地存储**
4. 找到并删除 `OpenClaw` 相关条目
5. 刷新页面

</details>

<details>
<summary>Edge</summary>

1. 按 `F12` 打开开发者工具
2. 点击 **应用程序**（Application）选项卡
3. 左侧展开 **本地存储**（Local Storage）
4. 找到并删除 `OpenClaw` 相关条目
5. 刷新页面

</details>

**方法 2：使用无痕/隐私模式**

在新的无痕浏览窗口打开 Web UI，这样会使用全新的本地存储。

- Chrome：`Ctrl+Shift+N`（Windows/Linux）或 `Cmd+Shift+N`（macOS）
- Firefox：`Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（macOS）
- Safari：文件 → 新建私密窗口

**方法 3：清除站点数据（快捷方式）**

`Ctrl+Shift+Delete`（Windows/Linux）或 `Cmd+Shift+Delete`（macOS），然后：
- 时间范围选择“全部时间”
- 仅勾选“Cookie 和站点数据”
- 点击清除

---

#### 场景 2：Docker 部署中频繁出现 1006 错误 {#docker-1006-frequent}

如果您使用 Docker 部署，且 **清除浏览器缓存后仍然经常遇到 1006 错误**，问题很可能是网关进程不稳定。

**诊断步骤：**

**步骤 1：检查容器状态和重启次数**

```bash
# 查看容器状态
docker compose ps

# 查看容器重启次数
docker inspect openclaw-cn-gateway --format='{{.RestartCount}}'

# 如果重启次数 > 0，说明容器曾经崩溃过
```

**步骤 2：查看容器日志**

```bash
# 查看最近日志
docker compose logs -f openclaw-cn-gateway --tail 100

# 检查是否有错误或崩溃信息
docker compose logs openclaw-cn-gateway 2>&1 | grep -i "error\|crash\|killed\|oom\|fatal"
```

**步骤 3：检查资源使用**

```bash
# 查看容器资源使用
docker stats openclaw-cn-gateway --no-stream

# 检查是否接近内存限制
```

**常见原因和解决方案：**

| 症状 | 可能原因 | 解决方案 |
|------|---------|---------|
| 容器频繁重启 | 内存不足 (OOM) | 增加 Docker 内存限制，或优化配置减少内存使用 |
| 日志中有 `SIGKILL` 或 `killed` | 资源限制触发 | 检查 `docker-compose.yml` 中的 `mem_limit` 设置 |
| 日志中有 `ECONNRESET` | 网络问题 | 检查 Docker 网络配置和防火墙规则 |
| 无明显错误但连接断开 | 空闲超时 | 见下方"反向代理配置"部分 |

**修复建议：**

**1. 增加容器资源限制（如果使用了限制）**

在 `docker-compose.yml` 中调整：

```yaml
services:
  openclaw-cn-gateway:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          memory: 1G  # 适当增加内存限制
```

**2. 确保数据卷正确挂载**

```bash
# 检查数据目录是否存在且有正确权限
ls -la ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}

# 确保容器内用户有写入权限
docker compose exec openclaw-cn-gateway ls -la /home/node/.openclaw
```

**3. 检查网关健康状态**

```bash
# 在容器内运行健康检查
docker compose exec openclaw-cn-gateway node dist/index.js health --json
```

---

#### 场景 3：使用反向代理时的 1006 错误

如果您在 Nginx、Caddy 或 Traefik 等反向代理后面运行网关，WebSocket 连接可能因代理配置不当而断开。

**Nginx 配置示例：**

```nginx
location / {
    proxy_pass http://127.0.0.1:18789;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 关键：增加超时时间防止空闲断开
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

**Caddy 配置示例：**

```caddyfile
your-domain.com {
    reverse_proxy localhost:18789 {
        # WebSocket 支持是自动的
        # 但可以显式设置超时
        transport http {
            read_timeout 0
        }
    }
}
```

**检查要点：**

- 确保代理正确传递 WebSocket 升级头（`Upgrade` 和 `Connection`）
- 将空闲超时设置为较长时间或禁用
- 确保 `X-Forwarded-*` 头正确传递

---

**预防建议：**

- 每次大版本更新后，如果遇到连接问题，优先尝试清除浏览器本地存储
- Docker 部署时，建议启用容器日志持久化，便于排查问题
- 使用反向代理时，确保 WebSocket 配置正确

### CI Secrets Scan 失败

这意味着 `detect-secrets` 找到了基准线中尚未包含的新候选项目。
请遵循 [秘密扫描](/gateway/security#secret-scanning-detect-secrets)。

### 服务已安装但没有运行

如果网关服务已安装但进程立即退出，服务
可能显示为"已加载"但实际上没有运行任何东西。

**检查：**
```bash
openclaw-cn gateway status
openclaw-cn doctor
```

Doctor/服务将显示运行时状态（PID/上次退出）和日志提示。

**日志：**
- 优先使用：`openclaw-cn logs --follow`
- 文件日志（始终）：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或您配置的 `logging.file`）
- macOS LaunchAgent（如果已安装）：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`
- Linux systemd（如果已安装）：`journalctl --user -u OpenClaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

**启用更多日志记录：**
- 提高文件日志详细程度（持久化 JSONL）：
  ```json
  { "logging": { "level": "debug" } }
  ```
- 提高控制台详细程度（仅 TTY 输出）：
  ```json
  { "logging": { "consoleLevel": "debug", "consoleStyle": "pretty" } }
  ```
- 快速提示：`--verbose` 仅影响 **控制台** 输出。文件日志仍由 `logging.level` 控制。

有关格式、配置和访问的完整概述，请参见 [/logging](/logging)。

### "网关启动被阻止：设置 gateway.mode=local"

这意味着配置存在但 `gateway.mode` 未设置（或不是 `local`），所以
网关拒绝启动。

**修复（推荐）：**
- 运行向导并将网关运行模式设置为 **本地**：
  ```bash
  openclaw-cn configure
  ```
- 或直接设置：
  ```bash
  openclaw-cn config set gateway.mode local
  ```

**如果您打算运行远程网关：**
- 设置远程 URL 并保持 `gateway.mode=remote`：
  ```bash
  openclaw-cn config set gateway.mode remote
  openclaw-cn config set gateway.remote.url "wss://gateway.example.com"
  ```

**仅临时/开发：** 传递 `--allow-unconfigured` 以在没有
`gateway.mode=local` 的情况下启动网关。

**还没有配置文件？** 运行 `openclaw-cn setup` 创建起始配置，然后重新运行
网关。

### 服务环境（PATH + 运行时）

网关服务使用 **最小 PATH** 运行，以避免 shell/manager 杂乱：
- macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
- Linux: `/usr/local/bin`, `/usr/bin`, `/bin`

这有意排除版本管理器（nvm/fnm/volta/asdf）和包
管理器（pnpm/npm），因为服务不加载您的 shell 初始化。运行时
变量如 `DISPLAY` 应该位于 `~/.openclaw/.env` 中（由
网关早期加载）。
在 `host=gateway` 上运行的 Exec 将您的登录 shell `PATH` 合并到 exec 环境中，
所以缺少工具通常意味着您的 shell 初始化没有导出它们（或设置
`tools.exec.pathPrepend`）。参见 [/tools/exec](/tools/exec)。

WhatsApp + Telegram 通道需要 **Node**；Bun 不受支持。如果您的
服务是使用 Bun 或版本管理的 Node 路径安装的，请运行 `openclaw-cn doctor`
迁移到系统 Node 安装。

### 技能在沙盒中缺少 API 密钥

**症状：** 技能在主机上工作但在沙盒中因缺少 API 密钥而失败。

**原因：** 沙盒化的 exec 在 Docker 内部运行，**不**继承主机的 `process.env`。

**修复：**
- 设置 `agents.defaults.sandbox.docker.env`（或按代理 `agents.list[].sandbox.docker.env`）
- 或将密钥嵌入到您的自定义沙盒镜像中
- 然后运行 `openclaw-cn sandbox recreate --agent <id>`（或 `--all`）

### 服务运行但端口未监听

如果服务报告 **运行中** 但在网关端口上没有任何监听，
网关可能拒绝绑定。

**"运行中"在此处的含义**
- `运行时：运行中` 意味着您的监督程序（launchd/systemd/schtasks）认为进程是活动的。
- `RPC 探测` 意味着 CLI 实际上可以连接到网关 WebSocket 并调用 `status`。
- 始终信任 `探测目标：` + `配置（服务）：` 作为 "我们实际上尝试了什么？" 的行。

**检查：**
- 对于 `openclaw-cn gateway` 和服务，`gateway.mode` 必须是 `local`。
- 如果您设置了 `gateway.mode=remote`，**CLI 默认** 为远程 URL。服务仍可能在本地运行，但您的 CLI 可能正在探测错误的位置。使用 `openclaw-cn gateway status` 查看服务解析的端口 + 探测目标（或传递 `--url`）。
- 当服务看起来在运行但端口已关闭时，`openclaw-cn gateway status` 和 `openclaw-cn doctor` 会从日志中显示 **最后的网关错误**。
- 非回环绑定（`lan`/`tailnet`/`custom`，或当回环不可用时的 `auto`）需要认证：
  `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- `gateway.remote.token` 仅用于远程 CLI 调用；它 **不** 启用本地认证。
- `gateway.token` 被忽略；使用 `gateway.auth.token`。

**如果 `openclaw-cn gateway status` 显示配置不匹配**
- `配置（cli）：...` 和 `配置（服务）：...` 通常应该匹配。
- 如果它们不匹配，您几乎肯定是在编辑一个配置，而服务正在运行另一个配置。
- 修复：从您希望服务使用的相同 `--profile` / `OPENCLAW_STATE_DIR` 重新运行 `openclaw-cn gateway install --force`。

**如果 `openclaw-cn gateway status` 报告服务配置问题**
- 监督程序配置（launchd/systemd/schtasks）缺少当前默认值。
- 修复：运行 `openclaw-cn doctor` 更新它（或 `openclaw-cn gateway install --force` 进行完全重写）。

**如果 `最后网关错误：` 提到 "拒绝绑定 … 没有认证"**
- 您将 `gateway.bind` 设置为非回环模式（`lan`/`tailnet`/`custom`，或当回环不可用时的 `auto`）但没有启用认证。
- 修复：设置 `gateway.auth.mode` + `gateway.auth.token`（或导出 `OPENCLAW_GATEWAY_TOKEN`）并重启服务。

**如果 `openclaw-cn gateway status` 显示 `bind=tailnet` 但未找到 tailnet 接口**
- 网关尝试绑定到 Tailscale IP (100.64.0.0/10) 但在主机上未检测到任何。
- 修复：在该机器上启动 Tailscale（或将 `gateway.bind` 更改为 `loopback`/`lan`）。

**如果 `探测注释：` 说探测使用回环**
- 这对 `bind=lan` 是预期的：网关监听 `0.0.0.0`（所有接口），而回环仍应能本地连接。
- 对于远程客户端，使用真实的局域网 IP（不是 `0.0.0.0`）加上端口，并确保已配置认证。

### 地址已在使用（端口 18789）

这意味着网关端口上已有其他程序在监听。

**检查：**
```bash
openclaw-cn gateway status
```

它将显示监听器和可能的原因（网关已在运行，SSH 隧道）。
如有需要，停止服务或选择不同的端口。

### 检测到额外工作空间文件夹

如果您从旧版本升级，磁盘上可能仍有 `~/openclawot`。
多个工作空间目录可能导致混乱的认证或状态漂移，因为
只有一个工作空间处于活动状态。

**修复：** 保留单个活动工作空间并归档/删除其余的。参见
[代理工作空间](/concepts/agent-workspace#extra-workspace-folders)。

### 主聊天在沙盒工作空间中运行

症状：`pwd` 或文件工具显示 `~/.openclaw/sandboxes/...` 即使您
期望的是主机工作空间。

**原因：** `agents.defaults.sandbox.mode: "non-main"` 基于 `session.mainKey`（默认为 `"main"`）。
群组/频道会话使用自己的键，因此它们被视为非主要会话并
获得沙盒工作空间。

**修复选项：**
- 如果您希望代理使用主机工作空间：设置 `agents.list[].sandbox.mode: "off"`。
- 如果您希望在沙盒内访问主机工作空间：为该代理设置 `workspaceAccess: "rw"`。

### "代理被中止"

代理在响应过程中被中断。

**原因：**
- 用户发送了 `stop`、`abort`、`esc`、`wait` 或 `exit`
- 超时超过
- 进程崩溃

**修复：** 只需发送另一条消息。会话将继续。

### "代理回复前失败：未知模型：anthropic/claude-haiku-3-5"

openclaw-cn 故意拒绝 **较旧/不安全的模型**（特别是那些更容易
受到提示注入攻击的模型）。如果您看到此错误，则表示该模型名称已
不再受支持。

**修复：**
- 为提供者选择一个 **最新** 模型并更新您的配置或模型别名。
- 如果您不确定哪些模型可用，请运行 `openclaw-cn models list` 或
  `openclaw-cn models scan` 并选择一个受支持的模型。
- 检查网关日志以了解详细的失败原因。

另请参阅：[模型 CLI](/cli/models) 和 [模型提供者](/concepts/model-providers)。

### Messages Not Triggering

**检查 1：** 发送者是否在允许列表中？
```bash
openclaw-cn status
```
在输出中查找 `AllowFrom: ...`。

**检查 2：** 对于群聊，是否需要提及？
```bash
# 消息必须匹配 mentionPatterns 或明确提及；默认值位于通道组/公会中。
# 多代理：`agents.list[].groupChat.mentionPatterns` 覆盖全局模式。
grep -n "agents\|groupChat\|mentionPatterns\|channels\.whatsapp\.groups\|channels\.telegram\.groups\|channels\.imessage\.groups\|channels\.discord\.guilds" \
  "${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
```

**检查 3：** 检查日志
```bash
openclaw-cn logs --follow
# 或如果您想要快速过滤：
tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)" | grep "blocked|skip|unauthorized"
```

### 配对码未到达

如果 `dmPolicy` 是 `pairing`，未知发送者应该收到一个代码，在获得批准之前他们的消息会被忽略。

**检查 1：** 是否有待处理的请求正在等待？
```bash
openclaw-cn pairing list <channel>
```

待处理的 DM 配对请求默认限制为每个通道 **3 个**。如果列表已满，新请求不会生成代码，直到其中一个被批准或过期。

**检查 2：** 请求是否已创建但没有发送回复？
```bash
openclaw-cn logs --follow | grep "pairing request"
```

**检查 3：** 确认该通道的 `dmPolicy` 不是 `open`/`allowlist`。

### 图片 + 提及不起作用

已知问题：当您仅发送带有提及的消息（没有其他文本）时，WhatsApp 有时不包含提及元数据。

**解决方法：** 添加一些带提及的文本：
- ❌ `@clawd` + 图片
- ✅ `@clawd check this` + 图片

### 会话未恢复

**检查 1：** 会话文件是否存在？
```bash
ls -la ~/.openclaw/agents/<agentId>/sessions/
```

**检查 2：** 重置窗口是否太短？
```json
{
  "session": {
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080  // 7 天
    }
  }
}
```

**检查 3：** 是否有人发送了 `/new`、`/reset` 或重置触发器？

### 代理超时

默认超时时间为 30 分钟。对于长时间任务：

```json
{
  "reply": {
    "timeoutSeconds": 3600  // 1 小时
  }
}
```

或者使用 `process` 工具在后台运行长时间命令。

### WhatsApp 断开连接

```
# 检查本地状态（凭据，会话，排队事件）
openclaw-cn status
# 探测运行中的网关 + 通道（WA 连接 + Telegram + Discord API）
openclaw-cn status --deep

# 查看最近的连接事件
openclaw-cn logs --limit 200 | grep "connection\|disconnect\|logout"
```

**修复：** 一旦网关运行通常会自动重新连接。如果您卡住了，请重启网关进程（无论您如何监督它），或手动运行详细输出：

```bash
openclaw-cn gateway --verbose
```

如果您已登出/取消链接：

```bash
openclaw-cn channels logout
trash "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/credentials" # 如果登出不能完全清除所有内容
openclaw-cn channels login --verbose       # 重新扫描二维码
```

### 媒体发送失败

**检查 1：** 文件路径是否有效？
```bash
ls -la /path/to/your/image.jpg
```

**检查 2：** 文件是否太大？
- 图片：最大 6MB
- 音频/视频：最大 16MB  
- 文档：最大 100MB

**检查 3：** 检查媒体日志
```bash
grep "media|fetch|download" "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)" | tail -20
```

### 高内存使用

OpenClaw 将对话历史保存在内存中。

**修复：** 定期重启或设置会话限制：
```json
{
  "session": {
    "historyLimit": 100  // 最大保留消息数
  }
}
```

## 通用故障排除

### "网关无法启动 — 配置无效"

当配置包含未知键、格式错误的值或无效类型时，OpenClaw 现在拒绝启动。
这是为了安全而有意为之的。

使用 Doctor 修复它：
```bash
openclaw-cn doctor
openclaw-cn doctor --fix
```

注意事项：
- `openclaw-cn doctor` 报告每个无效条目。
- `openclaw-cn doctor --fix` 应用迁移/修复并重写配置。
- 即使配置无效，诊断命令如 `openclaw-cn logs`、`openclaw-cn health`、`openclaw-cn status`、`openclaw-cn gateway status` 和 `openclaw-cn gateway probe` 仍然可以运行。

### "所有模型都失败了" — 我应该首先检查什么？

- **凭据**：尝试的提供者是否存在凭据（认证配置文件 + 环境变量）。
- **模型路由**：确认 `agents.defaults.model.primary` 和备用模型是您可以访问的模型。
- **网关日志**：在 `/tmp/openclaw/…` 中查看确切的提供者错误。
- **模型状态**：使用 `/model status`（聊天）或 `openclaw-cn models status`（CLI）。

### 我在我的个人 WhatsApp 号码上运行 — 为什么自聊很奇怪？

启用自聊模式并允许您自己的号码：

```json5
{
  channels: {
    whatsapp: {
      selfChatMode: true,
      dmPolicy: "allowlist",
      allowFrom: ["+15555550123"]
    }
  }
}
```

参见 [WhatsApp 设置](/channels/whatsapp)。

### WhatsApp 将我登出了。如何重新认证？

再次运行登录命令并扫描二维码：

```bash
openclaw-cn channels login
```

### 在 `main` 分支上出现构建错误 — 标准修复路径是什么？

1) `git pull origin main && pnpm install`
2) `openclaw-cn doctor`
3) 检查 GitHub issues 或 Discord
4) 临时解决方法：检出一个较早的提交

### npm 安装失败（allow-build-scripts / 缺少 tar 或 yargs）。现在怎么办？

如果您从源代码运行，请使用仓库的包管理器：**pnpm**（推荐）。
仓库声明了 `packageManager: "pnpm@…"`。

典型恢复步骤：
```bash
git status   # 确保您在仓库根目录
pnpm install
pnpm build
openclaw-cn doctor
openclaw-cn gateway restart
```

原因：pnpm 是此仓库配置的包管理器。

### 如何在 git 安装和 npm 安装之间切换？

使用 **网站安装程序** 并使用标志选择安装方法。它
就地升级并重写网关服务以指向新安装。

切换 **到 git 安装**：
```bash
curl -fsSL https://clawd.bot/install.sh | bash -s -- --install-method git --no-onboard
```

切换 **到 npm 全局**：
```bash
curl -fsSL https://clawd.bot/install.sh | bash
```

注意事项：
- git 流程仅在仓库干净时才会变基。请先提交或暂存更改。
- 切换后，运行：
  ```bash
  openclaw-cn doctor
  openclaw-cn gateway restart
  ```

### Telegram 块流在工具调用之间没有分割文本。为什么？

块流只发送**完整的文本块**。常见的导致单个消息的原因：
- `agents.defaults.blockStreamingDefault` 仍然是 `"off"`。
- `channels.telegram.blockStreaming` 设置为 `false`。
- `channels.telegram.streamMode` 是 `partial` 或 `block` **并且草稿流是激活的**
  （私人聊天 + 主题）。在这种情况下，草稿流禁用了块流。
- 您的 `minChars` / 合并设置太高，因此块被合并了。
- 模型发出一个大的文本块（没有中间回复刷新点）。

修复清单：
1) 将块流设置放在 `agents.defaults` 下，而不是根目录。
2) 如果您想要真正的多消息块回复，请设置 `channels.telegram.streamMode: "off"`。
3) 调试时使用较小的块/合并阈值。

See [Streaming](/concepts/streaming).

### Discord 在我的服务器中即使设置了 `requireMention: false` 也不回复。为什么？

`requireMention` 仅在通道通过允许列表后控制提及门控。
默认情况下 `channels.discord.groupPolicy` 是 **允许列表**，所以公会必须显式启用。
如果您设置了 `channels.discord.guilds.<guildId>.channels`，只有列出的通道被允许；省略它以允许公会中的所有通道。

修复清单：
1) 设置 `channels.discord.groupPolicy: "open"` **或** 添加一个公会允许列表条目（以及可选的通道允许列表）。
2) 在 `channels.discord.guilds.<guildId>.channels` 中使用 **数字通道 ID**。
3) 将 `requireMention: false` 放在 `channels.discord.guilds` 下（全局或每个通道）。
   顶层 `channels.discord.requireMention` 不是受支持的键。
4) 确保机器人具有 **消息内容意图** 和通道权限。
5) 运行 `openclaw-cn channels status --probe` 获取审核提示。

文档：[Discord](/channels/discord)，[通道故障排除](/channels/troubleshooting)。

### Cloud Code Assist API 错误：无效的工具模式 (400)。现在怎么办？

这几乎总是 **工具模式兼容性** 问题。Cloud Code Assist
端点接受严格的 JSON 模式子集。OpenClaw 在当前 `main` 分支中清理/规范化工具
模式，但该修复尚未包含在最新版本中（截至
2026年1月13日）。

修复清单：
1) **更新 OpenClaw**：
   - 如果您可以从源代码运行，请拉取 `main` 并重启网关。
   - 否则，请等待包含模式清理器的下一个版本。
2) 避免不受支持的关键字，如 `anyOf/oneOf/allOf`、`patternProperties`、
   `additionalProperties`、`minLength`、`maxLength`、`format` 等。
3) 如果您定义自定义工具，请保持顶层模式为 `type: "object"`，并使用
   `properties` 和简单枚举。

参见 [工具](/tools) 和 [TypeBox 模式](/concepts/typebox)。

## macOS 特定问题

### 授予权限时应用程序崩溃（语音/麦克风）

如果应用程序在您点击隐私提示上的"允许"时消失或显示"Abort trap 6"：

**修复 1：重置 TCC 缓存**
```bash
tccutil reset All com.openclaw.mac.debug
```

**修复 2：强制新包 ID**
如果重置不起作用，请在 [`scripts/package-mac-app.sh`](https://github.com/OpenClaw/OpenClaw/blob/main/scripts/package-mac-app.sh) 中更改 `BUNDLE_ID`（例如，添加 `.test` 后缀）并重建。这会强制 macOS 将其视为新应用。

### 网关卡在 "Starting..."

应用程序连接到端口 `18789` 上的本地网关。如果它一直卡住：

**修复 1：停止监督程序（首选）**
如果网关由 launchd 监督，杀死 PID 只会使它重新生成。首先停止监督程序：
```bash
openclaw-cn gateway status
openclaw-cn gateway stop
# 或：launchctl bootout gui/$UID/com.openclaw.gateway （如需要，替换为 com.openclaw.<profile>）
```

**修复 2：端口正忙（查找监听器）**
```bash
lsof -nP -iTCP:18789 -sTCP:LISTEN
```

如果是无人监督的进程，请先尝试优雅停止，然后升级：
```bash
kill -TERM <PID>
sleep 1
kill -9 <PID> # 最后的手段
```

**修复 3：检查 CLI 安装**
确保全局 `openclaw-cn` CLI 已安装并与应用程序版本匹配：
```bash
openclaw-cn --version
npm install -g openclaw-cn@<version>
```

## 调试模式

获取详细日志：

```bash
# 在配置中开启跟踪日志：
#   ${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json} -> { logging: { level: "trace" } }
#
# 然后运行详细命令将调试输出镜像到标准输出：
openclaw-cn gateway --verbose
openclaw-cn channels login --verbose
```

## 日志位置

| 日志 | 位置 |
|-----|----------|
| 网关文件日志（结构化） | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` （或 `logging.file`） |
| 网关服务日志（监督程序） | macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` + `gateway.err.log` （默认：`~/.openclaw/logs/...`; 配置文件使用 `~/.openclaw-<profile>/logs/...`）<br />Linux: `journalctl --user -u openclaw-cn-gateway[-<profile>].service -n 200 --no-pager`<br />Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST` |
| 会话文件 | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/` |
| 媒体缓存 | `$OPENCLAW_STATE_DIR/media/` |
| 凭据 | `$OPENCLAW_STATE_DIR/credentials/` |

## 健康检查

```bash
# 监督程序 + 探测目标 + 配置路径
openclaw-cn gateway status
# 包括系统级扫描（遗留/额外服务，端口监听器）
openclaw-cn gateway status --deep

# 网关是否可访问？
openclaw-cn health --json
# 如果失败，请使用连接详情重新运行：
openclaw-cn health --verbose

# 是否有其他程序在默认端口上监听？
lsof -nP -iTCP:18789 -sTCP:LISTEN

# 最近活动（RPC 日志尾部）
openclaw-cn logs --follow
# 如果 RPC 关闭则使用备选方案
tail -20 /tmp/openclaw/openclaw-*.log
```

## 重置所有内容

终极选项：

```bash
openclaw-cn gateway stop
# 如果您安装了服务并希望进行干净安装：
# openclaw-cn gateway uninstall

trash "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
openclaw-cn channels login         # 重新配对 WhatsApp
openclaw-cn gateway restart           # 或：openclaw-cn gateway
```

⚠️ 这会丢失所有会话并需要重新配对 WhatsApp。

## 获取帮助

1. 首先检查日志：`/tmp/openclaw-cn/` （默认：`openclaw-cn-YYYY-MM-DD.log`，或您配置的 `logging.file`）
2. 在 GitHub 上搜索现有问题
3. 使用以下信息打开新问题：
   - openclaw-cn 版本
   - 相关日志片段
   - 重现步骤
   - 您的配置（请编辑掉敏感信息！）

---

*"Have you tried turning it off and on again?"* — Every IT person ever

🦞🔧

### 浏览器未启动（Linux）

如果您看到 `"Failed to start Chrome CDP on port 18800"`：

**最可能的原因：** Ubuntu 上的 Snap 包装的 Chromium。

**快速修复：** 改为安装 Google Chrome：
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

然后在配置中设置：
```json
{
  "browser": {
    "executablePath": "/usr/bin/google-chrome-stable"
  }
}
```

**完整指南：** 参见 [browser-linux-troubleshooting](/tools/browser-linux-troubleshooting)
