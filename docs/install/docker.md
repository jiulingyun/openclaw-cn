---
summary: "可选的基于 Docker 的 Clawdbot 设置和引导"
read_when:
  - 您想要容器化网关而非本地安装
  - 您正在验证 Docker 流程
---

# Docker（可选）

Docker 是 **可选的**。仅在您想要容器化网关或验证 Docker 流程时使用。

## Docker 适合我吗？

- **是**：您想要隔离的、可丢弃的网关环境，或在没有本地安装的主机上运行 Clawdbot。
- **否**：您在自己的机器上运行，只想要最快的开发循环。请改用正常安装流程。
- **沙箱说明**：代理沙箱也使用 Docker，但它 **不** 要求完整网关在 Docker 中运行。详见 [沙箱](/gateway/sandboxing)。

本指南涵盖：
- 容器化网关（完整 Clawdbot 在 Docker 中）
- 每会话代理沙箱（主机网关 + Docker 隔离的代理工具）

沙箱详情：[沙箱](/gateway/sandboxing)

## 要求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 足够的磁盘空间用于镜像和日志

## 容器化网关（Docker Compose）

### 快速开始（推荐）— 使用预构建镜像

**现在支持使用官方预构建的 Docker 镜像，无需从源码构建！**

#### 方式 1：使用预构建镜像（最简单）

如果您想使用预构建的镜像，设置环境变量：

```bash
export OPENCLAW_IMAGE="jiulingyun803/openclaw-cn:latest"
./docker-setup.sh
```

预构建镜像的优点：
- ✅ **快速部署** — 无需本地构建，直接拉取镜像
- ✅ **多架构支持** — 自动选择适配你的系统（amd64/arm64）
- ✅ **更新及时** — 官方镜像定期更新最新版本
- ✅ **减少资源占用** — 不需要在本地构建耗时又耗资源

#### 方式 2：从源码构建（本地镜像）

从仓库根目录构建本地镜像：

```bash
./docker-setup.sh
```

此脚本：
- 构建网关镜像（可能耗时 10-30 分钟）
- 运行引导向导
- 打印可选的提供商设置提示
- 通过 Docker Compose 启动网关
- 生成网关令牌并写入 `.env`

可选环境变量：
- `OPENCLAW_DOCKER_APT_PACKAGES` — 在构建期间安装额外的 apt 包
- `OPENCLAW_EXTRA_MOUNTS` — 添加额外的主机绑定挂载
- `OPENCLAW_HOME_VOLUME` — 在命名卷中持久化 `/home/node`

完成后：
- 在浏览器中打开 `http://127.0.0.1:18789/`。
- 将令牌粘贴到控制 UI（设置 → 令牌）。

它在主机上写入配置/工作空间：
- `~/.openclaw/`
- `~/clawd`

在 VPS 上运行？详见 [Hetzner (Docker VPS)](/platforms/hetzner)。

### 手动流程（compose）

```bash
docker build -t clawdbot:local -f Dockerfile .
docker compose run --rm clawdbot-cli onboard
docker compose up -d clawdbot-gateway
```

### 环境变量配置（可选）

Docker 容器支持以下环境变量。您可以通过 `.env` 文件或命令行设置它们：

#### 网关和 CLI 共享的环境变量

| 变量 | 用途 | 必需 | 说明 |
|------|------|------|------|
| `CLAUDE_AI_SESSION_KEY` | Claude.ai 会话凭证 | ❌ | 用于使用 Claude AI 作为智能体后端 |
| `CLAUDE_WEB_SESSION_KEY` | Claude Web 会话凭证 | ❌ | 用于 Claude 网页版集成 |
| `CLAUDE_WEB_COOKIE` | Claude Web 访问令牌 | ❌ | 用于 Claude 网页版 Cookie 认证 |
| `OPENCLAW_GATEWAY_TOKEN` | 网关认证令牌 | ❌ | 由 `docker-setup.sh` 自动生成 |
| `OPENCLAW_GATEWAY_BIND` | 网关绑定地址 | ❌ | 默认：`lan`（局域网）；可设为 `0.0.0.0`（公开）或 `localhost` |
| `OPENCLAW_GATEWAY_PORT` | 网关监听端口 | ❌ | 默认：`18789` |
| `OPENCLAW_BRIDGE_PORT` | 桥接端口 | ❌ | 默认：`18790` |

