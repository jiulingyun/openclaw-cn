---
summary: "浏览器控制服务器 + 自动化命令"
read_when:
  - 您想让 AI 助手自动操控浏览器
  - 您需要调试浏览器自动化问题
  - 您想了解浏览器配置和生命周期
---

# 浏览器自动化

Openclaw 可以运行一个**独立的 Chrome/Brave/Edge 浏览器配置文件**，由 AI 助手控制。这个浏览器与您的日常浏览器完全隔离。

**简单理解：**

- 这是一个**专门给 AI 用的浏览器**，不会影响您的个人浏览器
- AI 可以**打开网页、点击、输入、截图**
- 默认配置文件名为 `clawd`（橙色标识）

## 功能特点

- 独立的浏览器配置文件（不影响您的日常浏览）
- 标签页管理（打开/关闭/切换）
- 自动化操作（点击/输入/拖拽/选择）
- 页面快照、截图、PDF 导出
- 支持多配置文件（`clawd`、`work`、`remote` 等）

---

## 快速开始

```bash
# 查看浏览器状态
openclaw-cn browser status

# 启动浏览器
openclaw-cn browser start

# 打开网页
openclaw-cn browser open https://example.com

# 获取页面快照
openclaw-cn browser snapshot
```

如果提示 "Browser disabled"，请在配置中启用浏览器并重启网关。

---

## 配置文件类型

| 配置文件 | 说明                                         |
| -------- | -------------------------------------------- |
| `clawd`  | 独立管理的浏览器（无需扩展）                 |
| `chrome` | 通过扩展连接您的**系统浏览器**（需安装扩展） |

如果您希望默认使用独立浏览器，设置 `browser.defaultProfile: "clawd"`。

## 配置说明

配置文件位于 `~/.openclaw/openclaw.json`。

**基础配置示例：**

```json5
{
  browser: {
    enabled: true, // 启用浏览器控制
    defaultProfile: "clawd", // 默认使用独立浏览器
    headless: false, // 显示浏览器窗口（调试时建议开启）
    color: "#FF4500", // 浏览器 UI 颜色标识
  },
}
```

**完整配置示例（高级用户）：**

```json5
{
  browser: {
    enabled: true,
    controlUrl: "http://127.0.0.1:18791",
    cdpUrl: "http://127.0.0.1:18792",
    defaultProfile: "clawd",
    color: "#FF4500",
    headless: false,
    noSandbox: false, // Linux 可能需要设为 true
    attachOnly: false, // 仅附加到已运行的浏览器
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    profiles: {
      clawd: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
    },
  },
}
```

### 配置字段说明

| 字段             | 说明                       | 默认值    |
| ---------------- | -------------------------- | --------- |
| `enabled`        | 启用浏览器控制             | `true`    |
| `defaultProfile` | 默认配置文件               | `chrome`  |
| `headless`       | 无头模式（不显示窗口）     | `false`   |
| `noSandbox`      | 禁用沙箱（Linux 可能需要） | `false`   |
| `executablePath` | 浏览器可执行文件路径       | 自动检测  |
| `color`          | UI 颜色标识                | `#FF4500` |

---

## 指定浏览器

如果您的系统默认浏览器是 Chrome/Brave/Edge，Openclaw 会自动检测。您也可以手动指定：

**通过命令行设置：**

```bash
openclaw-cn config set browser.executablePath "/usr/bin/google-chrome"
```

**各平台配置示例：**

```json5
// macOS - Chrome
{ browser: { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" } }

// macOS - Brave
{ browser: { executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" } }

// Windows
{ browser: { executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" } }

// Linux
{ browser: { executablePath: "/usr/bin/google-chrome" } }
```

**自动检测顺序：** Chrome → Brave → Edge → Chromium → Chrome Canary

---

## 多配置文件支持

Openclaw 支持多个命名的浏览器配置文件：

| 类型         | 说明                                 |
| ------------ | ------------------------------------ |
| **独立管理** | 专用浏览器实例，有独立的用户数据目录 |
| **远程 CDP** | 连接到其他机器上的浏览器             |
| **扩展中继** | 通过 Chrome 扩展控制现有标签页       |

**默认配置文件：**

- `clawd` - 独立管理的浏览器（自动创建）
- `chrome` - Chrome 扩展中继（内置）

**使用指定配置文件：**

```bash
openclaw-cn browser --browser-profile work start
openclaw-cn browser --browser-profile work open https://example.com
```

---

## Chrome 扩展中继（控制现有标签页）

Openclaw 还可以通过 Chrome 扩展控制您**现有的 Chrome 标签页**（而不是启动独立浏览器）。

详细指南：[Chrome 扩展](/tools/chrome-extension)

**快速设置：**

1. 安装扩展：

```bash
openclaw-cn browser extension install
```

2. 加载到 Chrome：
   - 打开 `chrome://extensions`
   - 启用“开发者模式”
   - 点击“加载已解压的扩展程序”
   - 选择 `openclaw-cn browser extension path` 输出的目录

