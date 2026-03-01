import { homedir } from "node:os";
import { join } from "node:path";

export type MemoryConfig = {
  embedding: {
    provider: "openai" | "doubao" | "local";
    model?: string;
    apiKey: string;
    url?: string;
    localModelPath?: string;
    localModelCacheDir?: string;
    dimensions?: number;
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
  storageOptions?: Record<string, string>;
};

export const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DOUBAO_MODEL = "doubao-embedding-vision-251215";
const DEFAULT_LOCAL_MODEL = "bge-small-zh-v1.5";
const DEFAULT_DB_PATH = join(homedir(), ".openclaw", "memory", "lancedb");

const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "doubao-embedding-vision-251215": 2048,
  "bge-small-zh-v1.5": 512,
};

function assertAllowedKeys(value: Record<string, unknown>, allowed: string[], label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length === 0) return;
  throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
}

export function vectorDimsForModel(model: string, dimensions?: number): number {
  if (dimensions !== undefined) {
    return dimensions;
  }
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
  if (provider === "local") {
    return "local";
  }
  throw new Error(`Unsupported embedding provider: ${JSON.stringify(provider)}`);
}

function resolveEmbeddingModel(
  embedding: Record<string, unknown>,
  provider: MemoryConfig["embedding"]["provider"],
  dimensions?: number,
): string {
  const defaultModel =
    provider === "doubao"
      ? DEFAULT_DOUBAO_MODEL
      : provider === "local"
        ? DEFAULT_LOCAL_MODEL
        : DEFAULT_MODEL;
  const model = typeof embedding.model === "string" ? embedding.model : defaultModel;
  vectorDimsForModel(model, dimensions);
  return model;
}

export const memoryConfigSchema = {
  parse(value: unknown): MemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory config required");
    }
    const cfg = value as Record<string, unknown>;
    assertAllowedKeys(
      cfg,
      ["embedding", "dbPath", "autoCapture", "autoRecall", "storageOptions"],
      "memory config",
    );

    const embedding = cfg.embedding as Record<string, unknown> | undefined;
    if (!embedding) {
      throw new Error(`embedding not found: ${embedding}`);
    }
    if (embedding.provider !== "local" && typeof embedding.apiKey !== "string") {
      throw new Error("embedding.apiKey is required");
    }
    assertAllowedKeys(
      embedding,
      [
        "apiKey",
        "model",
        "provider",
        "url",
        "retry",
        "localModelPath",
        "localModelCacheDir",
        "dimensions",
      ],
      "embedding config",
    );
    const provider = resolveEmbeddingProvider(embedding);
    const dimensions = typeof embedding.dimensions === "number" ? embedding.dimensions : undefined;
    const model = resolveEmbeddingModel(embedding, provider, dimensions);
    const apiKey = provider !== "local" ? resolveEnvVars(embedding.apiKey) : "";
    const url = typeof embedding.url === "string" ? embedding.url : undefined;

    const localModelPath =
      typeof embedding.localModelPath === "string" ? embedding.localModelPath : undefined;
    const localModelCacheDir =
      typeof embedding.localModelCacheDir === "string" ? embedding.localModelCacheDir : undefined;
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

    // Parse storageOptions (object with string values)
    let storageOptions: Record<string, string> | undefined;
    const storageOpts = cfg.storageOptions as Record<string, unknown> | undefined;
    if (storageOpts !== undefined && storageOpts !== null) {
      if (!storageOpts || typeof storageOpts !== "object" || Array.isArray(storageOpts)) {
        throw new Error("storageOptions must be an object");
      }
      // Validate all values are strings
      for (const [key, value] of Object.entries(storageOpts)) {
        if (typeof value !== "string") {
          throw new Error(`storageOptions.${key} must be a string`);
        }
      }
      storageOptions = storageOpts as Record<string, string>;
    }

    return {
      embedding: {
        provider,
        model,
        apiKey,
        ...(url ? { url } : {}),
        ...(localModelPath ? { localModelPath } : {}),
        ...(localModelCacheDir ? { localModelCacheDir } : {}),
        ...(dimensions ? { dimensions } : {}),
        ...(retry ? { retry } : {}),
      },
      dbPath: typeof cfg.dbPath === "string" ? cfg.dbPath : DEFAULT_DB_PATH,
      autoCapture: cfg.autoCapture === true,
      autoRecall: cfg.autoRecall !== false,
      ...(storageOptions ? { storageOptions } : {}),
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
      help: "Embedding provider: 'openai' (default), 'doubao', or 'local' for local models.",
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
    "embedding.localModelPath": {
      label: "Local Model Path",
      advanced: true,
      help: "Path to local embedding model file (GGUF format) for 'local' provider",
    },
    "embedding.localModelCacheDir": {
      label: "Local Model Cache Dir",
      advanced: true,
      help: "Directory for caching local model files (defaults to ~/.cache/node-llama-cpp)",
    },
    "embedding.dimensions": {
      label: "Embedding Dimensions",
      advanced: true,
      help: "Vector dimensions for the embedding model. If not specified, will be inferred from the model name.",
    },
    dbPath: {
      label: "Database Path",
      placeholder: "~/.openclaw/memory/lancedb",
      advanced: true,
      help: "Local filesystem path or cloud storage URI (s3://, gs://) for LanceDB database",
    },
    autoCapture: {
      label: "Auto-Capture",
      help: "Automatically capture important information from conversations",
    },
    autoRecall: {
      label: "Auto-Recall",
      help: "Automatically inject relevant memories into context",
    },
    storageOptions: {
      label: "Storage Options",
      advanced: true,
      help: "Storage configuration options (access_key, secret_key, endpoint, etc.)",
    },
  },
};
