---
summary: "使用 QMD 进行本地记忆语义搜索（安装、配置、验证）"
read_when:
  - 您想使用 QMD 替代内置记忆搜索
  - 您想在本地运行语义搜索而无需远程 API
  - 您想了解 QMD 的配置选项和工作原理
---

# QMD 记忆搜索

QMD 是一个本地语义搜索引擎，可以替代 Openclaw-CN 的内置记忆搜索后端。它在本地运行 GGUF 模型进行查询扩展、向量嵌入和重排序，**无需任何远程 API 密钥**。

相关文档：
- 记忆概念：[记忆](/concepts/memory)
- CLI 命令：[clawdbot memory](/cli/memory)

---

## 前置要求

- **Node.js 22+**
- **Bun**（用于安装 QMD）
- **磁盘空间**：约 2.5 GB（模型文件）
- **内存**：建议 4 GB 以上可用内存（加载 GGUF 模型）

---

## 安装

### 1. 安装 Bun

如果尚未安装 Bun：

```bash
# macOS / Linux
brew install oven-sh/bun/bun

# 或使用官方安装脚本
curl -fsSL https://bun.sh/install | bash
```

### 2. 安装 QMD

```bash
bun install -g https://github.com/tobi/qmd
```

安装完成后，确认 QMD 可用：

```bash
qmd --version
```

<Tip>
如果提示 `command not found`，需要将 Bun 的全局安装目录添加到 PATH：

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```
</Tip>

### 3. 预下载模型（推荐）

QMD 首次运行 `query` 命令时会自动从 HuggingFace 下载模型，但这可能需要较长时间。建议提前下载：

```bash
# 进入工作区目录
cd ~/.openclaw/workspace

# 初始化索引
qmd update

# 运行一次查询来触发模型下载
# 这会下载 query-expansion (~1.3 GB) 和 reranker (~640 MB)
qmd query "test" -c memory-root --json
```

<Note>
首次下载模型可能需要 10-60 分钟，取决于网络速度。模型缓存在 `~/.cache/qmd/models/` 目录下，后续启动只需几秒加载。
</Note>

#### 中国大陆用户

如果从 HuggingFace 下载速度慢，可以设置镜像：

```bash
export HF_ENDPOINT=https://hf-mirror.com
qmd query "test" -c memory-root --json
```

也可以将镜像配置写入 shell 配置文件：

```bash
echo 'export HF_ENDPOINT=https://hf-mirror.com' >> ~/.zshrc
source ~/.zshrc
```

---

## 配置 Openclaw-CN

### 启用 QMD 后端

```bash
openclaw-cn config set memory.backend qmd
```

### 配置作用域（推荐）

默认情况下，QMD 仅在**私聊**中启用搜索。如需在所有场景（包括群聊和 CLI）中使用：

```bash
openclaw-cn config set memory.qmd.scope.default allow
```

### 调整查询超时（按需）

默认查询超时为 4 秒。在低配设备（如 MacBook Air）上，模型加载和推理可能需要更长时间：

```bash
# 设置为 30 秒（推荐低配设备）
openclaw-cn config set memory.qmd.limits.timeoutMs 30000
```

### 完成后重启网关

```bash
# 配置修改后需重启网关才能生效
openclaw-cn gateway restart
```

### 完整配置示例

以下是 `~/.openclaw/openclaw.json` 中 memory 部分的完整配置示例：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      // QMD 可执行文件路径（默认使用 PATH 中的 qmd）
      command: "qmd",

      // 搜索模式：query（完整语义搜索）| search（BM25）| vsearch（向量搜索）
      searchMode: "query",

      // 是否包含默认记忆文件（MEMORY.md、memory.md、memory/**/*.md）
      includeDefaultMemory: true,

      // 额外索引路径
      paths: [
        { path: "~/notes", pattern: "**/*.md", name: "my-notes" }
      ],

      // 更新配置
      update: {
        interval: "5m",          // 自动更新间隔
        debounceMs: 15000,       // 防抖时间
        onBoot: true,            // 启动时自动更新索引
        waitForBootSync: false,  // 是否等待启动更新完成
        embedInterval: "60m",    // 嵌入向量更新间隔
        commandTimeoutMs: 30000, // collection 操作超时
        updateTimeoutMs: 120000, // 索引更新超时
        embedTimeoutMs: 120000   // 嵌入更新超时
      },

      // 查询限制
      limits: {
        maxResults: 6,           // 最大返回结果数
        maxSnippetChars: 700,    // 片段最大字符数
        maxInjectedChars: 4000,  // 注入上下文最大字符数
        timeoutMs: 30000         // 查询超时（毫秒）
      },

      // 作用域控制
      scope: {
        default: "allow",        // 默认策略：allow | deny
        rules: [
          // 可以按频道和聊天类型配置规则
          // { action: "allow", match: { chatType: "direct" } }
          // { action: "deny", match: { channel: "telegram", chatType: "group" } }
        ]
      },

      // 会话索引（实验性）
      sessions: {
        enabled: false,          // 是否索引会话记录
        retentionDays: 30        // 保留天数
      }
    }
  }
}
```

