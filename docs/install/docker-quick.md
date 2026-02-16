---
title: Docker 快速部署
description: 五分钟快速部署 Clawdbot 到 Docker
---

# Docker 快速部署指南

简单、快速、一键启动！选择适合你的方式部署。

## 前置要求

- **Docker Desktop**（Mac/Windows）或 **Docker Engine**（Linux）
- 足够的磁盘空间（约 1-2GB 用于镜像）
- 网络连接

## 方式一：一键脚本部署（推荐新手）

最简单的方式，一条命令搞定所有配置！

```bash
curl -fsSL https://clawd.org.cn/install.sh | bash
```

**这个脚本会自动：**
- ✅ 检查 Docker 环境
- ✅ 下载镜像
- ✅ 配置环境变量
- ✅ 启动容器
- ✅ 运行配置向导
- ✅ 生成网关令牌

完成后，在浏览器打开 `http://127.0.0.1:18789/` 即可使用。

**脚本后续操作：**
- 按照提示输入渠道信息（可选）
- 将生成的令牌复制到 Web UI 登录

---

## 方式二：手动 Docker Compose 部署（适合进阶用户）

如果一键脚本不适用，或需要自定义配置，按以下步骤操作。

### 步骤 1：创建工作目录

```bash
mkdir -p ~/openclaw-docker
cd ~/openclaw-docker
```

### 步骤 2：创建 `.env` 环境文件

将以下内容复制到 `.env` 文件：

```bash
# 镜像配置
OPENCLAW_IMAGE=jiulingyun803/openclaw-cn:latest

# 数据目录（相对于 docker-compose.yml 所在目录）
OPENCLAW_CONFIG_DIR=./data/.openclaw
OPENCLAW_WORKSPACE_DIR=./data/clawd

# 网关配置
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here

# Claude 集成（可选，仅使用 Claude 作为后端时填写）
CLAUDE_AI_SESSION_KEY=
CLAUDE_WEB_SESSION_KEY=
CLAUDE_WEB_COOKIE=
```

**快速创建：**
```bash
cat > .env << 'EOF'
OPENCLAW_IMAGE=jiulingyun803/openclaw-cn:latest
OPENCLAW_CONFIG_DIR=./data/.openclaw
OPENCLAW_WORKSPACE_DIR=./data/clawd
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=your-secure-token-here
CLAUDE_AI_SESSION_KEY=
CLAUDE_WEB_SESSION_KEY=
CLAUDE_WEB_COOKIE=
EOF
```

### 步骤 3：创建 `docker-compose.yml` 文件

将以下内容复制到 `docker-compose.yml`：

```yaml
services:
  openclaw-cn-gateway:
    image: ${OPENCLAW_IMAGE:-openclaw-cn:local}
    user: node:node
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
      CLAUDE_WEB_SESSION_KEY: ${CLAUDE_WEB_SESSION_KEY}
      CLAUDE_WEB_COOKIE: ${CLAUDE_WEB_COOKIE}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
    ports:
      - "${OPENCLAW_GATEWAY_PORT:-18789}:18789"
      - "${OPENCLAW_BRIDGE_PORT:-18790}:18790"
    init: true
    restart: unless-stopped
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND:-lan}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT:-18789}"
      ]

  openclaw-cn-cli:
    image: ${OPENCLAW_IMAGE:-openclaw-cn:local}
    user: node:node
    environment:
      HOME: /home/node
      TERM: xterm-256color
      BROWSER: echo
      CLAUDE_AI_SESSION_KEY: ${CLAUDE_AI_SESSION_KEY}
      CLAUDE_WEB_SESSION_KEY: ${CLAUDE_WEB_SESSION_KEY}
      CLAUDE_WEB_COOKIE: ${CLAUDE_WEB_COOKIE}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-./data/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-./data/clawd}:/home/node/clawd
    stdin_open: true
    tty: true
    init: true
    entrypoint: ["node", "dist/index.js"]
```

**快速创建：**
在命令行运行，文件会自动创建。

### 步骤 4：启动容器

