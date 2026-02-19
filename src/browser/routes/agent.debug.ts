import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type express from "express";

import type { BrowserRouteContext } from "../server-context.js";
import type { BrowserRouteRegistrar } from "./types.js";
import { handleRouteError, readBody, requirePwAi, resolveProfileContext } from "./agent.shared.js";
import { DEFAULT_TRACE_DIR, resolvePathWithinRoot } from "./path-output.js";
import { toBoolean, toStringOrEmpty } from "./utils.js";

export function registerBrowserAgentDebugRoutes(
  app: BrowserRouteRegistrar,
  ctx: BrowserRouteContext,
) {
  // Adapter to allow Express-typed handlers when underlying might be browser dispatcher
  const registrar = {
    get: (path: string, handler: (req: express.Request, res: express.Response) => any) => app.get(path, handler as any),
    post: (path: string, handler: (req: express.Request, res: express.Response) => any) => app.post(path, handler as any),
    delete: (path: string, handler: (req: express.Request, res: express.Response) => any) => app.delete(path, handler as any),
  };
  registrar.get("/console", async (req, res) => {
    // @ts-ignore -- cherry-pick upstream type mismatch
    // @ts-ignore -- cherry-pick upstream type mismatch
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const level = typeof req.query.level === "string" ? req.query.level : "";

    try {
      // @ts-ignore -- cherry-pick upstream type mismatch
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      // @ts-ignore -- cherry-pick upstream type mismatch
      const pw = await requirePwAi(res, "console messages");
      if (!pw) return;
      const messages = await pw.getConsoleMessagesViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        level: level.trim() || undefined,
      });
      // @ts-ignore -- cherry-pick upstream type mismatch
      res.json({ ok: true, messages, targetId: tab.targetId });
    } catch (err) {
      // @ts-ignore -- cherry-pick upstream type mismatch
      handleRouteError(ctx, res, err);
    }
    // @ts-ignore -- cherry-pick upstream type mismatch
  });

  registrar.get("/errors", async (req, res) => {
    // @ts-ignore -- cherry-pick upstream type mismatch
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    // @ts-ignore -- cherry-pick upstream type mismatch
    const clear = toBoolean(req.query.clear) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      // @ts-ignore -- cherry-pick upstream type mismatch
      const pw = await requirePwAi(res, "page errors");
      if (!pw) return;
      const result = await pw.getPageErrorsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        // @ts-ignore -- cherry-pick upstream type mismatch
        targetId: tab.targetId,
        clear,
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      // @ts-ignore -- cherry-pick upstream type mismatch
      // @ts-ignore -- cherry-pick upstream type mismatch
      handleRouteError(ctx, res, err);
    }
  });

  registrar.get("/requests", async (req, res) => {
    // @ts-ignore -- cherry-pick upstream type mismatch
    const profileCtx = resolveProfileContext(req, res, ctx);
    // @ts-ignore -- cherry-pick upstream type mismatch
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const filter = typeof req.query.filter === "string" ? req.query.filter : "";
    const clear = toBoolean(req.query.clear) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      // @ts-ignore -- cherry-pick upstream type mismatch
      const pw = await requirePwAi(res, "network requests");
      if (!pw) return;
      // @ts-ignore -- cherry-pick upstream type mismatch
      const result = await pw.getNetworkRequestsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        filter: filter.trim() || undefined,
        clear,
        // @ts-ignore -- cherry-pick upstream type mismatch
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
      // @ts-ignore -- cherry-pick upstream type mismatch
    } catch (err) {
      // @ts-ignore -- cherry-pick upstream type mismatch
      handleRouteError(ctx, res, err);
    }
  });

  registrar.post("/trace/start", async (req, res) => {
    // @ts-ignore -- cherry-pick upstream type mismatch
    // @ts-ignore -- cherry-pick upstream type mismatch
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    // @ts-ignore -- cherry-pick upstream type mismatch
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const screenshots = toBoolean(body.screenshots) ?? undefined;
    const snapshots = toBoolean(body.snapshots) ?? undefined;
    const sources = toBoolean(body.sources) ?? undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      // @ts-ignore -- cherry-pick upstream type mismatch
      // @ts-ignore -- cherry-pick upstream type mismatch
      const pw = await requirePwAi(res, "trace start");
      if (!pw) return;
      await pw.traceStartViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        // @ts-ignore -- cherry-pick upstream type mismatch
        targetId: tab.targetId,
        screenshots,
        // @ts-ignore -- cherry-pick upstream type mismatch
        snapshots,
        sources,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      // @ts-ignore -- cherry-pick upstream type mismatch
      // @ts-ignore -- cherry-pick upstream type mismatch
      handleRouteError(ctx, res, err);
    }
  });

  registrar.post("/trace/stop", async (req, res) => {
    // @ts-ignore -- cherry-pick upstream type mismatch
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    // @ts-ignore -- cherry-pick upstream type mismatch
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const out = toStringOrEmpty(body.path) || "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      // @ts-ignore -- cherry-pick upstream type mismatch
      const pw = await requirePwAi(res, "trace stop");
      if (!pw) return;
      const id = crypto.randomUUID();
      const dir = "/tmp/clawdbot";
      await fs.mkdir(dir, { recursive: true });
      const tracePathResult = resolvePathWithinRoot({
        rootDir: dir,
        requestedPath: out,
        scopeLabel: "trace directory",
        defaultFileName: `browser-trace-${id}.zip`,
      });
      // @ts-ignore -- cherry-pick upstream type mismatch
      if (!tracePathResult.ok) {
        res.status(400).json({ error: tracePathResult.error });
        return;
      }
      const tracePath = tracePathResult.path;
      await pw.traceStopViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        path: tracePath,
      });
      res.json({
        ok: true,
        targetId: tab.targetId,
        path: path.resolve(tracePath),
      });
    } catch (err) {
      // @ts-ignore -- cherry-pick upstream type mismatch
      handleRouteError(ctx, res, err);
    }
  });
}
