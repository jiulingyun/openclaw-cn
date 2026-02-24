# Security Policy

If you believe you've found a security issue in Clawdbot, please report it privately.

## Reporting

- Email: `steipete@gmail.com`
- What to include: reproduction steps, impact assessment, and (if possible) a minimal PoC.

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

## Gateway and Node trust concept

Clawdbot separates routing from execution, but both remain inside the same operator trust boundary:

- **Gateway** is the control plane. If a caller passes Gateway auth, they are treated as a trusted operator for that Gateway.
- **Node** is an execution extension of the Gateway. Pairing a node grants operator-level remote capability on that node.
- **Exec approvals** (allowlist/ask UI) are operator guardrails to reduce accidental command execution, not a multi-tenant authorization boundary.
- For untrusted-user isolation, split by trust boundary: separate gateways and separate OS users/hosts per boundary.