#### 镜像和构建相关变量

| 变量 | 用途 | 说明 |
|------|------|------|
| `OPENCLAW_IMAGE` | Docker 镜像名称 | 默认：`openclaw-cn:local`；可设为预构建镜像如 `jiulingyun803/openclaw-cn:latest` |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 额外的 apt 包 | 在镜像构建期间安装（如 `ffmpeg build-essential`） |
| `OPENCLAW_EXTRA_MOUNTS` | 额外挂载点 | 逗号分隔的绑定挂载列表（如 `$HOME/.codex:/home/node/.codex:ro`) |
| `OPENCLAW_HOME_VOLUME` | 命名卷名称 | 用于持久化容器 `/home/node` 目录 |

#### 配置和工作目录

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `OPENCLAW_CONFIG_DIR` | 配置目录 | `~/.openclaw` |
| `OPENCLAW_WORKSPACE_DIR` | 工作区目录 | `~/clawd` |

**设置环境变量的方法：**

**方法 1：使用 `.env` 文件（推荐）**

在项目根目录创建 `.env` 文件：

```bash
# Claude 集成（可选）
CLAUDE_AI_SESSION_KEY=your_session_key_here
CLAUDE_WEB_SESSION_KEY=your_web_session_key_here
CLAUDE_WEB_COOKIE=your_cookie_here

# 网关配置
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_GATEWAY_BIND=lan

# 镜像配置
OPENCLAW_IMAGE=jiulingyun803/openclaw-cn:latest
```

然后运行 Docker Compose 命令时会自动读取这些变量。

**方法 2：直接导出环境变量**

```bash
export CLAUDE_AI_SESSION_KEY="your_key"
export OPENCLAW_GATEWAY_PORT="18789"
docker compose run --rm openclaw-cn-cli pairing list
```

**方法 3：在命令行指定**

```bash
docker compose run -e OPENCLAW_GATEWAY_PORT=18789 --rm openclaw-cn-cli status
```

#### 关于 Claude 环境变量的说明

这三个 Claude 相关变量是**可选的**：

- **何时需要**：如果你要使用 Claude AI 作为网关的智能体后端
- **何时不需要**：仅使用 Feishu、Telegram 等渠道集成时，可以忽略

如果这些变量未设置，Docker 会输出以下警告（**这是正常的**）：

```
time="..." level=warning msg="The \"CLAUDE_AI_SESSION_KEY\" variable is not set. Defaulting to a blank string."
time="..." level=warning msg="The \"CLAUDE_WEB_SESSION_KEY\" variable is not set. Defaulting to a blank string."
time="..." level=warning msg="The \"CLAUDE_WEB_COOKIE\" variable is not set. Defaulting to a blank string."
```

**这些警告不会影响渠道功能**，如 Feishu、Telegram、Discord 等。

### 额外挂载（可选）

如果您想将额外的主机目录挂载到容器中，在运行 `docker-setup.sh` 之前设置
`OPENCLAW_EXTRA_MOUNTS`。这接受逗号分隔的 Docker 绑定挂载列表，并通过生成
`docker-compose.extra.yml` 将它们应用到 `clawdbot-gateway` 和 `clawdbot-cli`。

示例：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 在 macOS/Windows 上，路径必须与 Docker Desktop 共享。
- 如果您编辑 `OPENCLAW_EXTRA_MOUNTS`，重新运行 `docker-setup.sh` 以重新生成额外的 compose 文件。
- `docker-compose.extra.yml` 是生成的。不要手动编辑它。

