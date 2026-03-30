---
summary: "技能包开发指南：目录结构、模块化文档、CLI 封装与 zip 打包要求"
read_when:
  - 创建新的技能包时
  - 设计多模块技能时
  - 打包和发布技能时
---
# 技能包开发

这篇文档说明如何为 OpenClaw/Claude code等Agent 开发一个可复用的技能包。重点不是技能加载原理，而是技能包本身应该如何组织，包括目录结构、主 `SKILL.md` 的写法、模块化文档拆分、CLI 封装，以及最终的 zip 打包规范。

## 推荐目录结构

一个技能包本质上是一个目录，目录里至少要有根级 `SKILL.md`，其余文件按需要补充。

```text
my-skill/
├── SKILL.md
├── README.md
├── .clawignore
├── references/
│   ├── getting-started.md
│   ├── commands.md
│   └── troubleshooting.md
├── examples/
│   └── demo-input.json
└── cli/
    ├── package.json
    └── index.js
```

各文件和目录建议分工如下：

- `SKILL.md`：必需。技能入口文件，负责 frontmatter 和主说明。
- `README.md`：可选。给人看的介绍文档，适合市场展示、仓库说明或维护者阅读。
- `.clawignore`：可选。用于排除缓存、构建产物、截图、日志、密钥文件等不应随技能发布的内容。
- `references/`：可选但强烈推荐。用于放详细模块文档、参数说明、工作流说明、错误处理和排障文档。
- `examples/`：可选。放少量示例输入输出，帮助模型和维护者理解接口。
- `cli/`：如果技能涉及自编程逻辑，建议作为标准位置存放 CLI 实现。

## 主 `SKILL.md` 文件头格式

主 `SKILL.md` 建议采用与成熟技能包一致的写法：前面是简短 frontmatter，后面是正文说明。

最小示例：

```markdown
---
name: my-awesome-skill
description: 一个通过本地 CLI 执行任务的示例技能包。
version: 1.0.0
icon: 🚀
---

# My Awesome Skill

当用户请求执行这个封装后的工作流时，使用这个技能。
```

下面这个示例更接近即梦 AI 这类模块化技能包的风格：

```markdown
---
name: sample-ops-toolkit
description: 通过打包 CLI 和模块化参考文档执行本地多步骤工作流。
version: 1.0.0
icon: 🛠
metadata:
  clawdbot:
    emoji: 🛠
    requires:
      bins:
        - node
    commands:
      job run: node {baseDir}/cli/index.js job run
      job status: node {baseDir}/cli/index.js job status
---

# Sample Ops Toolkit

执行某个命令前，先读取 `references/` 下对应模块文档。
```

字段建议：

- `name`：技能包的稳定标识，建议使用小写和短横线命名。
- `description`：技能被发现和命中的关键字段，必须明确说明“这个技能在什么场景下使用”。
- `version`：建议提供，方便后续分发和维护。
- `icon`：可选，但对技能展示页和市场页面有帮助。
- `metadata.clawdbot.requires`：声明运行依赖，例如 `node`、`uv` 或环境变量。
- `metadata.clawdbot.commands`：如果技能暴露 CLI 命令，建议在这里显式列出来。

## 主 `SKILL.md` 应该做索引，而不是塞满所有细节

对于大型项目或多模块技能，不建议把所有说明都堆进根级 `SKILL.md`。更合理的做法是让主 `SKILL.md` 只承担索引和分发职责。

推荐做法：

- 在主 `SKILL.md` 里写清楚技能用途、约束、依赖、模块入口和总命令索引。
- 把每个子模块的详细说明放进 `references/` 目录。
- 在主 `SKILL.md` 中明确要求代理在执行某个模块前先读取对应模块文档。

这样做的好处：

- 主提示更短，减少无关上下文
- 维护时不会把不同模块逻辑混在一起
- 新增模块时只需要补充对应文档，不必频繁膨胀根文件

## 大型技能建议模块化

如果一个技能涉及多个业务能力，应当把它当成一个小型产品来组织，而不是一个单文件 prompt。

示例：

```text
travel-assistant/
├── SKILL.md
├── references/
│   ├── flights.md
│   ├── hotels.md
│   ├── visas.md
│   └── support.md
└── cli/
    └── index.js
```

主 `SKILL.md` 可以写成这样的索引风格：

```markdown
# Travel Assistant

执行前先读取对应模块文档：

- 航班查询和预订流程 -> `references/flights.md`
- 酒店查询和预订流程 -> `references/hotels.md`
- 签证材料检查流程 -> `references/visas.md`
- 异常处理和人工兜底 -> `references/support.md`
```

以下场景尤其适合模块化：

- 一个技能有多个独立业务能力
- 一个技能接了多个外部服务
- 参数很多、执行模式很多
- 技能由多人维护