---

## 准备记忆文件

QMD 默认索引工作区（`~/.openclaw/workspace`）中的以下文件：

| Collection | 路径 | 匹配模式 |
|---|---|---|
| `memory-root` | `~/.openclaw/workspace/` | `MEMORY.md` |
| `memory-alt` | `~/.openclaw/workspace/` | `memory.md` |
| `memory-dir` | `~/.openclaw/workspace/memory/` | `**/*.md` |

确保工作区目录和记忆文件存在：

```bash
# 创建工作区（如果不存在）
mkdir -p ~/.openclaw/workspace/memory

# 创建一个测试记忆文件
cat > ~/.openclaw/workspace/MEMORY.md << 'EOF'
# 个人记忆

## 偏好
- 喜欢简洁的代码风格
- 倾向使用 TypeScript

## 项目笔记
- 当前在开发 Openclaw-CN 项目
EOF
```

---

## 验证

### 1. 检查 QMD 安装

```bash
which qmd && qmd --version
```

### 2. 检查索引状态

```bash
# 手动更新索引
cd ~/.openclaw/workspace && qmd update

# 查看状态
qmd status
```

预期输出应显示已注册的 collection 和已索引的文件数。

### 3. 直接测试 QMD 搜索

```bash
cd ~/.openclaw/workspace && qmd query "偏好" -c memory-root --json
```

预期输出为包含匹配结果的 JSON 数组，score 大于 0。

### 4. 通过 CLI 测试

```bash
openclaw-cn memory search "偏好"
```

预期输出类似：

```
0.930 MEMORY.md:1-5
# 个人记忆
## 偏好
- 喜欢简洁的代码风格
- 倾向使用 TypeScript
```

### 5. 检查记忆状态

```bash
openclaw-cn memory status
openclaw-cn memory status --deep
```

---

## 工作原理

### 搜索流程

当用户发起搜索时（通过 `memory_search` 工具或 `openclaw-cn memory search`），QMD 执行以下步骤：

1. **查询扩展**：使用本地 LLM（qwen3-0.6B）将查询扩展为多个搜索变体（同义词、关键词、假设文档）
2. **候选检索**：通过 BM25（关键词）和向量搜索（语义）检索候选文档
3. **重排序**：使用本地 reranker（qwen3-reranker-0.6b）对候选文档进行精确排序
4. **返回结果**：返回排名最高的文档片段

### 模型文件

QMD 使用以下 GGUF 模型（首次使用时自动下载）：

| 模型 | 用途 | 大小 |
|---|---|---|
| `embeddinggemma-300M-Q8_0` | 文本向量嵌入 | ~330 MB |
| `qmd-query-expansion-1.7B` | 查询扩展 | ~1.3 GB |
| `qwen3-reranker-0.6b-q8_0` | 结果重排序 | ~640 MB |

模型缓存路径：`~/.cache/qmd/models/`

### 索引隔离

网关运行时，QMD 使用隔离的 XDG 环境避免与其他进程冲突：

- 索引路径：`~/.openclaw/agents/main/qmd/xdg-cache/qmd/index.sqlite`
- 模型会通过 symlink 共享 `~/.cache/qmd/models/`，避免重复下载

---

## 常见问题

### 搜索返回空结果