### 持久化整个容器 home（可选）

如果您希望 `/home/node` 在容器重建后持久化，通过 `OPENCLAW_HOME_VOLUME` 设置命名卷。
这会创建一个 Docker 卷并将其挂载到 `/home/node`，同时保留标准的配置/工作空间绑定挂载。
这里使用命名卷（不是绑定路径）；对于绑定挂载，使用 `OPENCLAW_EXTRA_MOUNTS`。

示例：

```bash
export OPENCLAW_HOME_VOLUME="clawdbot_home"
./docker-setup.sh
```

您可以将其与额外挂载结合：

```bash
export OPENCLAW_HOME_VOLUME="clawdbot_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 如果您更改 `OPENCLAW_HOME_VOLUME`，重新运行 `docker-setup.sh` 以重新生成额外的 compose 文件。
- 命名卷会持久化，直到使用 `docker volume rm <name>` 删除。

### 安装额外的 apt 包（可选）

如果您需要镜像内的系统包（例如，构建工具或媒体库），在运行 `docker-setup.sh` 之前
设置 `OPENCLAW_DOCKER_APT_PACKAGES`。这会在镜像构建期间安装这些包，因此即使容器被删除
它们也会持久化。

示例：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

注意：
- 这接受空格分隔的 apt 包名列表。
- 如果您更改 `OPENCLAW_DOCKER_APT_PACKAGES`，重新运行 `docker-setup.sh` 以重建镜像。

### 更快的重建（推荐）

要加速重建，调整 Dockerfile 顺序使依赖层被缓存。
这避免了除非锁文件更改否则重新运行 `pnpm install`：

```dockerfile
FROM node:22-bookworm

# 安装 Bun（构建脚本需要）
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# 除非包元数据更改否则缓存依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### CLI 服务

**服务名称**：`openclaw-cn-cli`

通过 Docker Compose 运行 CLI 命令进行配置、调试和管理：

```bash
# 查看所有可用命令
docker compose run --rm openclaw-cn-cli --help

# 交互式配置向导
docker compose run --rm openclaw-cn-cli onboard

# 查看当前配置
docker compose run --rm openclaw-cn-cli config get

# 列出待审批的配对请求
docker compose run --rm openclaw-cn-cli pairing list

# 批准飞书配对请求
docker compose run --rm openclaw-cn-cli pairing approve feishu <pairing_code>
```

### 渠道设置（可选）

使用 CLI 容器配置渠道，然后根据需要重启网关。

WhatsApp（QR）：
```bash
docker compose run --rm openclaw-cn-cli channels login
```

Telegram（机器人令牌）：
```bash
docker compose run --rm openclaw-cn-cli channels add --channel telegram --token "<token>"
```

Discord（机器人令牌）：
```bash
docker compose run --rm openclaw-cn-cli channels add --channel discord --token "<token>"
```

Feishu（飞书）：
```bash
# 使用引导向导设置
docker compose run --rm openclaw-cn-cli onboard

# 或直接配置
docker compose run --rm openclaw-cn-cli config set channels.feishu.accounts[].appId "<app_id>"
docker compose run --rm openclaw-cn-cli config set channels.feishu.accounts[].appSecret "<app_secret>"
```

文档：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)、[Feishu](/channels/feishu)

### 健康检查和调试

```bash
# 检查网关健康状态
docker compose exec openclaw-cn-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"

# 查看实时日志
docker compose logs -f openclaw-cn-gateway

# 查看 CLI 日志
docker compose logs -f openclaw-cn-cli

# 检查渠道状态
docker compose run --rm openclaw-cn-cli channels status

# 运行医生诊断
docker compose run --rm openclaw-cn-cli doctor
```

### 常用 CLI 命令参考

