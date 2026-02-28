import { homedir } from "node:os";
import { join } from "node:path";

export type MemoryConfig = {
  embedding: {
    provider: "openai" | "doubao";
    model?: string;
    apiKey: string;
    url?: string;
    retry?: {
      maxRetries: number;
      initialDelayMs: number;
      maxDelayMs: number;
      timeoutMs: number;
    };
  };
  dbPath?: string;
  autoCapture?: boolean;
  autoRecall?: boolean;
};

export const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DOUBAO_MODEL = "doubao-embedding-vision-251215";
const DEFAULT_DB_PATH = join(homedir(), ".openclaw", "memory", "lancedb");

const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "doubao-embedding-vision-251215": 2048,
};

function assertAllowedKeys(value: Record<string, unknown>, allowed: string[], label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length === 0) return;
  throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
}

export function vectorDimsForModel(model: string): number {
  const dims = EMBEDDING_DIMENSIONS[model];
  if (!dims) {
    throw new Error(`Unsupported embedding model: ${model}`);
  }
  return dims;
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

function resolveEmbeddingProvider(
  embedding: Record<string, unknown>,
): MemoryConfig["embedding"]["provider"] {
  const provider = embedding.provider;
  if (provider === undefined || provider === "openai") {
    return "openai";
  }
  if (provider === "doubao") {
    return "doubao";
  }
  throw new Error(`Unsupported embedding provider: ${JSON.stringify(provider)}`);
}

function resolveEmbeddingModel(
  embedding: Record<string, unknown>,
  provider: MemoryConfig["embedding"]["provider"],
): string {
  const defaultModel = provider === "doubao" ? DEFAULT_DOUBAO_MODEL : DEFAULT_MODEL;
  const model = typeof embedding.model === "string" ? embedding.model : defaultModel;
  vectorDimsForModel(model);
  return model;
}

export const memoryConfigSchema = {
  parse(value: unknown): MemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory config required");
    }
    const cfg = value as Record<string, unknown>;
    assertAllowedKeys(cfg, ["embedding", "dbPath", "autoCapture", "autoRecall"], "memory config");

    const embedding = cfg.embedding as Record<string, unknown> | undefined;
    if (!embedding || typeof embedding.apiKey !== "string") {
      throw new Error("embedding.apiKey is required");
    }
    assertAllowedKeys(
      embedding,
      ["apiKey", "model", "provider", "url", "retry"],
      "embedding config",
    );

    const provider = resolveEmbeddingProvider(embedding);
    const model = resolveEmbeddingModel(embedding, provider);
    const apiKey = resolveEnvVars(embedding.apiKey);
    const url = typeof embedding.url === "string" ? embedding.url : undefined;

    // Parse retry config with defaults
    let retry: MemoryConfig["embedding"]["retry"] | undefined;
    const retryCfg = embedding.retry as Record<string, unknown> | undefined;
    if (retryCfg !== undefined && retryCfg !== null) {
      assertAllowedKeys(
        retryCfg,
        ["maxRetries", "initialDelayMs", "maxDelayMs", "timeoutMs"],
        "retry config",
      );
      retry = {
        maxRetries: typeof retryCfg.maxRetries === "number" ? retryCfg.maxRetries : 3,
        initialDelayMs:
          typeof retryCfg.initialDelayMs === "number" ? retryCfg.initialDelayMs : 1000,
        maxDelayMs: typeof retryCfg.maxDelayMs === "number" ? retryCfg.maxDelayMs : 30000,
        timeoutMs: typeof retryCfg.timeoutMs === "number" ? retryCfg.timeoutMs : 30000,
      };
    }

    return {
      embedding: {
        provider,
        model,
        apiKey,
        ...(url ? { url } : {}),
        ...(retry ? { retry } : {}),
      },
      dbPath: typeof cfg.dbPath === "string" ? cfg.dbPath : DEFAULT_DB_PATH,
      autoCapture: cfg.autoCapture === true,
      autoRecall: cfg.autoRecall !== false,
    };
  },
  uiHints: {
    "embedding.apiKey": {
      label: "Embedding API Key",
      sensitive: true,
      placeholder: "sk-proj-...",
      help: "API key for embeddings (OpenAI or Doubao). You can also use ${OPENAI_API_KEY} or ${VOLCENGINE_API_KEY}.",
    },
    "embedding.model": {
      label: "Embedding Model",
      placeholder: DEFAULT_MODEL,
      help: "Embedding model to use (e.g. text-embedding-3-small, doubao-embedding-vision-251215)",
    },
    "embedding.provider": {
      label: "Embedding Provider",
      placeholder: "openai",
      help: "Embedding provider: 'openai' (default) or 'doubao'.",
    },
    "embedding.retry.maxRetries": {
      label: "Max Retries",
      placeholder: "3",
      advanced: true,
      help: "Maximum number of retry attempts for embedding requests",
    },
    "embedding.retry.initialDelayMs": {
      label: "Initial Delay (ms)",
      placeholder: "1000",
      advanced: true,
      help: "Initial delay in milliseconds for exponential backoff",
    },
    "embedding.retry.maxDelayMs": {
      label: "Max Delay (ms)",
      placeholder: "30000",
      advanced: true,
      help: "Maximum delay in milliseconds for exponential backoff",
    },
    "embedding.retry.timeoutMs": {
      label: "Timeout (ms)",
      placeholder: "30000",
      advanced: true,
      help: "Request timeout in milliseconds",
    },
    dbPath: {
      label: "Database Path",
      placeholder: "~/.openclaw/memory/lancedb",
      advanced: true,
    },
    autoCapture: {
      label: "Auto-Capture",
      help: "Automatically capture important information from conversations",
    },
    autoRecall: {
      label: "Auto-Recall",
      help: "Automatically inject relevant memories into context",
    },
  },
};
