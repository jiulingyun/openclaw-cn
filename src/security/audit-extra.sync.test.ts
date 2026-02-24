import { describe, expect, it } from "vitest";
import type { ClawdbotConfig } from "../config/config.js";
import {
  collectAttackSurfaceSummaryFindings,
  collectNodeDangerousAllowCommandFindings,
} from "./audit-extra.sync.js";

describe("collectAttackSurfaceSummaryFindings", () => {
  it("distinguishes external webhooks from internal hooks when only internal hooks are enabled", () => {
    const cfg: ClawdbotConfig = {
      hooks: { internal: { enabled: true } },
    };

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.checkId).toBe("summary.attack_surface");
    expect(finding.detail).toContain("hooks.webhooks: disabled");
    expect(finding.detail).toContain("hooks.internal: enabled");
  });

  it("reports both hook systems as enabled when both are configured", () => {
    const cfg: ClawdbotConfig = {
      hooks: { enabled: true, internal: { enabled: true } },
    };

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.detail).toContain("hooks.webhooks: enabled");
    expect(finding.detail).toContain("hooks.internal: enabled");
  });

  it("reports both hook systems as disabled when neither is configured", () => {
    const cfg: ClawdbotConfig = {};

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.detail).toContain("hooks.webhooks: disabled");
    expect(finding.detail).toContain("hooks.internal: disabled");
  });
});

describe("collectNodeDangerousAllowCommandFindings", () => {
  it("returns no findings when no allowCommands are configured", () => {
    const cfg: ClawdbotConfig = {};
    expect(collectNodeDangerousAllowCommandFindings(cfg)).toHaveLength(0);
  });

  it("returns no findings when allowCommands does not include dangerous commands", () => {
    const cfg: ClawdbotConfig = {
      gateway: { nodes: { allowCommands: ["camera.list", "location.get"] } },
    };
    expect(collectNodeDangerousAllowCommandFindings(cfg)).toHaveLength(0);
  });

  it("warns when a dangerous command is explicitly allowed", () => {
    const cfg: ClawdbotConfig = {
      gateway: { nodes: { allowCommands: ["sms.send"] } },
    };
    const findings = collectNodeDangerousAllowCommandFindings(cfg);
    expect(findings).toHaveLength(1);
    expect(findings[0].checkId).toBe("gateway.nodes.allow_commands_dangerous");
    expect(findings[0].severity).toBe("warn");
    expect(findings[0].detail).toContain("sms.send");
  });

  it("escalates to critical when gateway is remotely exposed", () => {
    const cfg: ClawdbotConfig = {
      gateway: {
        bind: "lan",
        nodes: { allowCommands: ["camera.snap"] },
      },
    };
    const findings = collectNodeDangerousAllowCommandFindings(cfg);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("critical");
  });

  it("ignores dangerous commands that are also explicitly denied", () => {
    const cfg: ClawdbotConfig = {
      gateway: {
        nodes: {
          allowCommands: ["screen.record"],
          denyCommands: ["screen.record"],
        },
      },
    };
    expect(collectNodeDangerousAllowCommandFindings(cfg)).toHaveLength(0);
  });
});