3. 使用：
   - 固定扩展图标，点击即可附加到当前标签页（图标显示 `ON`）
   - 再次点击分离

---

## 隔离保证

- **独立用户数据目录**：不会触碰您的个人浏览器配置文件
- **独立端口**：避免与开发工作流冲突（不使用 9222 端口）
- **确定性标签页控制**：通过 targetId 精确定位标签页

---

## 浏览器选择

本地启动时，Openclaw 按以下顺序选择：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

各平台搜索位置：

- **macOS**：`/Applications` 和 `~/Applications`
- **Linux**：`google-chrome`、`brave`、`microsoft-edge`、`chromium` 等
- **Windows**：常见安装位置

---

## CLI 命令参考

所有命令都支持 `--browser-profile <名称>` 指定配置文件，`--json` 输出 JSON 格式。

### 基础操作

```bash
# 浏览器状态
openclaw-cn browser status
openclaw-cn browser start
openclaw-cn browser stop

# 标签页管理
openclaw-cn browser tabs              # 列出所有标签页
openclaw-cn browser tab new           # 新建标签页
openclaw-cn browser tab select 2      # 选择第 2 个标签页
openclaw-cn browser tab close 2       # 关闭第 2 个标签页
openclaw-cn browser open https://example.com  # 打开网址
```

To persist browser downloads, set `PLAYWRIGHT_BROWSERS_PATH` (for example,
`/home/node/.cache/ms-playwright`) and make sure `/home/node` is persisted via
`OPENCLAW_HOME_VOLUME` or a bind mount. See [Docker](/install/docker).

## How it works (internal)

High-level flow:

- A small **control server** accepts HTTP requests.
- It connects to Chromium-based browsers (Chrome/Brave/Edge/Chromium) via **CDP**.
- For advanced actions (click/type/snapshot/PDF), it uses **Playwright** on top
  of CDP.
- When Playwright is missing, only non-Playwright operations are available.

This design keeps the agent on a stable, deterministic interface while letting
you swap local/remote browsers and profiles.

## CLI quick reference

All commands accept `--browser-profile <name>` to target a specific profile.
All commands also accept `--json` for machine-readable output (stable payloads).

Basics:

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

Inspection:

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

Actions:

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

State:

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

Notes:

- `upload` and `dialog` are **arming** calls; run them before the click/press
  that triggers the chooser/dialog.
- Download and trace output paths are constrained to OpenClaw temp roots:
  - traces: `/tmp/openclaw` (fallback: `${os.tmpdir()}/openclaw`)
  - downloads: `/tmp/openclaw/downloads` (fallback: `${os.tmpdir()}/openclaw/downloads`)
- Upload paths are constrained to an OpenClaw temp uploads root:
  - uploads: `/tmp/openclaw/uploads` (fallback: `${os.tmpdir()}/openclaw/uploads`)
