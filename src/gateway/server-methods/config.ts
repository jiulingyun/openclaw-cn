import type { GatewayRequestHandlers, RespondFn } from "./types.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { listChannelPlugins } from "../../channels/plugins/index.js";
import {
  CONFIG_PATH,
  loadConfig,
  parseConfigJson5,
  readConfigFileSnapshot,
  readConfigFileSnapshotForWrite,
  resolveConfigSnapshotHash,
  validateConfigObjectWithPlugins,
  writeConfigFile,
} from "../../config/config.js";
import { applyLegacyMigrations } from "../../config/legacy.js";
import { applyMergePatch } from "../../config/merge-patch.js";
import {
  redactConfigObject,
  redactConfigSnapshot,
  restoreRedactedValues,
} from "../../config/redact-snapshot.js";
import { buildConfigSchema, type ConfigSchemaResponse } from "../../config/schema.js";
import { extractDeliveryInfo } from "../../config/sessions.js";
import {
  formatDoctorNonInteractiveHint,
  type RestartSentinelPayload,
  writeRestartSentinel,
} from "../../infra/restart-sentinel.js";
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
import { loadOpenClawPlugins } from "../../plugins/loader.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateConfigApplyParams,
  validateConfigGetParams,
  validateConfigPatchParams,
  validateConfigSchemaParams,
  validateConfigSetParams,
} from "../protocol/index.js";

const logConfig = createSubsystemLogger("gateway").child("config");

function resolveBaseHash(params: unknown): string | null {
  const raw = (params as { baseHash?: unknown })?.baseHash;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function requireConfigBaseHash(
  params: unknown,
  snapshot: Awaited<ReturnType<typeof readConfigFileSnapshot>>,
  respond: RespondFn,
): boolean {
  if (!snapshot.exists) {
    return true;
  }
  const snapshotHash = resolveConfigSnapshotHash(snapshot);
  if (!snapshotHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config base hash unavailable; re-run config.get and retry",
      ),
    );
    return false;
  }
  const baseHash = resolveBaseHash(params);
  if (!baseHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config base hash required; re-run config.get and retry",
      ),
    );
    return false;
  }
  if (baseHash !== snapshotHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config changed since last load; re-run config.get and retry",
      ),
    );
    return false;
  }
  return true;
}

function loadSchemaWithPlugins(): ConfigSchemaResponse {
  const cfg = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
  const pluginRegistry = loadOpenClawPlugins({
    config: cfg,
    cache: true,
    workspaceDir,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  });
  // Note: We can't easily cache this, as there are no callback that can invalidate
  // our cache. However, both loadConfig() and loadOpenClawPlugins() already cache
  // their results, and buildConfigSchema() is just a cheap transformation.
  return buildConfigSchema({
    plugins: pluginRegistry.plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      configUiHints: plugin.configUiHints,
      configSchema: plugin.configJsonSchema,
    })),
    channels: listChannelPlugins().map((entry) => ({
      id: entry.id,
      label: entry.meta.label,
      description: entry.meta.blurb,
      configSchema: entry.configSchema?.schema,
      configUiHints: entry.configSchema?.uiHints,
    })),
  });
}