| 命令 | 说明 |
|------|------|
| `pairing list` | 列出待审批的配对请求 |
| `pairing approve <channel> <code>` | 批准配对请求 |
| `config get` | 查看当前配置 |
| `config set <key> <value>` | 设置配置值 |
| `config set gateway.controlUi.allowInsecureAuth true` | 允许 Web UI 不安全认证（见下文常见问题） |
| `channels status` | 查看所有渠道状态 |
| `channels login` | WhatsApp QR 登录 |
| `channels add --channel <name> --token <token>` | 添加新渠道 |
| `doctor` | 运行诊断检查 |
| `logs` | 查看网关日志 |
| `dashboard` | 打开控制面板 URL |

### E2E 冒烟测试（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### QR 导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 容器服务说明

本项目提供两个主要的 Docker Compose 服务：

| 服务 | 用途 | 命令 |
|------|------|------|
| `openclaw-cn-gateway` | 后台网关服务（持续运行） | `docker compose up -d openclaw-cn-gateway` |
| `openclaw-cn-cli` | 交互式 CLI 工具（一次性命令） | `docker compose run --rm openclaw-cn-cli <command>` |

### 注意

- 网关绑定默认为 `lan` 用于容器使用。
- 网关容器是会话的权威来源（`~/.openclaw/agents/<agentId>/sessions/`）。
- CLI 容器与网关共享配置目录（`~/.openclaw`），任何通过 CLI 进行的配置更改都会立即在网关中生效。

## 代理沙箱（主机网关 + Docker 工具）

深入了解：[沙箱](/gateway/sandboxing)

### 功能说明

当 `agents.defaults.sandbox` 启用时，**非主会话** 在 Docker 容器内运行工具。
网关保持在您的主机上，但工具执行是隔离的：
- scope：默认为 `"agent"`（每个代理一个容器 + 工作空间）
- scope：`"session"` 用于每会话隔离
- 每范围的工作空间文件夹挂载在 `/workspace`
- 可选的代理工作空间访问（`agents.defaults.sandbox.workspaceAccess`）
- 允许/拒绝工具策略（拒绝优先）
- 入站媒体被复制到活动沙箱工作空间（`media/inbound/*`）以便工具可以读取（使用 `workspaceAccess: "rw"` 时，这会落在代理工作空间中）

警告：`scope: "shared"` 禁用跨会话隔离。所有会话共享一个容器和一个工作空间。

### 每代理沙箱配置文件（多代理）

如果您使用多代理路由，每个代理可以覆盖沙箱 + 工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools`）。
这让您可以在一个网关中运行混合访问级别：
- 完全访问（个人代理）
- 只读工具 + 只读工作空间（家庭/工作代理）
- 无文件系统/shell 工具（公共代理）

详见 [多代理沙箱与工具](/multi-agent-sandbox-tools) 了解示例、优先级和故障排除。

### 默认行为

- 镜像：`clawdbot-sandbox:bookworm-slim`
- 每个代理一个容器
- 代理工作空间访问：`workspaceAccess: "none"`（默认）使用 `~/.openclaw/sandboxes`
  - `"ro"` 保持沙箱工作空间在 `/workspace` 并以只读方式挂载代理工作空间在 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以读写方式挂载代理工作空间在 `/workspace`
- 自动清理：空闲 > 24 小时 或 存在时间 > 7 天
- 网络：默认为 `none`（如需出站访问请明确启用）
- 默认允许：`exec`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- 默认拒绝：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`

### 启用沙箱

