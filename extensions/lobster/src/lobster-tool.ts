import { Type } from "@sinclair/typebox";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { ClawdbotPluginApi } from "../../../src/plugins/types.js";

type LobsterEnvelope =
  | {
      ok: true;
      status: "ok" | "needs_approval" | "cancelled";
      output: unknown[];
      requiresApproval: null | {
        type: "approval_request";
        prompt: string;
        items: unknown[];
        resumeToken?: string;
      };
    }
  | {
      ok: false;
      error: { type?: string; message: string };
    };

function resolveExecutablePath(lobsterPathRaw: string | undefined) {
  const lobsterPath = lobsterPathRaw?.trim() || "lobster";
  if (lobsterPath !== "lobster" && !path.isAbsolute(lobsterPath)) {
    throw new Error("lobsterPath must be an absolute path (or omit to use PATH)");
  }
  return lobsterPath;
}

function isFilePath(value: string): boolean {
  try {
    const stat = fs.statSync(value);
    return stat.isFile();
  } catch {
    return false;
  }
}

function resolveWindowsExecutablePath(execPath: string, env: NodeJS.ProcessEnv): string {
  if (execPath.includes("/") || execPath.includes("\\") || path.isAbsolute(execPath)) {
    return execPath;
  }
  const pathValue = env.PATH ?? env.Path ?? process.env.PATH ?? process.env.Path ?? "";
  const pathEntries = pathValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const hasExtension = path.extname(execPath).length > 0;
  const pathExtRaw =
    env.PATHEXT ??
    env.Pathext ??
    process.env.PATHEXT ??
    process.env.Pathext ??
    ".EXE;.CMD;.BAT;.COM";
  const pathExt = hasExtension
    ? [""]
    : pathExtRaw
        .split(";")
        .map((ext) => ext.trim())
        .filter(Boolean)
        .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
  for (const dir of pathEntries) {
    for (const ext of pathExt) {
      for (const candidateExt of [ext, ext.toLowerCase(), ext.toUpperCase()]) {
        const candidate = path.join(dir, `${execPath}${candidateExt}`);
        if (isFilePath(candidate)) {
          return candidate;
        }
      }
    }
  }
  return execPath;
}

function resolveLobsterScriptFromPackageJson(wrapperPath: string): string | null {
  const wrapperDir = path.dirname(wrapperPath);
  const packageDirs = [
    // Local install: <repo>/node_modules/.bin/lobster.cmd -> ../lobster
    path.resolve(wrapperDir, "..", "lobster"),
    // Global npm install: <npm-prefix>/lobster.cmd -> ./node_modules/lobster
    path.resolve(wrapperDir, "node_modules", "lobster"),
  ];
  for (const packageDir of packageDirs) {
    const packageJsonPath = path.join(packageDir, "package.json");
    if (!isFilePath(packageJsonPath)) {
      continue;
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
        bin?: string | Record<string, string>;
      };
      const binField = packageJson.bin;
      const scriptRel =
        typeof binField === "string"
          ? binField
          : typeof binField === "object" && binField
            ? typeof binField.lobster === "string"
              ? binField.lobster
              : (() => {
                  const first = Object.values(binField).find((value) => typeof value === "string");
                  return typeof first === "string" ? first : null;
                })()
            : null;
      if (!scriptRel) {
        continue;
      }
      const scriptPath = path.resolve(packageDir, scriptRel);
      if (isFilePath(scriptPath)) {
        return scriptPath;
      }
    } catch {
      // Ignore malformed package metadata; caller will throw a guided error.
    }
  }
  return null;
}

function resolveLobsterScriptFromCmdShim(wrapperPath: string): string | null {
  if (!isFilePath(wrapperPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(wrapperPath, "utf8");
    // npm-style cmd shims usually reference the script as "%dp0%\\...".
    const candidates: string[] = [];
    const matches = content.matchAll(/"%~?dp0%\\([^"\r\n]+)"/gi);
    for (const match of matches) {
      const relative = match[1];
      if (!relative) {
        continue;
      }
      const normalizedRelative = relative.replace(/[\\/]+/g, path.sep);
      const candidate = path.resolve(path.dirname(wrapperPath), normalizedRelative);
      if (isFilePath(candidate)) {
        candidates.push(candidate);
      }
    }
    const nonNode = candidates.find((candidate) => {
      const base = path.basename(candidate).toLowerCase();
      return base !== "node.exe" && base !== "node";
    });
    if (nonNode) {
      return nonNode;
    }
  } catch {
    // Ignore unreadable shims; caller will throw a guided error.
  }
  return null;
}

function resolveWindowsLobsterSpawn(execPath: string, argv: string[], env: NodeJS.ProcessEnv) {
  const resolvedExecPath = resolveWindowsExecutablePath(execPath, env);
  const ext = path.extname(resolvedExecPath).toLowerCase();
  if (ext !== ".cmd" && ext !== ".bat") {
    return { command: resolvedExecPath, argv };
  }
  const scriptPath =
    resolveLobsterScriptFromCmdShim(resolvedExecPath) ??
    resolveLobsterScriptFromPackageJson(resolvedExecPath);
  if (!scriptPath) {
    throw new Error(
      `lobsterPath resolved to ${path.basename(resolvedExecPath)} wrapper, but no Node entrypoint could be resolved without shell execution. Configure pluginConfig.lobsterPath to lobster.exe.`,
    );
  }
  const entryExt = path.extname(scriptPath).toLowerCase();
  if (entryExt === ".exe") {
    return { command: scriptPath, argv, windowsHide: true };
  }
  return { command: process.execPath, argv: [scriptPath, ...argv], windowsHide: true };
}

