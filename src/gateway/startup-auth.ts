import crypto from "node:crypto";
import type { ClawdbotConfig } from "../config/config.js";
import { writeConfigFile } from "../config/config.js";

export type EnsureGatewayStartupAuthResult = {
  cfg: ClawdbotConfig;
  generatedToken?: string;
};

/**
 * Ensure gateway auth is configured. If token mode is active but no token is set,
 * auto-generate one and optionally persist it to the config file.
 */
export async function ensureGatewayStartupAuth(params: {
  cfg: ClawdbotConfig;
  env?: NodeJS.ProcessEnv;
  persist?: boolean;
}): Promise<EnsureGatewayStartupAuthResult> {
  const { cfg, persist = false } = params;
  const env = params.env ?? process.env;

  const mode = cfg.gateway?.auth?.mode;
  // Non-token modes don't need auto-generation
  if (mode === "none" || mode === "password") {
    return { cfg };
  }
  // @ts-ignore -- cherry-pick upstream type mismatch
  if (mode === "trusted-proxy") {
    return { cfg };
  }

  // Check if token is already available
  const existingToken = cfg.gateway?.auth?.token ?? env.OPENCLAW_GATEWAY_TOKEN;
  if (existingToken) {
    return { cfg };
  }

  // Generate a new token and update the config
  const generatedToken = crypto.randomBytes(24).toString("hex");
  const nextCfg: ClawdbotConfig = {
    ...cfg,
    gateway: {
      ...cfg.gateway,
      auth: {
        ...cfg.gateway?.auth,
        mode: "token",
        token: generatedToken,
      },
    },
  };

  if (persist) {
    await writeConfigFile(nextCfg);
  }

  return { cfg: nextCfg, generatedToken };
}