export const configHandlers: GatewayRequestHandlers = {
  "config.get": async ({ params, respond }) => {
    if (!validateConfigGetParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid config.get params: ${formatValidationErrors(validateConfigGetParams.errors)}`,
        ),
      );
      return;
    }
    const snapshot = await readConfigFileSnapshot();
    const schema = loadSchemaWithPlugins();
    // @ts-ignore -- cherry-pick upstream type mismatch
    // @ts-ignore -- cherry-pick upstream type mismatch
    respond(true, redactConfigSnapshot(snapshot, schema.uiHints), undefined);
  },
  "config.schema": ({ params, respond }) => {
    if (!validateConfigSchemaParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid config.schema params: ${formatValidationErrors(validateConfigSchemaParams.errors)}`,
        ),
      );
      return;
    }
    respond(true, loadSchemaWithPlugins(), undefined);
  },
  "config.set": async ({ params, respond, context }) => {
    // eslint-disable-next-line no-console
    console.error(`[config.set] handler invoked`);
    // eslint-disable-next-line no-console
    console.error(`[config.set] module: ${import.meta.url}`);
    if (!validateConfigSetParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid config.set params: ${formatValidationErrors(validateConfigSetParams.errors)}`,
        ),
      );
      return;
    }
    const { snapshot, writeOptions } = await readConfigFileSnapshotForWrite();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    const rawValue = (params as { raw?: unknown }).raw;
    if (typeof rawValue !== "string") {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config.set params: raw (string) required"),
      );
      return;
    }
    const parsedRes = parseConfigJson5(rawValue);
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    // @ts-ignore -- cherry-pick upstream type mismatch
    const schemaSet = loadSchemaWithPlugins();
    // @ts-ignore -- cherry-pick upstream type mismatch
    // restoreRedactedValues 直接返回恢复后的配置对象，不是 { ok, result } 结构
    const restored = restoreRedactedValues(parsedRes.parsed, snapshot.config);
    // @ts-ignore -- cherry-pick upstream type mismatch
    const validated = validateConfigObjectWithPlugins(restored);
    if (!validated.ok) {
      // Force visibility even when subsystem filters hide gateway logs.
      // eslint-disable-next-line no-console
      console.error(
        `[config.set] validateConfigObjectWithPlugins failed; issues=` +
          JSON.stringify(Array.isArray(validated.issues) ? validated.issues.slice(0, 20) : null),
      );
      const issuesSummary = Array.isArray(validated.issues)
        ? validated.issues
            .slice(0, 5)
            .map((issue) => {
              if (!issue || typeof issue !== "object") {
                return String(issue);
              }
              const issueObj = issue as unknown as { path?: unknown; message?: unknown };
              const path = Array.isArray(issueObj.path) ? issueObj.path.join(".") : undefined;
              const message = typeof issueObj.message === "string" ? issueObj.message : undefined;
              if (path && message) {
                return `${path}: ${message}`;
              }
              return JSON.stringify(issue);
            })
            .join("; ")
        : "";

      const msg = issuesSummary
        ? `config.set rejected by schema validation: ${issuesSummary}`
        : "config.set rejected by schema validation (no issues summary)";

      if (issuesSummary) {
        // Force visibility even when subsystem filters hide gateway logs.
        // This is intentionally compact (first few issues only) and should not include secrets.
        // eslint-disable-next-line no-console
        console.error(`[config.set] ${msg}`);
      } else {
        // eslint-disable-next-line no-console
        console.error(`[config.set] ${msg}`);

        // Log via the request context's gateway logger too (subsystem: gateway), so it remains
        // visible even if the console subsystem filter hides gateway/config.
        context?.logGateway?.warn(msg, {
          consoleMessage: msg,
          issuesPreview: issuesSummary,
        });

        const logger = context?.logGateway?.child("config") ?? logConfig;
        logger.warn(msg);
      }
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          issuesSummary ? `invalid config: ${issuesSummary}` : "invalid config",
          {
            details: { issues: validated.issues },
          },
        ),
        issuesSummary ? { issuesPreview: issuesSummary } : undefined,
      );
      return;
    }
    await writeConfigFile(validated.config, writeOptions);
    // @ts-ignore -- cherry-pick upstream type mismatch
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
        // @ts-ignore -- cherry-pick upstream type mismatch
        config: redactConfigObject(validated.config, schemaSet.uiHints),
      },
      undefined,
    );
  },
  "config.patch": async ({ params, respond }) => {
    if (!validateConfigPatchParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid config.patch params: ${formatValidationErrors(validateConfigPatchParams.errors)}`,
        ),
      );
      return;
    }
    const { snapshot, writeOptions } = await readConfigFileSnapshotForWrite();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    if (!snapshot.valid) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config; fix before patching"),
      );
      return;
    }
    const rawValue = (params as { raw?: unknown }).raw;
    if (typeof rawValue !== "string") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid config.patch params: raw (string) required",
        ),
      );
      return;
    }
    const parsedRes = parseConfigJson5(rawValue);
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    if (
      !parsedRes.parsed ||
      typeof parsedRes.parsed !== "object" ||
      Array.isArray(parsedRes.parsed)
    ) {
      respond(
        false,
        undefined,
        // @ts-ignore -- cherry-pick upstream type mismatch
        errorShape(ErrorCodes.INVALID_REQUEST, "config.patch raw must be an object"),
        // @ts-ignore -- cherry-pick upstream type mismatch
      );
      return;
    }
    const merged = applyMergePatch(snapshot.config, parsedRes.parsed);
    const schemaPatch = loadSchemaWithPlugins();
    // @ts-ignore -- cherry-pick upstream type mismatch
    const restoredMerge = restoreRedactedValues(merged, snapshot.config, schemaPatch.uiHints);
    // @ts-ignore -- cherry-pick upstream type mismatch
    if (!restoredMerge.ok) {
      respond(
        false,
        // @ts-ignore -- cherry-pick upstream type mismatch
        undefined,
        // @ts-ignore -- cherry-pick upstream type mismatch
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          // @ts-ignore -- cherry-pick upstream type mismatch
          restoredMerge.humanReadableMessage ?? "invalid config",
        ),
      );
      return;
    }
    // @ts-ignore -- cherry-pick upstream type mismatch
    const migrated = applyLegacyMigrations(restoredMerge.result);
    // @ts-ignore -- cherry-pick upstream type mismatch
    const resolved = migrated.next ?? restoredMerge.result;
    const validated = validateConfigObjectWithPlugins(resolved);
    if (!validated.ok) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
          details: { issues: validated.issues },
        }),
      );
      return;
    }
    await writeConfigFile(validated.config, writeOptions);

    const sessionKey =
      typeof (params as { sessionKey?: unknown }).sessionKey === "string"
        ? (params as { sessionKey?: string }).sessionKey?.trim() || undefined
        : undefined;
    const note =
      // @ts-ignore -- cherry-pick upstream type mismatch
      typeof (params as { note?: unknown }).note === "string"
        ? (params as { note?: string }).note?.trim() || undefined
        : undefined;
    // @ts-ignore -- cherry-pick upstream type mismatch
    const restartDelayMsRaw = (params as { restartDelayMs?: unknown }).restartDelayMs;
    const restartDelayMs =
      typeof restartDelayMsRaw === "number" && Number.isFinite(restartDelayMsRaw)
        ? Math.max(0, Math.floor(restartDelayMsRaw))
        : undefined;

    // Extract deliveryContext + threadId for routing after restart
    // Supports both :thread: (most channels) and :topic: (Telegram)
    // @ts-ignore -- cherry-pick upstream type mismatch
    const { deliveryContext, threadId } = extractDeliveryInfo(sessionKey);

    const payload: RestartSentinelPayload = {
      // @ts-ignore -- cherry-pick upstream type mismatch
      kind: "config-patch",
      status: "ok",
      ts: Date.now(),
      sessionKey,
      deliveryContext,
      threadId,
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      stats: {
        mode: "config.patch",
        root: CONFIG_PATH,
      },
    };
    let sentinelPath: string | null = null;
    try {
      // @ts-ignore -- cherry-pick upstream type mismatch
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }
    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "config.patch",
    });
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
        // @ts-ignore -- cherry-pick upstream type mismatch
        config: redactConfigObject(validated.config, schemaPatch.uiHints),
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
  "config.apply": async ({ params, respond }) => {
    if (!validateConfigApplyParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid config.apply params: ${formatValidationErrors(validateConfigApplyParams.errors)}`,
        ),
      );
      return;
    }
    const { snapshot, writeOptions } = await readConfigFileSnapshotForWrite();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    const rawValue = (params as { raw?: unknown }).raw;
    if (typeof rawValue !== "string") {
      respond(
        false,
        // @ts-ignore -- cherry-pick upstream type mismatch
        undefined,
        // @ts-ignore -- cherry-pick upstream type mismatch
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid config.apply params: raw (string) required",
        ),
        // @ts-ignore -- cherry-pick upstream type mismatch
      );
      return;
    }
    const parsedRes = parseConfigJson5(rawValue);
    // @ts-ignore -- cherry-pick upstream type mismatch
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    const schemaApply = loadSchemaWithPlugins();
    // @ts-ignore -- cherry-pick upstream type mismatch
    const restored = restoreRedactedValues(parsedRes.parsed, snapshot.config, schemaApply.uiHints);
    // @ts-ignore -- cherry-pick upstream type mismatch
    if (!restored.ok) {
      respond(
        false,
        undefined,
        // @ts-ignore -- cherry-pick upstream type mismatch
        errorShape(ErrorCodes.INVALID_REQUEST, restored.humanReadableMessage ?? "invalid config"),
      );
      return;
    }
    // @ts-ignore -- cherry-pick upstream type mismatch
    const validated = validateConfigObjectWithPlugins(restored.result);
    if (!validated.ok) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
          details: { issues: validated.issues },
        }),
      );
      return;
    }
    // @ts-ignore -- cherry-pick upstream type mismatch
    await writeConfigFile(validated.config, writeOptions);
    // @ts-ignore -- cherry-pick upstream type mismatch

    const sessionKey =
      typeof (params as { sessionKey?: unknown }).sessionKey === "string"
        ? (params as { sessionKey?: string }).sessionKey?.trim() || undefined
        : undefined;
    const note =
      typeof (params as { note?: unknown }).note === "string"
        ? (params as { note?: string }).note?.trim() || undefined
        : undefined;
    const restartDelayMsRaw = (params as { restartDelayMs?: unknown }).restartDelayMs;
    const restartDelayMs =
      typeof restartDelayMsRaw === "number" && Number.isFinite(restartDelayMsRaw)
        ? Math.max(0, Math.floor(restartDelayMsRaw))
        : undefined;

    // Extract deliveryContext + threadId for routing after restart
    // Supports both :thread: (most channels) and :topic: (Telegram)
    // @ts-ignore -- cherry-pick upstream type mismatch
    const { deliveryContext: deliveryContextApply, threadId: threadIdApply } =
      // @ts-ignore -- cherry-pick upstream type mismatch
      extractDeliveryInfo(sessionKey);

    const payload: RestartSentinelPayload = {
      kind: "config-apply",
      status: "ok",
      ts: Date.now(),
      sessionKey,
      deliveryContext: deliveryContextApply,
      threadId: threadIdApply,
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      // @ts-ignore -- cherry-pick upstream type mismatch
      stats: {
        mode: "config.apply",
        root: CONFIG_PATH,
      },
    };
    let sentinelPath: string | null = null;
    try {
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }
    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "config.apply",
    });
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
        // @ts-ignore -- cherry-pick upstream type mismatch
        config: redactConfigObject(validated.config, schemaApply.uiHints),
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
};