```bash
# 拉取最新镜像
docker compose pull

# 启动网关（后台运行）
docker compose up -d openclaw-cn-gateway

# 查看日志（可选）
docker compose logs -f openclaw-cn-gateway
```

### 步骤 5：运行配置向导

```bash
docker compose run --rm openclaw-cn-cli onboard
```

**配置向导会提示你：**
- 选择网关后端（Claude、Gemini 等）
- 配置 Feishu、Telegram 等渠道
- 生成和保存配置

### 步骤 6：访问 Web UI

打开浏览器访问：
```
http://127.0.0.1:18789/
```

将配置向导生成的令牌复制到登录页面即可。

---

## 环境变量详解

| 变量 | 含义 | 默认值 | 必需 | 说明 |
|------|------|--------|------|------|
| `OPENCLAW_IMAGE` | Docker 镜像名称 | `openclaw-cn:local` | ❌ | 使用预构建镜像：`jiulingyun803/openclaw-cn:latest` 或 `jiulingyun803/openclaw-cn:vX.Y.Z` |
| `OPENCLAW_CONFIG_DIR` | 配置文件目录 | `~/.openclaw` | ❌ | Clawdbot 配置和凭证存储位置 |
| `OPENCLAW_WORKSPACE_DIR` | 工作空间目录 | `~/clawd` | ❌ | 代理工作文件存储位置 |
| `OPENCLAW_GATEWAY_PORT` | 网关端口号 | `18789` | ❌ | 访问 Web UI 的端口（如需修改，访问时用新端口） |
| `OPENCLAW_BRIDGE_PORT` | 桥接端口号 | `18790` | ❌ | 用于客户端连接的端口 |
| `OPENCLAW_GATEWAY_BIND` | 网关绑定地址 | `lan` | ❌ | `localhost`（仅本机）/ `lan`（局域网）/ `0.0.0.0`（公网可访问，⚠️ 谨慎使用） |
| `OPENCLAW_GATEWAY_TOKEN` | 网关认证令牌 | 自动生成 | ❌ | Web UI 登录令牌（可自定义或留空自动生成） |
| `CLAUDE_AI_SESSION_KEY` | Claude.ai 会话密钥 | 空 | ❌ | ⚠️ 仅使用 Claude AI 作为后端时填写，获取方式见 [Claude 登录指南](/docs/providers/claude) |
| `CLAUDE_WEB_SESSION_KEY` | Claude Web 会话密钥 | 空 | ❌ | ⚠️ 仅使用 Claude Web 版时填写 |
| `CLAUDE_WEB_COOKIE` | Claude Web Cookie | 空 | ❌ | ⚠️ 仅使用 Claude Web 版时填写 |

### 环境变量设置方式

**方式 A：编辑 `.env` 文件（推荐）**
```bash
# 编辑 .env 文件
nano .env

# docker compose 会自动读取
docker compose up -d
```

**方式 B：命令行设置**
```bash
export OPENCLAW_GATEWAY_PORT=18789
docker compose up -d
```

**方式 C：命令行临时覆盖**
```bash
docker compose -e OPENCLAW_GATEWAY_PORT=8080 up -d
```

---

## 常见操作

### 查看网关状态

```bash
# 检查容器是否运行
docker compose ps

# 查看网关日志
docker compose logs openclaw-cn-gateway

# 实时查看日志（持续跟踪）
docker compose logs -f openclaw-cn-gateway
```

### 配置渠道

通过 CLI 容器配置各类渠道：

**Telegram（需要机器人令牌）：**
```bash
docker compose run --rm openclaw-cn-cli channels add \
  --channel telegram \
  --token "YOUR_BOT_TOKEN"
```

**Discord（需要机器人令牌）：**
```bash
docker compose run --rm openclaw-cn-cli channels add \
  --channel discord \
  --token "YOUR_BOT_TOKEN"
```

**WhatsApp（QR 扫码）：**
```bash
docker compose run --rm openclaw-cn-cli channels login
```