- **检查索引**：运行 `cd ~/.openclaw/workspace && qmd status` 确认文件已索引
- **检查作用域**：确认 `memory.qmd.scope.default` 设置为 `allow`
- **检查超时**：如果日志显示 `timed out`，增大 `memory.qmd.limits.timeoutMs`

### 模型下载失败

- 检查网络连接
- 中国大陆用户设置 `HF_ENDPOINT=https://hf-mirror.com`
- 模型下载支持断点续传，失败后重试即可

### 搜索速度慢

- 首次查询需加载模型到内存，后续查询会显著加快
- 确保没有其他进程同时占用大量内存
- 低配设备可考虑使用 `searchMode: "search"`（仅 BM25，不使用 LLM）

### QMD 与内置搜索的区别

| 特性 | 内置搜索 | QMD |
|---|---|---|
| 依赖 | 无额外依赖 | 需安装 QMD + 下载模型 |
| API 密钥 | 需要嵌入提供商密钥 | 不需要 |
| 搜索质量 | BM25 + 向量（远程嵌入） | 查询扩展 + BM25 + 向量 + 重排序 |
| 离线可用 | 仅 BM25（无远程嵌入时） | 完全离线 |
| 磁盘占用 | 极小 | ~2.5 GB（模型） |
| 首次查询 | 快 | 较慢（加载模型） |

---

## 配置参考

### `memory.backend`

记忆搜索后端。设为 `"qmd"` 启用 QMD。

| 值 | 说明 |
|---|---|
| `"builtin"` | 默认内置搜索 |
| `"qmd"` | 使用 QMD 本地语义搜索 |

### `memory.qmd.command`

QMD 可执行文件路径。默认：`"qmd"`（从 PATH 查找）。

### `memory.qmd.searchMode`

搜索模式。默认：`"query"`。

| 值 | 说明 |
|---|---|
| `"query"` | 完整语义搜索（查询扩展 + BM25 + 向量 + 重排序） |
| `"search"` | 仅 BM25 关键词搜索 |
| `"vsearch"` | 仅向量搜索 |

### `memory.qmd.scope`

控制哪些聊天场景可以触发记忆搜索。

```json5
{
  default: "deny",  // 默认策略
  rules: [
    { action: "allow", match: { chatType: "direct" } },
    { action: "deny", match: { channel: "telegram", chatType: "group" } }
  ]
}
```

`match` 支持的字段：
- `chatType`：`"direct"` | `"group"` | `"channel"`
- `channel`：频道名称（如 `"telegram"`、`"feishu"`、`"slack"`）
- `keyPrefix`：会话键前缀匹配

### `memory.qmd.limits`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `maxResults` | `6` | 最大返回结果数 |
| `maxSnippetChars` | `700` | 每个结果片段最大字符数 |
| `maxInjectedChars` | `4000` | 注入上下文窗口的最大总字符数 |
| `timeoutMs` | `4000` | 查询超时（毫秒），低配设备建议设为 `30000` |

### `memory.qmd.update`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `interval` | `"5m"` | 自动更新索引间隔（支持 `s`/`m`/`h` 后缀） |
| `debounceMs` | `15000` | 文件变更后的防抖等待时间 |
| `onBoot` | `true` | 网关启动时自动更新索引 |
| `waitForBootSync` | `false` | 是否阻塞启动直到索引更新完成 |
| `embedInterval` | `"60m"` | 嵌入向量更新间隔 |
| `commandTimeoutMs` | `30000` | collection 操作超时 |
| `updateTimeoutMs` | `120000` | 索引更新超时 |
| `embedTimeoutMs` | `120000` | 嵌入更新超时 |

### `memory.qmd.paths`

添加额外的索引路径（除默认记忆文件外）：

```json5
paths: [
  { path: "~/notes", pattern: "**/*.md", name: "my-notes" },
  { path: "./docs", pattern: "*.md", name: "project-docs" }
]
```

- `path`：目录路径（绝对路径或相对于工作区）
- `pattern`：glob 匹配模式（默认 `**/*.md`）
- `name`：collection 名称（可选，自动生成）

### `memory.qmd.sessions`

实验性功能：索引会话记录。

| 字段 | 默认值 | 说明 |
|---|---|---|
| `enabled` | `false` | 是否启用 |
| `exportDir` | 自动 | 会话导出目录 |
| `retentionDays` | 无限制 | 保留天数 |