如果您计划在 `setupCommand` 中安装包，请注意：
- 默认 `docker.network` 是 `"none"`（无出站）。
- `readOnlyRoot: true` 阻止包安装。
- `user` 必须是 root 才能运行 `apt-get`（省略 `user` 或设置 `user: "0:0"`）。
Clawdbot 在 `setupCommand`（或 docker 配置）更改时自动重建容器，除非容器 **最近使用过**
（约 5 分钟内）。热容器会记录警告，带有确切的 `clawdbot sandbox recreate ...` 命令。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared（默认为 agent）
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "clawdbot-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "clawdbot-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"]
        },
        prune: {
          idleHours: 24, // 0 禁用空闲清理
          maxAgeDays: 7  // 0 禁用最大存在时间清理
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

加固选项位于 `agents.defaults.sandbox.docker` 下：
`network`、`user`、`pidsLimit`、`memory`、`memorySwap`、`cpus`、`ulimits`、
`seccompProfile`、`apparmorProfile`、`dns`、`extraHosts`。

多代理：通过 `agents.list[].sandbox.{docker,browser,prune}.*` 覆盖每个代理的
`agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时忽略）。

### 构建默认沙箱镜像

```bash
scripts/sandbox-setup.sh
```

这使用 `Dockerfile.sandbox` 构建 `clawdbot-sandbox:bookworm-slim`。

### 沙箱通用镜像（可选）
如果您想要带有通用构建工具（Node、Go、Rust 等）的沙箱镜像，构建通用镜像：

```bash
scripts/sandbox-common-setup.sh
```

这构建 `clawdbot-sandbox-common:bookworm-slim`。要使用它：

```json5
{
  agents: { defaults: { sandbox: { docker: { image: "clawdbot-sandbox-common:bookworm-slim" } } } }
}
```

### 沙箱浏览器镜像

要在沙箱内运行浏览器工具，构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这使用 `Dockerfile.sandbox-browser` 构建 `clawdbot-sandbox-browser:bookworm-slim`。
容器运行启用 CDP 的 Chromium 和可选的 noVNC 观察器（通过 Xvfb 实现有头模式）。

注意：
- 有头模式（Xvfb）比无头模式减少机器人封锁。
- 仍可通过设置 `agents.defaults.sandbox.browser.headless=true` 使用无头模式。
- 不需要完整桌面环境（GNOME）；Xvfb 提供显示。

使用配置：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true }
      }
    }
  }
}
```

自定义浏览器镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-clawdbot-browser" } }
    }
  }
}
```

启用后，代理会收到：
- 沙箱浏览器控制 URL（用于 `browser` 工具）
- noVNC URL（如果启用且 headless=false）

记住：如果您使用工具允许列表，添加 `browser`（并从拒绝中删除）否则工具仍被阻止。
清理规则（`agents.defaults.sandbox.prune`）也适用于浏览器容器。

### 自定义沙箱镜像

构建您自己的镜像并将配置指向它：

```bash
docker build -t my-clawdbot-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-clawdbot-sbx" } }
    }
  }
}
```

### 工具策略（允许/拒绝）

- `deny` 优先于 `allow`。
- 如果 `allow` 为空：所有工具（除了 deny）都可用。
- 如果 `allow` 非空：只有 `allow` 中的工具可用（减去 deny）。

### 清理策略

两个选项：
- `prune.idleHours`：移除 X 小时未使用的容器（0 = 禁用）

---

## 预构建 Docker 镜像

本项目现在提供官方的预构建 Docker 镜像，支持多架构部署。

### 支持的架构

预构建镜像支持以下架构：

- **linux/amd64** — Intel/AMD 64位处理器（大多数服务器和现代电脑）
- **linux/arm64** — ARM 64位处理器（Apple Silicon Mac、树莓派 4/5、华为云鲲鹏等）

Docker 会自动选择匹配你系统的镜像版本。

### 镜像标签

| 标签 | 说明 | 更新频率 |
|------|------|--------|
| `latest` | 最新稳定版本 | 每次推送到 `main` 分支 |
| `vX.Y.Z` | 特定版本 | 每次发布新版本标签 |
| `main-XXXXX` | 开发版本 | 每次提交到 `main` 分支 |

### 快速开始（使用预构建镜像）

最简单的方法是使用预构建镜像：

```bash
# 1. 使用官方预构建镜像
export OPENCLAW_IMAGE="jiulingyun803/openclaw-cn:latest"