async function runLobsterSubprocessOnce(params: {
  execPath: string;
  argv: string[];
  cwd: string;
  timeoutMs: number;
  maxStdoutBytes: number;
}) {
  const { execPath, argv, cwd } = params;
  const timeoutMs = Math.max(200, params.timeoutMs);
  const maxStdoutBytes = Math.max(1024, params.maxStdoutBytes);

  const env = { ...process.env, LOBSTER_MODE: "tool" } as Record<string, string | undefined>;
  const nodeOptions = env.NODE_OPTIONS ?? "";
  if (nodeOptions.includes("--inspect")) {
    delete env.NODE_OPTIONS;
  }
  const spawnTarget =
    process.platform === "win32"
      ? resolveWindowsLobsterSpawn(execPath, argv, env)
      : { command: execPath, argv };

  return await new Promise<{ stdout: string }>((resolve, reject) => {
    const child = spawn(spawnTarget.command, spawnTarget.argv, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env,
      windowsHide: spawnTarget.windowsHide,
    });

    let stdout = "";
    let stdoutBytes = 0;
    let stderr = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk) => {
      const str = String(chunk);
      stdoutBytes += Buffer.byteLength(str, "utf8");
      if (stdoutBytes > maxStdoutBytes) {
        try {
          child.kill("SIGKILL");
        } finally {
          reject(new Error("lobster output exceeded maxStdoutBytes"));
        }
        return;
      }
      stdout += str;
    });

    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } finally {
        reject(new Error("lobster subprocess timed out"));
      }
    }, timeoutMs);

    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`lobster failed (${code ?? "?"}): ${stderr.trim() || stdout.trim()}`));
        return;
      }
      resolve({ stdout });
    });
  });
}

async function runLobsterSubprocess(params: {
  execPath: string;
  argv: string[];
  cwd: string;
  timeoutMs: number;
  maxStdoutBytes: number;
}) {
  return await runLobsterSubprocessOnce(params);
}

function parseEnvelope(stdout: string): LobsterEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("lobster returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("lobster returned invalid JSON envelope");
  }

  const ok = (parsed as { ok?: unknown }).ok;
  if (ok === true || ok === false) {
    return parsed as LobsterEnvelope;
  }

  throw new Error("lobster returned invalid JSON envelope");
}

export function createLobsterTool(api: ClawdbotPluginApi) {
  return {
    name: "lobster",
    description:
      "Run Lobster pipelines as a local-first workflow runtime (typed JSON envelope + resumable approvals).",
    parameters: Type.Object({
      // NOTE: Prefer string enums in tool schemas; some providers reject unions/anyOf.
      action: Type.Unsafe<"run" | "resume">({ type: "string", enum: ["run", "resume"] }),
      pipeline: Type.Optional(Type.String()),
      argsJson: Type.Optional(Type.String()),
      token: Type.Optional(Type.String()),
      approve: Type.Optional(Type.Boolean()),
      lobsterPath: Type.Optional(Type.String()),
      cwd: Type.Optional(Type.String()),
      timeoutMs: Type.Optional(Type.Number()),
      maxStdoutBytes: Type.Optional(Type.Number()),
    }),
    async execute(_id: string, params: Record<string, unknown>) {
      const action = String(params.action || "").trim();
      if (!action) throw new Error("action required");

      const execPath = resolveExecutablePath(
        typeof params.lobsterPath === "string" ? params.lobsterPath : undefined,
      );
      const cwd = typeof params.cwd === "string" && params.cwd.trim() ? params.cwd.trim() : process.cwd();
      const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 20_000;
      const maxStdoutBytes = typeof params.maxStdoutBytes === "number" ? params.maxStdoutBytes : 512_000;

      const argv = (() => {
        if (action === "run") {
          const pipeline = typeof params.pipeline === "string" ? params.pipeline : "";
          if (!pipeline.trim()) throw new Error("pipeline required");
          const argv = ["run", "--mode", "tool", pipeline];
          const argsJson = typeof params.argsJson === "string" ? params.argsJson : "";
          if (argsJson.trim()) {
            argv.push("--args-json", argsJson);
          }
          return argv;
        }
        if (action === "resume") {
          const token = typeof params.token === "string" ? params.token : "";
          if (!token.trim()) throw new Error("token required");
          const approve = params.approve;
          if (typeof approve !== "boolean") throw new Error("approve required");
          return ["resume", "--token", token, "--approve", approve ? "yes" : "no"];
        }
        throw new Error(`Unknown action: ${action}`);
      })();

      if (api.runtime?.version && api.logger?.debug) {
        api.logger.debug(`lobster plugin runtime=${api.runtime.version}`);
      }

      const { stdout } = await runLobsterSubprocess({
        execPath,
        argv,
        cwd,
        timeoutMs,
        maxStdoutBytes,
      });

      const envelope = parseEnvelope(stdout);

      return {
        content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
        details: envelope,
      };
    },
  };
}