- `upload` can also set file inputs directly via `--input-ref` or `--element`.
- `snapshot`:
  - `--format ai` (default when Playwright is installed): returns an AI snapshot with numeric refs (`aria-ref="<n>"`).
  - `--format aria`: returns the accessibility tree (no refs; inspection only).
  - `--efficient` (or `--mode efficient`): compact role snapshot preset (interactive + compact + depth + lower maxChars).
  - Config default (tool/CLI only): set `browser.snapshotDefaults.mode: "efficient"` to use efficient snapshots when the caller does not pass a mode (see [Gateway configuration](/gateway/configuration#browser-openclaw-managed-browser)).
  - Role snapshot options (`--interactive`, `--compact`, `--depth`, `--selector`) force a role-based snapshot with refs like `ref=e12`.
  - `--frame "<iframe selector>"` scopes role snapshots to an iframe (pairs with role refs like `e12`).
  - `--interactive` outputs a flat, easy-to-pick list of interactive elements (best for driving actions).
  - `--labels` adds a viewport-only screenshot with overlayed ref labels (prints `MEDIA:<path>`).
- `click`/`type`/etc require a `ref` from `snapshot` (either numeric `12` or role ref `e12`).
  CSS selectors are intentionally not supported for actions.

## Snapshots and refs

OpenClaw supports two “snapshot” styles:

- **AI snapshot (numeric refs)**: `openclaw browser snapshot` (default; `--format ai`)
  - Output: a text snapshot that includes numeric refs.
  - Actions: `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - Internally, the ref is resolved via Playwright’s `aria-ref`.

- **Role snapshot (role refs like `e12`)**: `openclaw browser snapshot --interactive` (or `--compact`, `--depth`, `--selector`, `--frame`)
  - Output: a role-based list/tree with `[ref=e12]` (and optional `[nth=1]`).
  - Actions: `openclaw browser click e12`, `openclaw browser highlight e12`.
  - Internally, the ref is resolved via `getByRole(...)` (plus `nth()` for duplicates).
  - Add `--labels` to include a viewport screenshot with overlayed `e12` labels.

Ref behavior:

- Refs are **not stable across navigations**; if something fails, re-run `snapshot` and use a fresh ref.
- If the role snapshot was taken with `--frame`, role refs are scoped to that iframe until the next role snapshot.

## Wait power-ups

You can wait on more than just time/text:

- Wait for URL (globs supported by Playwright):
  - `openclaw browser wait --url "**/dash"`
- Wait for load state:
  - `openclaw browser wait --load networkidle`
- Wait for a JS predicate:
  - `openclaw browser wait --fn "window.ready===true"`
- Wait for a selector to become visible:
  - `openclaw browser wait "#main"`

These can be combined:

### 页面检查

```bash
# 截图
openclaw-cn browser screenshot              # 当前视窗
openclaw-cn browser screenshot --full-page  # 整页截图
openclaw-cn browser screenshot --ref 12     # 元素截图

# 页面快照
openclaw-cn browser snapshot                # AI 快照
openclaw-cn browser snapshot --interactive  # 交互元素列表
openclaw-cn browser snapshot --efficient    # 精简模式

# 调试信息
openclaw-cn browser console --level error   # 控制台错误
openclaw-cn browser errors --clear          # 页面错误
openclaw-cn browser requests --filter api   # 网络请求
openclaw-cn browser pdf                     # 导出 PDF
```

### 页面操作

```bash
# 导航
openclaw-cn browser navigate https://example.com
openclaw-cn browser resize 1280 720

# 交互（需先获取 snapshot 中的 ref）
openclaw-cn browser click 12              # 点击元素
openclaw-cn browser click 12 --double     # 双击
openclaw-cn browser type 23 "你好"        # 输入文本
openclaw-cn browser type 23 "你好" --submit  # 输入并提交
openclaw-cn browser press Enter           # 按键
openclaw-cn browser hover 44              # 悬停
openclaw-cn browser select 9 "选项A"      # 选择下拉框

# 等待
openclaw-cn browser wait --text "完成"    # 等待文本出现
openclaw-cn browser wait "#main"          # 等待元素可见
openclaw-cn browser wait --load networkidle  # 等待网络空闲

# 文件
openclaw-cn browser upload /tmp/file.pdf  # 上传文件
openclaw-cn browser download e12 /tmp/report.pdf  # 下载
```

### 状态管理

```bash
# Cookies
openclaw-cn browser cookies               # 查看 cookies
openclaw-cn browser cookies clear         # 清除 cookies

# 本地存储
openclaw-cn browser storage local get
openclaw-cn browser storage local set theme dark
openclaw-cn browser storage local clear

# 环境设置
openclaw-cn browser set offline on        # 离线模式
openclaw-cn browser set media dark        # 深色模式
openclaw-cn browser set timezone Asia/Shanghai  # 时区
openclaw-cn browser set locale zh-CN      # 语言
openclaw-cn browser set device "iPhone 14"  # 设备模拟
```

---

## 快照和引用 (ref)

Openclaw 支持两种快照模式：

| 模式     | 命令                     | 引用格式     | 适用场景          |
| -------- | ------------------------ | ------------ | ----------------- |
| AI 快照  | `snapshot`               | `12`（数字） | 默认，AI 助手使用 |
| 角色快照 | `snapshot --interactive` | `e12`        | 交互元素列表      |

**使用流程：**

1. 获取快照：`openclaw-cn browser snapshot`
2. 找到目标元素的 ref
3. 执行操作：`openclaw-cn browser click 12`

**注意：** ref 在页面导航后会失效，需要重新获取快照。

---

## 调试技巧

当操作失败时（如“元素不可见”、“被遮挡”）：

1. 获取交互元素列表：`openclaw-cn browser snapshot --interactive`
2. 高亮显示目标元素：`openclaw-cn browser highlight e12`
3. 查看页面错误：`openclaw-cn browser errors --clear`
4. 查看网络请求：`openclaw-cn browser requests --filter api`
5. 录制跟踪：
   ```bash
   openclaw-cn browser trace start
   # 重现问题
   openclaw-cn browser trace stop  # 输出跟踪文件路径
   ```

---

## 安全与隐私

- 浏览器配置文件可能包含登录会话，请妥善保管
- 登录和反机器人检测说明请参考 [浏览器登录](/tools/browser-login)
- 控制 URL 应保持本地访问，除非您有意暴露
- 浏览器导航/打开标签页在导航前受 SSRF 保护，并在导航后对最终 `http(s)` URL 进行尽力复查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认为 `true`（可信网络模式）。设为 `false` 可启用严格公网模式。
- `browser.ssrfPolicy.allowPrivateNetwork` 作为向后兼容别名继续支持。

Strict-mode 示例（默认阻止私有/内网目标）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // 可选精确放行
    },
  },
}
```

---

## 故障排除

Linux 特有问题（尤其是 snap 版 Chromium），请参考
[浏览器故障排除（Linux）](/tools/browser-linux-troubleshooting)。

---

## 相关文档

- [Chrome 扩展](/tools/chrome-extension) - 控制现有 Chrome 标签页
- [浏览器登录](/tools/browser-login) - 网站登录和 X/Twitter 发帖
- [浏览器故障排除（Linux）](/tools/browser-linux-troubleshooting) - Linux 问题解决