**Feishu（需要 App ID 和 Secret）：**
```bash
docker compose run --rm openclaw-cn-cli onboard
# 按提示输入信息
```

### 重新配置

```bash
# 重新运行配置向导
docker compose run --rm openclaw-cn-cli onboard

# 查看当前配置
docker compose run --rm openclaw-cn-cli config get
```

### 重启网关

```bash
# 重启网关容器
docker compose restart openclaw-cn-gateway

# 停止网关
docker compose down

# 重新启动
docker compose up -d openclaw-cn-gateway
```

### 清理数据（谨慎操作）

```bash
# 停止并删除容器
docker compose down

# 删除本地数据目录
rm -rf ./data/

# 删除本地镜像（可选）
docker rmi jiulingyun803/openclaw-cn:latest
```

---

## 故障排查

### 问题 1：容器无法启动

**症状：** `docker compose up` 后容器立即退出

**解决：**
```bash
# 查看详细错误日志
docker compose logs openclaw-cn-gateway

# 检查端口是否被占用
sudo netstat -ltnp | grep 18789

# 如果被占用，修改 OPENCLAW_GATEWAY_PORT
# 编辑 .env，将端口改为其他（如 18790）
```

### 问题 2：权限拒绝（Permission Denied）

**症状：** `Error: EACCES: permission denied, mkdir '/home/node/.openclaw/...'`

**原因：** 容器以 `node:node`（UID 1000）用户运行，但宿主机上的数据目录可能由 root 创建，导致容器内的 node 用户没有写权限。

**解决：**
```bash
# 创建数据目录并设置正确的所有者（UID 1000 = 容器内 node 用户）
mkdir -p ./data/.openclaw ./data/clawd
chown -R 1000:1000 ./data
```

如果数据目录已存在但权限不对：
```bash
# 修复已有目录的权限
chown -R 1000:1000 ./data
```

> **说明：** `1000` 是官方 Node.js Docker 镜像中 `node` 用户的 UID/GID。`docker-compose.yml` 中 `user: node:node` 指定容器以该用户运行，因此宿主机挂载的目录必须对 UID 1000 可写。

### 问题 3：无法访问 Web UI

**症状：** 浏览器访问 `http://127.0.0.1:18789` 无响应

**解决：**
```bash
# 检查容器是否运行
docker compose ps

# 检查网关日志
docker compose logs openclaw-cn-gateway

# 验证端口是否正确
# 如果 OPENCLAW_GATEWAY_PORT=18789，则访问 :18789
# 如果改了端口，访问对应的新端口
```

### 问题 4：配置向导卡住

**症状：** `docker compose run --rm openclaw-cn-cli onboard` 无反应

**解决：**
```bash
# 按 Ctrl+C 中断

# 检查网关是否运行
docker compose logs openclaw-cn-gateway

# 重新启动网关并重试
docker compose restart openclaw-cn-gateway
docker compose run --rm openclaw-cn-cli onboard
```

---

## 从一键脚本迁移到手动配置

如果想从一键脚本切换到手动配置（或反之）：

```bash
# 停止现有容器
docker compose down

# 备份现有配置
cp -r ~/.openclaw ~/.openclaw.backup

# 更新 .env 和 docker-compose.yml

# 重新启动
docker compose up -d openclaw-cn-gateway
```

配置会自动保留在 `~/.openclaw/` 中，无需重新设置。

---

## 下一步

- **Feishu 集成**：[Feishu 配置指南](/channels/feishu)
- **Telegram 集成**：[Telegram 配置指南](/channels/telegram)
- **Discord 集成**：[Discord 配置指南](/channels/discord)
- **深入配置**：[完整配置文档](/configuration)
- **故障排查**：[诊断工具指南](/gateway/doctor)

---

## 获取帮助

- 遇到问题？运行诊断：
  ```bash
  docker compose run --rm openclaw-cn-cli doctor
  ```

- 查看所有可用命令：
  ```bash
  docker compose run --rm openclaw-cn-cli --help
  ```

- 提交 Issue：[GitHub Issues](https://github.com/jiulingyun/openclaw-cn/issues)
