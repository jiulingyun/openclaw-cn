import type express from "express";

import type { BrowserRouteContext } from "../server-context.js";
import { registerBrowserAgentRoutes } from "./agent.js";
import { registerBrowserBasicRoutes } from "./basic.js";
import { registerBrowserTabRoutes } from "./tabs.js";
import type { BrowserRouteRegistrar } from "./types.js";

// Adapter to make express.Express compatible with BrowserRouteRegistrar
function createExpressAdapter(app: express.Express): BrowserRouteRegistrar {
  return {
    get: (path, handler) => app.get(path, handler as any),
    post: (path, handler) => app.post(path, handler as any),
    delete: (path, handler) => app.delete(path, handler as any),
  };
}

export function registerBrowserRoutes(
  app: express.Express | BrowserRouteRegistrar,
  ctx: BrowserRouteContext,
) {
  // If app is express.Express, wrap it; otherwise use it directly
  const registrar = "use" in app ? createExpressAdapter(app as express.Express) : app;
  
  registerBrowserBasicRoutes(registrar, ctx);
  registerBrowserTabRoutes(registrar, ctx);
  registerBrowserAgentRoutes(registrar, ctx);
}
