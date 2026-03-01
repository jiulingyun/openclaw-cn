# Security Policy

If you believe you've found a security issue in Clawdbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

## Operational Guidance

For threat model + hardening guidance (including `clawdbot security audit --deep` and `--fix`), see:

- `https://docs.clawd.bot/gateway/security`

## Web 界面安全

Clawdbot 的 Web 界面（网关控制界面 + HTTP 端点）**默认仅供本地使用**；canvas 主机可在可信网络中使用，详见下文。

- 推荐：将网关保持在**回环地址**（`127.0.0.1` / `::1`）。
  - 配置项：`gateway.bind="loopback"`（默认值）。
  - CLI：`clawdbot gateway run --bind loopback`。
- Canvas 主机说明：网络可见的 canvas **是有意为之**，适用于可信节点场景（局域网/tailnet）。
  - 预期配置：非回环地址绑定 + 网关认证（token/password/trusted-proxy）+ 防火墙/tailnet 管控。
  - 预期路由：`/__clawdbot__/canvas/`、`/__clawdbot__/a2ui/`。
  - 此部署模式本身不构成安全漏洞。
- **不要**将其暴露到公共互联网（不要直接绑定 `0.0.0.0`，不要配置公共反向代理）。它未针对公共暴露进行加固。
- 如需远程访问，建议使用 SSH 隧道或 Tailscale serve/funnel（使网关仍绑定到回环地址），并启用强网关认证。
- 网关 HTTP 服务面包含 canvas 主机（`/__clawdbot__/canvas/`、`/__clawdbot__/a2ui/`）。请将 canvas 内容视为敏感/不可信内容，除非您充分了解风险，否则避免将其暴露到回环地址之外。

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
