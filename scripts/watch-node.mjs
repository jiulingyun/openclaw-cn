#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const env = { ...process.env };
const cwd = process.cwd();
const compiler = env.CLAWDBOT_TS_COMPILER === "tsc" ? "tsc" : "tsgo";
const projectArgs = ["--project", "tsconfig.json"];

const distRoot = path.join(cwd, "dist");
const buildStampPath = path.join(distRoot, ".buildstamp");

const pnpmArgs = ["exec", compiler, ...projectArgs];
const buildCmd = process.platform === "win32" ? "cmd.exe" : "pnpm";
const buildArgs =
  process.platform === "win32" ? ["/d", "/s", "/c", "pnpm", ...pnpmArgs] : pnpmArgs;

const initialBuild = spawnSync(buildCmd, buildArgs, {
  cwd,
  env,
  stdio: "inherit",
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

try {
  fs.mkdirSync(distRoot, { recursive: true });
  fs.writeFileSync(buildStampPath, `${Date.now()}\n`);
} catch {
  // Best-effort stamp; still allow watch to start
}

const watchArgs =
  compiler === "tsc"
    ? [...projectArgs, "--watch", "--preserveWatchOutput"]
    : [...projectArgs, "--watch"];

const watchPnpmArgs = ["exec", compiler, ...watchArgs];
const watchCmd = process.platform === "win32" ? "cmd.exe" : "pnpm";
const watchCmdArgs =
  process.platform === "win32" ? ["/d", "/s", "/c", "pnpm", ...watchPnpmArgs] : watchPnpmArgs;

const compilerProcess = spawn(watchCmd, watchCmdArgs, {
  cwd,
  env,
  stdio: "inherit",
});

const nodeProcess = spawn(process.execPath, ["--watch", "dist/entry.js", ...args], {
  cwd,
  env,
  stdio: "inherit",
});

let exiting = false;

function cleanup(code = 0) {
  if (exiting) return;
  exiting = true;
  nodeProcess.kill("SIGTERM");
  compilerProcess.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

compilerProcess.on("exit", (code) => {
  if (exiting) return;
  cleanup(code ?? 1);
});

nodeProcess.on("exit", (code, signal) => {
  if (signal || exiting) return;
  cleanup(code ?? 1);
});
