import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

import type { ResolvedBrowserConfig } from "./config.js";
import { browserMutationGuardMiddleware } from "./csrf.js";
import { registerBrowserRoutes } from "./routes/index.js";
import {
  type BrowserServerState,
  createBrowserRouteContext,
  type ProfileContext,
} from "./server-context.js";

export type BrowserBridge = {
  server: Server;
  port: number;
  baseUrl: string;
  state: BrowserServerState;
};

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  host?: string;
  port?: number;
  authToken?: string;
  onEnsureAttachTarget?: (profile: ProfileContext["profile"]) => Promise<void>;
  resolveSandboxNoVncToken?: (token: string) => string | null;
}): Promise<BrowserBridge> {
  const host = params.host ?? "127.0.0.1";
  const port = params.port ?? 0;

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(browserMutationGuardMiddleware());

  if (params.resolveSandboxNoVncToken) {
    app.get("/sandbox/novnc", (req, res) => {
      const rawToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";
      if (!rawToken) {
        res.status(400).send("缺少 token");
        return;
      }
      const redirectUrl = params.resolveSandboxNoVncToken?.(rawToken);
      if (!redirectUrl) {
        res.status(404).send("token 无效或已过期");
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, redirectUrl);
    });
  }

  const authToken = params.authToken?.trim();
  if (authToken) {
    app.use((req, res, next) => {
      const auth = String(req.headers.authorization ?? "").trim();
      if (auth === `Bearer ${authToken}`) return next();
      res.status(401).send("Unauthorized");
    });
  }

  const state: BrowserServerState = {
    server: null as unknown as Server,
    port,
    resolved: params.resolved,
    profiles: new Map(),
  };

  const ctx = createBrowserRouteContext({
    getState: () => state,
    onEnsureAttachTarget: params.onEnsureAttachTarget,
  });
  registerBrowserRoutes(app, ctx);

  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.once("error", reject);
  });

  const address = server.address() as AddressInfo | null;
  const resolvedPort = address?.port ?? port;
  state.server = server;
  state.port = resolvedPort;
  state.resolved.controlHost = host;
  state.resolved.controlPort = resolvedPort;
  state.resolved.controlUrl = `http://${host}:${resolvedPort}`;

  const baseUrl = state.resolved.controlUrl;
  return { server, port: resolvedPort, baseUrl, state };
}

export async function stopBrowserBridgeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
