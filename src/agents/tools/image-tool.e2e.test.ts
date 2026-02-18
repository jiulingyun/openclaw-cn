import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ClawdbotConfig } from "../../config/config.js";
import { createImageTool } from "./image-tool.js";

async function writeAuthProfiles(agentDir: string, profiles: unknown) {
  const authDir = path.join(agentDir, "auth");
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(path.join(authDir, "auth.json"), JSON.stringify(profiles, null, 2));
}

const ONE_PIXEL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
const ONE_PIXEL_GIF_B64 = "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";

function createMinimaxImageConfig(): ClawdbotConfig {
  return {
    agents: {
      defaults: {
        imageModel: {
          primary: "minimax/minimax-m2.5",
        },
      },
    },
  } as unknown as ClawdbotConfig;
}

function findSchemaUnionKeywords(schema: unknown, path = "root"): string[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }
  if (Array.isArray(schema)) {
    return schema.flatMap((item, index) => findSchemaUnionKeywords(item, `${path}[${index}]`));
  }
  const record = schema as Record<string, unknown>;
  const out: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    const nextPath = `${path}.${key}`;
    if (key === "anyOf" || key === "oneOf" || key === "allOf") {
      out.push(nextPath);
    }
    out.push(...findSchemaUnionKeywords(value, nextPath));
  }
  return out;
}

describe("image tool schema", () => {
  it("exposes an Anthropic-safe image schema without union keywords", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    try {
      const cfg = createMinimaxImageConfig();
      const tool = createImageTool({ config: cfg, agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      const violations = findSchemaUnionKeywords(tool.parameters, "image.parameters");
      expect(violations).toEqual([]);

      const schema = tool.parameters as {
        properties?: Record<string, unknown>;
      };
      const imageSchema = schema.properties?.image as { type?: unknown } | undefined;
      const imagesSchema = schema.properties?.images as
        | { type?: unknown; items?: unknown }
        | undefined;
      const imageItems = imagesSchema?.items as { type?: unknown } | undefined;

      expect(imageSchema?.type).toBe("string");
      expect(imagesSchema?.type).toBe("array");
      expect(imageItems?.type).toBe("string");
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("keeps an Anthropic-safe image schema snapshot", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    try {
      const cfg = createMinimaxImageConfig();
      const tool = createImageTool({ config: cfg, agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      expect(JSON.parse(JSON.stringify(tool.parameters))).toMatchObject({
        type: "object",
        properties: {
          prompt: { type: "string" },
          image: { type: "string" },
          images: {
            type: "array",
            items: { type: "string" },
          },
          model: { type: "string" },
          maxBytesMb: { type: "number" },
          maxImages: { type: "number" },
        },
      });
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });
});

describe("image tool multi-image handling", () => {
  it("accepts image for single-image requests", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    try {
      await writeAuthProfiles(agentDir, {
        profiles: [{ provider: "minimax", apiKey: "test-key" }],
      });
      const cfg = createMinimaxImageConfig();
      const tool = createImageTool({ config: cfg, agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      // Single image should work
      const res = await tool.execute("t1", {
        prompt: "Describe this image.",
        image: `data:image/png;base64,${ONE_PIXEL_PNG_B64}`,
      });
      
      expect(res).toBeDefined();
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("accepts images[] for multi-image requests", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    try {
      await writeAuthProfiles(agentDir, {
        profiles: [{ provider: "minimax", apiKey: "test-key" }],
      });
      const cfg = createMinimaxImageConfig();
      const tool = createImageTool({ config: cfg, agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      // Multiple images should work
      const res = await tool.execute("t1", {
        prompt: "Compare these images.",
        images: [`data:image/png;base64,${ONE_PIXEL_PNG_B64}`, `data:image/gif;base64,${ONE_PIXEL_GIF_B64}`],
      });
      
      expect(res).toBeDefined();
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("combines image + images with dedupe and enforces maxImages", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    try {
      await writeAuthProfiles(agentDir, {
        profiles: [{ provider: "minimax", apiKey: "test-key" }],
      });
      const cfg = createMinimaxImageConfig();
      const tool = createImageTool({ config: cfg, agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      // Test deduplication
      const deduped = await tool.execute("t1", {
        prompt: "Compare these images.",
        image: `data:image/png;base64,${ONE_PIXEL_PNG_B64}`,
        images: [
          `data:image/png;base64,${ONE_PIXEL_PNG_B64}`,
          `data:image/gif;base64,${ONE_PIXEL_GIF_B64}`,
          `data:image/gif;base64,${ONE_PIXEL_GIF_B64}`,
        ],
      });
      
      expect(deduped).toBeDefined();

      // Test maxImages enforcement
      const tooMany = await tool.execute("t2", {
        prompt: "Compare these images.",
        image: `data:image/png;base64,${ONE_PIXEL_PNG_B64}`,
        images: [`data:image/gif;base64,${ONE_PIXEL_GIF_B64}`],
        maxImages: 1,
      });

      expect(tooMany.details).toMatchObject({
        error: "too_many_images",
        count: 2,
        max: 1,
      });
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });
});
