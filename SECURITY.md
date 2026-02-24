# Security Policy

If you believe you've found a security issue in Clawdbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

## 部署假设

OpenClaw 安全指导假设：

- 运行 OpenClaw 的主机处于受信任的操作系统/管理员边界内。
- 任何能够修改 `~/.openclaw` 状态/配置（包括 `openclaw.json`）的人都被视为受信任的操作员。
- 由互不信任的人共享的单个 Gateway 是**不推荐的设置**。请为每个信任边界使用独立的 Gateway（或至少使用独立的操作系统用户/主机）。
- 经过身份验证的 Gateway 调用者被视为受信任的操作员。会话标识符（例如 `sessionKey`）是路由控制，而非每用户授权边界。

## Operational Guidance

For threat model + hardening guidance (including `clawdbot security audit --deep` and `--fix`), see:

- `https://docs.clawd.bot/gateway/security`

## Runtime Requirements

### Node.js Version

Clawdbot requires **Node.js 22.12.0 or later** (LTS). This version includes important security patches:

- CVE-2025-59466: async_hooks DoS vulnerability
- CVE-2026-21636: Permission model bypass vulnerability

Verify your Node.js version:

```bash
node --version  # Should be v22.12.0 or later
```

### Docker Security

When running Clawdbot in Docker:

1. The official image runs as a non-root user (`node`) for reduced attack surface
2. Use `--read-only` flag when possible for additional filesystem protection
3. Limit container capabilities with `--cap-drop=ALL`

Example secure Docker run:

```bash
docker run --read-only --cap-drop=ALL \
  -v clawdbot-data:/app/data \
  clawdbot/clawdbot:latest
```

## Security Scanning

This project uses `detect-secrets` for automated secret detection in CI/CD.
See `.detect-secrets.cfg` for configuration and `.secrets.baseline` for the baseline.

Run locally:

```bash
pip install detect-secrets==1.5.0
detect-secrets scan --baseline .secrets.baseline
```