# 2. 运行一键部署脚本
./docker-setup.sh

# 3. 在浏览器中打开 http://127.0.0.1:18789/
# 4. 复制并粘贴网关令牌到控制界面
```

### 手动运行预构建镜像

如果你希望更细致的控制，可以手动运行：

```bash
# 拉取镜像
docker pull jiulingyun803/openclaw-cn:latest

# 运行网关
docker run -d \
  --name openclaw-gateway \
  -p 18789:18789 \
  -e HOME=/home/node \
  -v ~/.openclaw:/home/node/.openclaw \
  -v ~/clawd:/home/node/clawd \
  jiulingyun803/openclaw-cn:latest \
  node dist/index.js gateway --bind 0.0.0.0 --port 18789
```

### 使用 Docker Compose

编辑 `.env` 文件：

```bash
OPENCLAW_IMAGE=jiulingyun803/openclaw-cn:latest
```

然后运行：

```bash
docker compose up -d openclaw-cn-gateway
```

### 构建和发布你自己的镜像

如果你想对预构建镜像进行自定义或发布到你自己的 Docker Hub 账户：

1. 确保你有 Docker Hub 账户
2. 按照 [Docker Hub 预构建镜像配置指南](/install/docker-hub-setup) 设置 GitHub Actions
3. GitHub Actions 会自动为你的每个推送和版本发布构建和推送多架构镜像

### 镜像大小和性能

- **镜像大小** — 约 500-600 MB（包含完整运行环境）
- **首次启动** — 第一次拉取镜像约需 2-5 分钟（取决于网络速度）
- **后续启动** — 使用本地缓存，启动时间 < 10 秒
- **内存占用** — 运行时约 100-200 MB

### 生产环境部署

对于生产环境，建议：

1. **使用特定版本标签** — 不要使用 `latest`，而是指定如 `v2026.1.31`
2. **启用容器重启策略** — `restart: unless-stopped`
3. **设置资源限制** — 限制 CPU 和内存
4. **启用日志轮转** — 防止日志文件过大
5. **监控容器健康** — 使用 `healthcheck` 指令

示例 docker-compose 生产配置：

```yaml
services:
  openclaw-gateway:
    image: jiulingyun803/openclaw-cn:v2026.1.31
    restart: unless-stopped
    ports:
      - "18789:18789"
    volumes:
      - ~/.openclaw:/home/node/.openclaw
      - ~/clawd:/home/node/clawd
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:18789/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 512M
        reservations:
          cpus: '1'
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 故障排查

#### 镜像拉取失败

```bash
# 检查镜像是否存在
docker pull jiulingyun803/openclaw-cn:latest

# 如果失败，检查仓库是否公开，或尝试本地构建
./docker-setup.sh
```

#### ARM64 兼容性问题

如果在 ARM64 系统（如树莓派）上遇到问题：

1. 确保 Docker 已更新到最新版本
2. 验证镜像拉取时自动选择了 ARM64 版本：
   ```bash
   docker inspect jiulingyun803/openclaw-cn:latest | grep -i architecture
   ```
3. 如果上述步骤不成功，使用本地构建：
   ```bash
   ./docker-setup.sh
   ```

#### 权限错误

如果遇到权限错误，确保当前用户被添加到 `docker` 组：

```bash
# 添加当前用户到 docker 组
sudo usermod -aG docker $USER

# 刷新组成员关系（重新登录或运行）
newgrp docker

# 验证
docker ps
```

### 更多信息