## 如果涉及自编程，必须封装成 CLI

如果技能里需要写自定义代码，不要把逻辑散落成临时脚本然后在说明里东拼西凑。应当把所有自编程操作统一封装成 CLI。

强制要求：

- 只要涉及自编程，所有操作都要通过 CLI 暴露

推荐技术选型：

- Node 项目使用 `npm`、`pnpm` 或等价的 Node 包管理方式
- Python 项目使用 `uv`
- 命令入口保持稳定，例如 `node {baseDir}/cli/index.js ...` 或 `uv run my-skill ...`

为什么要这样做：

- 接口清晰，代理调用方式稳定
- 命令可以脱离代理独立测试
- 参数、退出码和输出格式更容易规范化
- 后续打包、安装和排障都更简单

### Node CLI 示例

```text
weather-tool/
├── SKILL.md
└── cli/
    ├── package.json
    └── index.js
```

`cli/package.json`：

```json
{
  "name": "weather-tool-cli",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js"
  }
}
```

`cli/index.js`：

```js
#!/usr/bin/env node

const [, , moduleName, action, ...args] = process.argv;

if (moduleName === 'forecast' && action === 'city') {
  const city = args.join(' ').trim();
  if (!city) {
    console.error('Usage: node index.js forecast city <city-name>');
    process.exit(1);
  }

  console.log(JSON.stringify({ city, status: 'ok' }, null, 2));
  process.exit(0);
}

console.error('Unknown command');
process.exit(1);
```

对应的 `SKILL.md` 命令映射：

```yaml
metadata:
  clawdbot:
    commands:
      forecast city: node {baseDir}/cli/index.js forecast city
```

### Python CLI 示例（使用 `uv`）

```text
csv-tool/
├── SKILL.md
└── cli/
    ├── pyproject.toml
    └── src/csv_tool/main.py
```

`pyproject.toml`：

```toml
[project]
name = "csv-tool"
version = "0.1.0"
requires-python = ">=3.11"

[project.scripts]
csv-tool = "csv_tool.main:main"
```

在技能里建议这样调用：

```yaml
metadata:
  clawdbot:
    commands:
      csv validate: uv run csv-tool validate
```

## 一个简单技能包示例

目录：

```text
hello-ops/
├── SKILL.md
├── references/
│   └── usage.md
└── cli/
    ├── package.json
    └── index.js
```

示例 `SKILL.md`：

```markdown
---
name: hello-ops
description: 通过打包的 Node CLI 执行一个简单示例工作流。
version: 1.0.0
icon: 👋
metadata:
  clawdbot:
    requires:
      bins:
        - node
    commands:
      hello run: node {baseDir}/cli/index.js hello run
---

# Hello Ops

当用户请求 hello 工作流时使用这个技能。

执行规则：

- 先读取 `references/usage.md`
- 默认动作使用 `hello run`
```

示例 `references/usage.md`：

```markdown
# Usage

Command: `hello run`

Behavior:

- 输出结构化成功结果
- 成功时退出码为 `0`
- 输入非法时退出非零退出码
```

示例 `cli/index.js`：

```js
#!/usr/bin/env node

const [, , group, command] = process.argv;

if (group === 'hello' && command === 'run') {
  console.log(JSON.stringify({ message: 'hello from the packaged CLI' }, null, 2));
  process.exit(0);
}

console.error('Unknown command');
process.exit(1);
```

## zip 打包规范

技能包最终如果要作为 zip 分发，不要把文件直接打在压缩包根目录。

强制要求：

- zip 文件中必须先有一个目录
- 技能包所有文件都必须放在这个目录里面

正确示例：

```text
hello-ops.zip
└── hello-ops/
    ├── SKILL.md
    ├── README.md
    ├── references/
    └── cli/
```

错误示例：

```text
hello-ops.zip
├── SKILL.md
├── README.md
├── references/
└── cli/
```

这样要求的原因很直接：

- 解压路径稳定，不会把多个技能包文件混到一起
- 安装器更容易定位技能根目录
- 用户手动解压时不容易污染目标目录

## 发布前检查清单

- 根目录存在 `SKILL.md`
- frontmatter 字段完整且描述清晰
- 自编程逻辑全部通过 CLI 暴露
- 大型技能已经把详细说明拆到 `references/`
- `.clawignore` 已排除缓存、日志、密钥和临时文件
- 产出的 zip 只有一个顶层技能目录

## 发布前测试建议

在发布技能包之前，至少做这些检查：

- 直接运行 CLI，确认退出码正确
- 检查所有 `{baseDir}` 路径引用都真实存在
- 至少验证一个正常路径和一个失败路径
- 确认 `node`、`uv` 等运行时依赖已经声明在元数据中
- 在干净目录里解压 zip，确认结构仍然符合要求
