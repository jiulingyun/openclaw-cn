import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applySkillEnvOverrides,
  applySkillEnvOverridesFromSnapshot,
  buildWorkspaceSkillSnapshot,
  loadWorkspaceSkillEntries,
} from "./skills.js";

async function writeSkill(params: {
  dir: string;
  name: string;
  description: string;
  metadata?: string;
  body?: string;
}) {
  const { dir, name, description, metadata, body } = params;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "SKILL.md"),
    `---
name: ${name}
description: ${description}${metadata ? `\nmetadata: ${metadata}` : ""}
---

${body ?? `# ${name}\n`}
`,
    "utf-8",
  );
}

describe("applySkillEnvOverrides", () => {
  it("sets and restores env vars", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdbot-"));
    const skillDir = path.join(workspaceDir, "skills", "env-skill");
    await writeSkill({
      dir: skillDir,
      name: "env-skill",
      description: "Needs env",
      metadata: '{"clawdbot":{"requires":{"env":["ENV_KEY"]},"primaryEnv":"ENV_KEY"}}',
    });

    const entries = loadWorkspaceSkillEntries(workspaceDir, {
      managedSkillsDir: path.join(workspaceDir, ".managed"),
    });

    const originalEnv = process.env.ENV_KEY;
    delete process.env.ENV_KEY;

    const restore = applySkillEnvOverrides({
      skills: entries,
      config: { skills: { entries: { "env-skill": { apiKey: "injected" } } } },
    });

    try {
      expect(process.env.ENV_KEY).toBe("injected");
    } finally {
      restore();
      if (originalEnv === undefined) {
        expect(process.env.ENV_KEY).toBeUndefined();
      } else {
        expect(process.env.ENV_KEY).toBe(originalEnv);
      }
    }
  });
  it("applies env overrides from snapshots", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdbot-"));
    const skillDir = path.join(workspaceDir, "skills", "env-skill");
    await writeSkill({
      dir: skillDir,
      name: "env-skill",
      description: "Needs env",
      metadata: '{"clawdbot":{"requires":{"env":["ENV_KEY"]},"primaryEnv":"ENV_KEY"}}',
    });

    const snapshot = buildWorkspaceSkillSnapshot(workspaceDir, {
      managedSkillsDir: path.join(workspaceDir, ".managed"),
      config: { skills: { entries: { "env-skill": { apiKey: "snap-key" } } } },
    });

    const originalEnv = process.env.ENV_KEY;
    delete process.env.ENV_KEY;

    const restore = applySkillEnvOverridesFromSnapshot({
      snapshot,
      config: { skills: { entries: { "env-skill": { apiKey: "snap-key" } } } },
    });

    try {
      expect(process.env.ENV_KEY).toBe("snap-key");
    } finally {
      restore();
      if (originalEnv === undefined) {
        expect(process.env.ENV_KEY).toBeUndefined();
      } else {
        expect(process.env.ENV_KEY).toBe(originalEnv);
      }
    }
  });

  it("blocks unsafe env overrides but allows declared secrets", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdbot-"));
    const skillDir = path.join(workspaceDir, "skills", "unsafe-env-skill");
    await writeSkill({
      dir: skillDir,
      name: "unsafe-env-skill",
      description: "Needs env",
      metadata:
        '{"openclaw":{"requires":{"env":["OPENAI_API_KEY","NODE_OPTIONS"]},"primaryEnv":"OPENAI_API_KEY"}}',
    });

    const entries = loadWorkspaceSkillEntries(workspaceDir, {
      managedSkillsDir: path.join(workspaceDir, ".managed"),
    });

    const originalApiKey = process.env.OPENAI_API_KEY;
    const originalNodeOptions = process.env.NODE_OPTIONS;
    delete process.env.OPENAI_API_KEY;
    delete process.env.NODE_OPTIONS;

    const restore = applySkillEnvOverrides({
      skills: entries,
      config: {
        skills: {
          entries: {
            "unsafe-env-skill": {
              env: {
                OPENAI_API_KEY: "sk-test",
                NODE_OPTIONS: "--require /tmp/evil.js",
              },
            },
          },
        },
      },
    });

    try {
      expect(process.env.OPENAI_API_KEY).toBe("sk-test");
      expect(process.env.NODE_OPTIONS).toBeUndefined();
    } finally {
      restore();
      if (originalApiKey === undefined) {
        expect(process.env.OPENAI_API_KEY).toBeUndefined();
      } else {
        expect(process.env.OPENAI_API_KEY).toBe(originalApiKey);
      }
      if (originalNodeOptions === undefined) {
        expect(process.env.NODE_OPTIONS).toBeUndefined();
      } else {
        expect(process.env.NODE_OPTIONS).toBe(originalNodeOptions);
      }
    }
  });

  it("allows required env overrides from snapshots", async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const restore = applySkillEnvOverridesFromSnapshot({
      snapshot: {
        prompt: "test",
        skills: [{ name: "snapshot-env-skill", requiredEnv: ["OPENAI_API_KEY"] }],
      },
      config: {
        skills: {
          entries: {
            "snapshot-env-skill": {
              env: {
                OPENAI_API_KEY: "snap-secret",
              },
            },
          },
        },
      },
    });

    try {
      expect(process.env.OPENAI_API_KEY).toBe("snap-secret");
    } finally {
      restore();
      if (originalApiKey === undefined) {
        expect(process.env.OPENAI_API_KEY).toBeUndefined();
      } else {
        expect(process.env.OPENAI_API_KEY).toBe(originalApiKey);
      }
    }
  });
});