详见：
- [Docker Hub 预构建镜像配置指南](/install/docker-hub-setup)
- [Docker 官方文档](https://docs.docker.com/)
- [Clawdbot Docker 示例](https://github.com/jiulingyun/moltbot-cn)
- `prune.maxAgeDays`：移除超过 X 天的容器（0 = 禁用）

示例：
- 保留忙碌会话但限制生命周期：
  `idleHours: 24`，`maxAgeDays: 7`
- 永不清理：
  `idleHours: 0`，`maxAgeDays: 0`

### 安全说明

- 硬墙仅适用于 **工具**（exec/read/write/edit/apply_patch）。
- 仅主机工具如 browser/camera/canvas 默认被阻止。
- 在沙箱中允许 `browser` **会破坏隔离**（浏览器在主机上运行）。

## 常见问题（FAQ）

### Web UI 显示 "disconnected (1008): pairing required" 错误

#### 问题表现

在浏览器中访问 Web UI（`http://127.0.0.1:18789/?token=...`）时，收到错误：

```
disconnected (1008): pairing required
```

同时 Feishu、Telegram 等渠道能正常工作，表明网关运行正常。

#### 原因

Docker 中的 Web UI 连接采用不同的认证路径：

- **本地 npm 模式**：浏览器连接被识别为真正的本地连接 → 自动允许，跳过配对检查
- **Docker 模式**：即使是 127.0.0.1 的浏览器连接也被视为网络连接 → 需要显式配置允许 Web UI 不安全认证

这是因为 WebSocket 连接经过容器网络栈的处理，因此需要 `gateway.controlUi.allowInsecureAuth` 配置项来告诉网关允许基于令牌的 Web UI 认证。

#### 解决方案

启用 Web UI 不安全认证配置：

```bash
# 执行一次性配置命令
docker compose run --rm openclaw-cn-cli config set gateway.controlUi.allowInsecureAuth true

# 重启网关使配置生效
docker compose restart openclaw-cn-gateway

# 等待几秒钟，然后在浏览器中重新打开 Web UI
```

验证配置已保存：

```bash
cat ~/.openclaw/openclaw.json | grep -A 2 controlUi
```

应该看到：

```json
"controlUi": {
  "allowInsecureAuth": true
},
```

#### 为什么这很安全？

- `gateway.bind=loopback` 限制了网关只在本地访问
- 即使启用 `allowInsecureAuth`，仍然需要有效的网关令牌（`OPENCLAW_GATEWAY_TOKEN`）
- 令牌由 `docker-setup.sh` 自动生成并安全存储

#### 如果仍然不工作？

详见网关专题文档：[配对要求故障排除](/gateway/pairing-required-troubleshooting)

故障排除步骤：

1. **检查令牌**
   ```bash
   # 获取令牌
   cat ~/.openclaw/openclaw.json | grep -A 1 '"auth"'
   
   # 验证 Web UI URL 中包含正确的令牌
   # 格式: http://127.0.0.1:18789/?token=<token>
   ```

2. **查看网关日志**
   ```bash
   docker compose logs -f openclaw-cn-gateway | grep -i "control ui\|pairing"
   ```

3. **重新启动网关**
   ```bash
   docker compose restart openclaw-cn-gateway
   sleep 3
   docker compose logs openclaw-cn-gateway | tail -20
   ```

## 故障排除

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/jiulingyun/openclaw-cn/blob/main/scripts/sandbox-setup.sh) 构建或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：它会按需自动创建每个会话。
- 沙箱中的权限错误：将 `docker.user` 设置为与挂载的工作空间所有权匹配的 UID:GID（或 chown 工作空间文件夹）。
- 网关/CLI 容器权限错误（`EACCES: permission denied, mkdir '/home/node/.openclaw/...'`）：容器以 `node:node`（UID 1000）运行，宿主机挂载目录必须对 UID 1000 可写。运行 `mkdir -p ./data/.openclaw ./data/clawd && chown -R 1000:1000 ./data` 修复。
- 找不到自定义工具：Clawdbot 使用 `sh -lc`（登录 shell）运行命令，这会 source `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以在前面添加您的自定义工具路径（例如，`/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。
