import type { Server } from "node:http";
import express from "express";

import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { resolveBrowserConfig, resolveProfile, shouldStartLocalBrowserServer } from "./config.js";
import { ensureBrowserControlAuth, resolveBrowserControlAuth } from "./control-auth.js";
import { browserMutationGuardMiddleware } from "./csrf.js";
import { ensureChromeExtensionRelayServer } from "./extension-relay.js";
import { isAuthorizedBrowserRequest } from "./http-auth.js";
import { registerBrowserRoutes } from "./routes/index.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
import { type BrowserServerState, createBrowserRouteContext } from "./server-context.js";
import { ensureExtensionRelayForProfiles, stopKnownBrowserProfiles } from "./server-lifecycle.js";

let state: BrowserServerState | null = null;
const log = createSubsystemLogger("browser");
const logServer = log.child("server");

export async function startBrowserControlServerFromConfig(): Promise<BrowserServerState | null> {
  if (state) return state;

  const cfg = loadConfig();
  const resolved = resolveBrowserConfig(cfg.browser);
  if (!resolved.enabled) return null;

  if (!shouldStartLocalBrowserServer(resolved)) {
    logServer.info(
      `browser control URL is non-loopback (${resolved.controlUrl}); skipping local server start`,
    );
    return null;
  }

  let browserAuth = resolveBrowserControlAuth(cfg);
  try {
    const ensured = await ensureBrowserControlAuth({ cfg });
    browserAuth = ensured.auth;
    if (ensured.generatedToken) {
      logServer.info("No browser auth configured; generated gateway.auth.token automatically.");
    }
  } catch (err) {
    logServer.warn(`failed to auto-configure browser auth: ${String(err)}`);
  }

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(browserMutationGuardMiddleware());

  if (browserAuth.token || browserAuth.password) {
    app.use((req, res, next) => {
      if (isAuthorizedBrowserRequest(req, browserAuth)) {
        return next();
      }
      res.status(401).send("Unauthorized");
    });
  }

  const ctx = createBrowserRouteContext({
    getState: () => state,
    refreshConfigFromDisk: true,
  });
  registerBrowserRoutes(app as unknown as BrowserRouteRegistrar, ctx);

  const port = resolved.controlPort;
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  }).catch((err) => {
    logServer.error(`openclaw browser server failed to bind 127.0.0.1:${port}: ${String(err)}`);
    return null;
  });

  if (!server) return null;

  state = {
    server,
    port,
    resolved,
    profiles: new Map(),
  };

  await ensureExtensionRelayForProfiles({
    resolved,
    onWarn: (message) => logServer.warn(message),
  });

  const authMode = browserAuth.token ? "token" : browserAuth.password ? "password" : "off";
  logServer.info(`Browser control listening on http://127.0.0.1:${port}/ (auth=${authMode})`);
  return state;
}

export async function stopBrowserControlServer(): Promise<void> {
  const current = state;
  if (!current) return;

  await stopKnownBrowserProfiles({
    getState: () => state,
    onWarn: (message) => logServer.warn(message),
  });

  if (current.server) {
    await new Promise<void>((resolve) => {
      current.server?.close(() => resolve());
    });
  }
  state = null;

  // Optional: Playwright is not always available (e.g. embedded gateway builds).
  try {
    const mod = await import("./pw-ai.js");
    await mod.closePlaywrightBrowserConnection();
  } catch {
    // ignore
  }
}
