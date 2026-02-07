---
summary: "Clawdbot 记忆系统的工作原理（工作区文件 + 自动记忆刷新）"
read_when:
  - 你想了解记忆文件的布局和工作流程
  - 你想调整自动压缩前的记忆刷新机制
---
# 记忆

Clawdbot 的记忆是**工作区中的纯 Markdown 文件**。这些文件是唯一的数据来源；模型只会"记住"写入磁盘的内容。

记忆搜索工具由当前激活的记忆插件提供（默认：`memory-core`）。可通过 `plugins.slots.memory = "none"` 禁用记忆插件。

## 记忆文件（Markdown）

默认的工作区布局使用两层记忆：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 会话开始时读取今天和昨天的日志。
- `MEMORY.md`（可选）
  - 精心整理的长期记忆。
  - **仅在主私人会话中加载**（不会在群组上下文中加载）。

这些文件位于工作区目录下（`agents.defaults.workspace`，默认为 `~/clawd`）。完整布局请参阅 [Agent 工作区](/concepts/agent-workspace)。

## 何时写入记忆

- 决策、偏好和持久性事实写入 `MEMORY.md`。
- 日常笔记和运行上下文写入 `memory/YYYY-MM-DD.md`。
- 如果有人说"记住这个"，就将其写入文件（不要仅保存在内存中）。
- 这个功能仍在不断完善中。提醒模型存储记忆会有所帮助；模型会知道该怎么做。
- 如果你希望某些内容被持久保存，**请让机器人将其写入**记忆文件。

## 自动记忆刷新（压缩前触发）

当会话**接近自动压缩**时，Clawdbot 会触发一个**静默的 Agent 轮次**，提醒模型在上下文被压缩**之前**写入持久记忆。默认提示词明确表示模型*可以回复*，但通常 `NO_REPLY` 是正确的响应，这样用户永远不会看到这个轮次。

此功能通过 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

详细说明：
- **软阈值**：当会话 token 估算值超过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- 默认为**静默**模式：提示词包含 `NO_REPLY`，不会向用户发送任何内容。
- **两段提示**：一个用户提示加一个系统提示共同附加提醒信息。
- **每个压缩周期仅刷新一次**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话以 `workspaceAccess: "ro"` 或 `"none"` 的沙盒模式运行，则跳过刷新。

完整的压缩生命周期请参阅[会话管理 + 压缩](/reference/session-management-compaction)。

## 向量记忆搜索

Clawdbot 可以在 `MEMORY.md` 和 `memory/*.md` 上构建小型向量索引，使语义查询即使在措辞不同时也能找到相关笔记。

默认配置：
- 默认启用。
- 监视记忆文件的变更（带防抖）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，Clawdbot 会自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 且文件存在，使用 `local`。
  2. 如果能解析到 OpenAI 密钥，使用 `openai`。
  3. 如果能解析到 Gemini 密钥，使用 `gemini`。
  4. 否则记忆搜索保持禁用状态，直到完成配置。
- 本地模式使用 node-llama-cpp，可能需要运行 `pnpm approve-builds`。
- 当 sqlite-vec 可用时，使用它加速 SQLite 中的向量搜索。

远程嵌入**需要**嵌入提供商的 API 密钥。Clawdbot 从认证配置、`models.providers.*.apiKey` 或环境变量中解析密钥。Codex OAuth 仅覆盖 chat/completions，**不满足**记忆搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。使用自定义 OpenAI 兼容端点时，请设置 `memorySearch.remote.apiKey`（以及可选的 `memorySearch.remote.headers`）。

### Gemini 嵌入（原生）

将提供商设置为 `gemini` 以直接使用 Gemini 嵌入 API：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

说明：
- `remote.baseUrl` 是可选的（默认为 Gemini API 基础 URL）。
- `remote.headers` 允许你在需要时添加额外的请求头。
- 默认模型：`gemini-embedding-001`。

如果你想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），可以使用 OpenAI 提供商的 `remote` 配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

如果你不想设置 API 密钥，请使用 `memorySearch.provider = "local"` 或设置 `memorySearch.fallback = "none"`。

回退机制：
- `memorySearch.fallback` 可以是 `openai`、`gemini`、`local` 或 `none`。
- 回退提供商仅在主嵌入提供商失败时使用。

批量索引（OpenAI + Gemini）：
- 对于 OpenAI 和 Gemini 嵌入，默认启用批量索引。设置 `agents.defaults.memorySearch.remote.batch.enabled = false` 可禁用。
- 默认行为会等待批处理完成；如需调整，请配置 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 控制并行提交的批处理作业数量（默认：2）。
- 批量模式在 `memorySearch.provider = "openai"` 或 `"gemini"` 时适用，并使用对应的 API 密钥。
- Gemini 批处理作业使用异步嵌入批处理端点，需要 Gemini Batch API 可用。

为什么 OpenAI 批处理既快又便宜：
- 对于大规模回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批处理作业中提交大量嵌入请求，让 OpenAI 异步处理。
- OpenAI 为 Batch API 工作负载提供折扣定价，因此大规模索引通常比同步发送相同请求更便宜。
- 详情请参阅 OpenAI Batch API 文档和定价：
  - https://platform.openai.com/docs/api-reference/batch
  - https://platform.openai.com/pricing

配置示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

工具：
- `memory_search` — 返回包含文件路径和行范围的片段。
- `memory_get` — 通过路径读取记忆文件内容。

本地模式：
- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 以避免远程回退。

### 记忆工具的工作原理

