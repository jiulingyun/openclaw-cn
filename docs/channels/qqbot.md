---
summary: "QQ 机器人支持状态、功能和配置"
read_when:
  - 您想要连接 QQ 机器人
  - 您正在配置 QQ 渠道
---

# QQ 机器人

状态：生产就绪，支持 QQ 私聊和群聊。使用 WebSocket 长连接模式接收消息。

---

## 快速开始

添加 QQ 渠道有两种方式：

### 方式一：通过安装向导添加（推荐）

如果您刚安装完 Openclaw，可以直接运行向导，根据提示添加 QQ：

```bash
openclaw-cn onboard
```

向导会引导您完成：

1. 安装社区版 QQ 插件
2. 输入 AppID 和 AppSecret
3. 启动网关

✅ **完成配置后**，您可以使用以下命令检查网关状态：

- `openclaw-cn gateway status` - 查看网关运行状态
- `openclaw-cn logs --follow` - 查看实时日志

### 方式二：通过命令行添加

如果您已经完成了初始安装，可以用以下命令添加 QQ 渠道：

```bash
openclaw-cn channels add
```

然后根据交互式提示选择 **QQ (社区版)**，按提示输入 AppID 和 AppSecret 即可。

✅ **完成配置后**，您可以使用以下命令管理网关：

- `openclaw-cn gateway status` - 查看网关运行状态
- `openclaw-cn gateway restart` - 重启网关以应用新配置
- `openclaw-cn logs --follow` - 查看实时日志

---

## 第一步：创建 QQ 机器人

### 在 Openclaw 机器人专区创建

访问 [QQ 机器人 Openclaw 专区](https://q.qq.com/qqbot/openclaw/index.html)，直接在专区内创建机器人。

> **提示**：在 Openclaw 专区创建的机器人已预置好所需配置，无需单独申请权限，是最简便的接入方式。

创建完成后，记录以下凭证：

- **AppID**：机器人应用 ID
- **AppSecret**：机器人密钥（即 clientSecret）

❗ **重要**：请妥善保管 AppSecret，不要分享给他人。

---

## 第二步：配置 Openclaw

### 通过向导配置（推荐）

运行以下命令，根据提示粘贴 AppID 和 AppSecret：

```bash
openclaw-cn channels add
```

选择 **QQ (社区版)**，然后依次输入：

1. **QQ 机器人 AppID**
2. **QQ 机器人 AppSecret（clientSecret）**

### 通过配置文件配置

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "qqbot": {
      "enabled": true,
      "appId": "你的 AppID",
      "clientSecret": "你的 AppSecret"
    }
  }
}
```

---

## 第三步：启动并测试

### 1. 启动网关

```bash
openclaw-cn gateway
```

### 2. 发送测试消息

在 QQ 中找到您创建的机器人，发送一条消息。

### 3. 配对授权

默认情况下，机器人会回复一个 **配对码**。您需要批准此代码：

```bash
openclaw-cn pairing approve qqbot <配对码>
```

批准后即可正常对话。

---

## 介绍

- **QQ 机器人渠道**：由网关管理的 QQ 机器人，通过社区版插件接入
- **确定性路由**：回复始终返回 QQ，模型不会选择渠道
- **会话隔离**：私聊共享主会话；群聊独立隔离
- **WebSocket 长连接**：无需公网 URL

---

## 访问控制

### 私聊访问

- **默认**：`dmPolicy: "pairing"`，陌生用户会收到配对码
- **批准配对**：
  ```bash
  openclaw-cn pairing list qqbot      # 查看待审批列表
  openclaw-cn pairing approve qqbot <CODE>  # 批准
  ```
- **白名单模式**：通过 `channels.qqbot.allowFrom` 配置允许的用户 ID

---

## 常用命令

| 命令      | 说明           |
| --------- | -------------- |
| `/status` | 查看机器人状态 |
| `/reset`  | 重置对话会话   |
| `/model`  | 查看/切换模型  |

## 网关管理命令

| 命令                          | 说明              |
| ----------------------------- | ----------------- |
| `openclaw-cn gateway status`  | 查看网关运行状态  |
| `openclaw-cn gateway install` | 安装/启动网关服务 |
| `openclaw-cn gateway stop`    | 停止网关服务      |
| `openclaw-cn gateway restart` | 重启网关服务      |
| `openclaw-cn logs --follow`   | 实时查看日志输出  |

---

## 故障排除

### 机器人收不到消息

1. 检查 AppID 和 AppSecret 是否填写正确
2. 检查网关是否正在运行：`openclaw-cn gateway status`
3. 查看实时日志：`openclaw-cn logs --follow`

### 机器人在群聊中不响应

1. 检查机器人是否已添加到群组
2. 查看日志：`openclaw-cn logs --follow`

### AppSecret 泄露怎么办

1. 在 QQ 开放平台重置 AppSecret
2. 更新配置文件中的 `clientSecret`
3. 重启网关：`openclaw-cn gateway restart`

---

## 完整配置示例

```json
{
  "channels": {
    "qqbot": {
      "enabled": true,
      "appId": "你的 AppID",
      "clientSecret": "你的 AppSecret",
      "dmPolicy": "pairing",
      "allowFrom": []
    }
  },
  "agents": {
    "defaults": {
      "workspace": "~/clawd"
    }
  }
}
```

---

## 配置参考

完整配置请参考：[网关配置](/gateway/configuration)

主要选项：

| 配置项                        | 说明                       | 默认值    |
| ----------------------------- | -------------------------- | --------- |
| `channels.qqbot.enabled`      | 启用/禁用渠道              | `true`    |
| `channels.qqbot.appId`        | 机器人 AppID               | -         |
| `channels.qqbot.clientSecret` | 机器人 AppSecret           | -         |
| `channels.qqbot.dmPolicy`     | 私聊策略                   | `pairing` |
| `channels.qqbot.allowFrom`    | 私聊白名单（用户 ID 列表） | -         |

---

## dmPolicy 策略说明

| 值            | 行为                                               |
| ------------- | -------------------------------------------------- |
| `"pairing"`   | **默认**。未知用户收到配对码，管理员批准后才能对话 |
| `"allowlist"` | 仅 `allowFrom` 列表中的用户可对话，其他静默忽略    |
| `"open"`      | 允许所有人对话（需在 allowFrom 中加 `"*"`）        |
| `"disabled"`  | 完全禁止私聊                                       |

---

## 支持的消息类型

### 接收

- ✅ 文本消息
- ✅ 图片
- ✅ 表情

### 发送

- ✅ 文本消息
- ✅ Markdown
- ✅ 图片
