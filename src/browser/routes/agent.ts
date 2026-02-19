import type express from "express";

import type { BrowserRouteContext } from "../server-context.js";
import type { BrowserRouteRegistrar } from "./types.js";
import { registerBrowserAgentActRoutes } from "./agent.act.js";
import { registerBrowserAgentDebugRoutes } from "./agent.debug.js";
import { registerBrowserAgentSnapshotRoutes } from "./agent.snapshot.js";
import { registerBrowserAgentStorageRoutes } from "./agent.storage.js";

// Adapter to make express.Express compatible with BrowserRouteRegistrar
function createExpressAdapter(app: express.Express): BrowserRouteRegistrar {
  return {
    get: (path, handler) => app.get(path, handler as any),
    post: (path, handler) => app.post(path, handler as any),
    delete: (path, handler) => app.delete(path, handler as any),
  };
}

export function registerBrowserAgentRoutes(app: express.Express | BrowserRouteRegistrar, ctx: BrowserRouteContext) {
  // If app is express.Express, wrap it; otherwise use it directly
  const registrar = "use" in app ? createExpressAdapter(app as express.Express) : app;
  
  registerBrowserAgentSnapshotRoutes(registrar, ctx);
  registerBrowserAgentActRoutes(registrar, ctx);
  registerBrowserAgentDebugRoutes(registrar, ctx);
  registerBrowserAgentStorageRoutes(registrar, ctx);
}