- `memory_search` 对来自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 块（目标约 400 token，80 token 重叠）进行语义搜索。返回片段文本（上限约 700 字符）、文件路径、行范围、评分、提供商/模型，以及是否从本地回退到了远程嵌入。不返回完整文件内容。
- `memory_get` 读取特定的记忆 Markdown 文件（工作区相对路径），可选从指定行开始读取 N 行。拒绝 `MEMORY.md` / `memory/` 之外的路径。
- 两个工具仅在 Agent 的 `memorySearch.enabled` 解析为 true 时启用。

### 索引内容（及时机）

- 文件类型：仅 Markdown（`MEMORY.md`、`memory/**/*.md`）。
- 索引存储：每个 Agent 的 SQLite 文件位于 `~/.openclaw/memory/<agentId>.sqlite`（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` 占位符）。
- 新鲜度：监视 `MEMORY.md` + `memory/` 的变更并标记索引为脏数据（防抖 1.5 秒）。同步在会话开始时、搜索时或按间隔调度，异步运行。会话记录使用增量阈值触发后台同步。
- 重建索引触发条件：索引存储嵌入的**提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一项发生变化，Clawdbot 会自动重置并重新索引整个存储。

### 混合搜索（BM25 + 向量）

启用后，Clawdbot 结合以下两种搜索方式：
- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确匹配 token，如 ID、环境变量、代码符号）

如果你的平台不支持全文搜索，Clawdbot 会回退到纯向量搜索。

#### 为什么使用混合搜索？

向量搜索擅长"这表达的是同一个意思"：
- "Mac Studio 网关主机" vs "运行网关的机器"
- "防抖文件更新" vs "避免每次写入都索引"

但对于精确的高信号 token，它可能表现较弱：
- ID（`a828e60`、`b3b9895a…`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（"sqlite-vec unavailable"）

BM25（全文搜索）恰好相反：精确 token 匹配能力强，释义匹配能力弱。混合搜索是务实的折中方案：**同时使用两种检索信号**，使"自然语言"查询和"大海捞针"查询都能获得良好的结果。

#### 如何合并结果（当前设计）

实现概述：

1) 从两端检索候选池：
- **向量**：按余弦相似度取前 `maxResults * candidateMultiplier` 个结果。
- **BM25**：按 FTS5 BM25 排名取前 `maxResults * candidateMultiplier` 个结果（排名值越低越好）。

2) 将 BM25 排名转换为 0..1 范围的评分：
- `textScore = 1 / (1 + max(0, bm25Rank))`

3) 按 chunk id 合并候选项并计算加权评分：
- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

说明：
- `vectorWeight` + `textWeight` 在配置解析时归一化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或提供商返回零向量），仍会运行 BM25 并返回关键词匹配结果。
- 如果无法创建 FTS5，则保持纯向量搜索（不会硬性失败）。

这并非"信息检索理论上的完美方案"，但它简单、快速，且在实际笔记上往往能提升召回率/精确率。如果将来需要更精细的方案，常见的下一步是倒数排名融合（RRF）或在混合前进行评分归一化（最小/最大值或 z-score）。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4
        }
      }
    }
  }
}
```

### 嵌入缓存

Clawdbot 可以在 SQLite 中缓存**块嵌入**，这样重建索引和频繁更新（尤其是会话记录）就不需要重新嵌入未更改的文本。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### 会话记忆搜索（实验性）

你可以选择索引**会话记录**并通过 `memory_search` 查询它们。此功能受实验性标志控制。

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

说明：
- 会话索引是**可选功能**（默认关闭）。
- 会话更新经过防抖处理，在超过增量阈值后**异步索引**（尽力而为）。
- `memory_search` 不会阻塞等待索引完成；在后台同步完成之前，结果可能略有滞后。
- 结果仍然只包含片段；`memory_get` 仍仅限于记忆文件。
- 会话索引按 Agent 隔离（仅索引该 Agent 的会话日志）。
- 会话日志存储在磁盘上（`~/.openclaw/agents/<agentId>/sessions/*.jsonl`）。任何具有文件系统访问权限的进程/用户都可以读取它们，因此磁盘访问即为信任边界。如需更严格的隔离，请在不同的操作系统用户或主机下运行 Agent。

增量阈值（以下为默认值）：

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL 行数
        }
      }
    }
  }
}
```

### SQLite 向量加速（sqlite-vec）

当 sqlite-vec 扩展可用时，Clawdbot 将嵌入存储在 SQLite 虚拟表（`vec0`）中，并在数据库内执行向量距离查询。这使搜索保持高速，无需将所有嵌入加载到 JS 中。

配置（可选）：

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

说明：
- `enabled` 默认为 true；禁用时，搜索回退到进程内的余弦相似度计算。
- 如果 sqlite-vec 扩展缺失或加载失败，Clawdbot 会记录错误并继续使用 JS 回退方案（无向量表）。
- `extensionPath` 覆盖内置的 sqlite-vec 路径（适用于自定义构建或非标准安装位置）。

### 本地嵌入自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 解析 `modelPath`；如果 GGUF 文件缺失，会**自动下载**到缓存目录（或 `local.modelCacheDir`（如果已设置）），然后加载。下载支持断点续传。
- **注意**：自动下载仅在显式设置 `provider: "local"` 时生效。默认的 `auto` 模式要求本地模型文件已存在，不会触发自动下载。如果你没有配置任何 API 密钥，且希望免费使用记忆搜索，请将 provider 显式设为 `"local"`。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后执行 `pnpm rebuild node-llama-cpp`。
- 回退：如果本地设置失败且 `memorySearch.fallback = "openai"`，将自动切换到远程嵌入（默认 `openai/text-embedding-3-small`，除非有覆盖配置），并记录原因。

### 自定义 OpenAI 兼容端点示例

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

说明：
- `remote.*` 的优先级高于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 请求头合并；冲突时 remote 优先。省略 `remote.headers` 则使用 OpenAI 默认值。
