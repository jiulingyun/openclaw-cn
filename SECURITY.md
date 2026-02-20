# Security Policy

If you believe you've found a security issue in Clawdbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

## Plugin Trust Boundary

Plugins/extensions are loaded **in-process** with the Gateway and are treated as trusted code.

- Plugins can execute with the same OS privileges as the OpenClaw process.
- Runtime helpers (for example `runtime.system.runCommandWithTimeout`) are convenience APIs, not a sandbox boundary.
- Only install plugins you trust, and prefer `plugins.allow` to pin explicit trusted plugin ids.

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
