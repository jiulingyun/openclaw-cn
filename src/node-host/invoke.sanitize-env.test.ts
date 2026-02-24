import { describe, expect, it } from "vitest";
import { sanitizeEnv, isShellWrapperArgv, buildNodeInvokeResultParams } from "./runner.js";

describe("node-host sanitizeEnv", () => {
  it("ignores PATH overrides", () => {
    const prev = process.env.PATH;
    process.env.PATH = "/usr/bin";
    try {
      const env = sanitizeEnv({ PATH: "/tmp/evil" }) ?? {};
      expect(env.PATH).toBe("/usr/bin");
    } finally {
      if (prev === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = prev;
      }
    }
  });

  it("blocks dangerous env keys/prefixes", () => {
    const prevPythonPath = process.env.PYTHONPATH;
    const prevLdPreload = process.env.LD_PRELOAD;
    try {
      delete process.env.PYTHONPATH;
      delete process.env.LD_PRELOAD;
      const env =
        sanitizeEnv({
          PYTHONPATH: "/tmp/pwn",
          LD_PRELOAD: "/tmp/pwn.so",
          FOO: "bar",
        }) ?? {};
      expect(env.FOO).toBe("bar");
      expect(env.PYTHONPATH).toBeUndefined();
      expect(env.LD_PRELOAD).toBeUndefined();
    } finally {
      if (prevPythonPath === undefined) {
        delete process.env.PYTHONPATH;
      } else {
        process.env.PYTHONPATH = prevPythonPath;
      }
      if (prevLdPreload === undefined) {
        delete process.env.LD_PRELOAD;
      } else {
        process.env.LD_PRELOAD = prevLdPreload;
      }
    }
  });

  it("blocks SHELLOPTS and PS4", () => {
    delete process.env.SHELLOPTS;
    delete process.env.PS4;
    const env = sanitizeEnv({ SHELLOPTS: "xtrace", PS4: "$(touch /tmp/pwned)", FOO: "bar" }) ?? {};
    expect(env.SHELLOPTS).toBeUndefined();
    expect(env.PS4).toBeUndefined();
    expect(env.FOO).toBe("bar");
  });

  it("restricts overrides to allowlist for shell wrapper commands", () => {
    delete process.env.OPENCLAW_TOKEN;
    delete process.env.LANG;
    const env =
      sanitizeEnv(
        {
          LANG: "C",
          LC_ALL: "C",
          OPENCLAW_TOKEN: "secret",
          PS4: "$(touch /tmp/pwned)",
        },
        true,
      ) ?? {};
    expect(env.LANG).toBe("C");
    expect(env.LC_ALL).toBe("C");
    expect(env.OPENCLAW_TOKEN).toBeUndefined();
    expect(env.PS4).toBeUndefined();
  });

  it("allows regular overrides for non-shell-wrapper commands", () => {
    delete process.env.OPENCLAW_TOKEN;
    const env = sanitizeEnv({ OPENCLAW_TOKEN: "secret" }, false) ?? {};
    expect(env.OPENCLAW_TOKEN).toBe("secret");
  });
});

describe("isShellWrapperArgv", () => {
  it("detects bash -c as shell wrapper", () => {
    expect(isShellWrapperArgv(["bash", "-c", "echo hi"])).toBe(true);
    expect(isShellWrapperArgv(["/bin/bash", "-c", "echo hi"])).toBe(true);
  });

  it("detects sh -c and zsh -c as shell wrappers", () => {
    expect(isShellWrapperArgv(["/bin/sh", "-c", "echo hi"])).toBe(true);
    expect(isShellWrapperArgv(["zsh", "-lc", "echo hi"])).toBe(true);
  });

  it("does not treat non-shell commands as wrappers", () => {
    expect(isShellWrapperArgv(["jq", ".foo"])).toBe(false);
    expect(isShellWrapperArgv(["node", "script.js"])).toBe(false);
  });

  it("does not treat bare shell without -c as wrapper", () => {
    expect(isShellWrapperArgv(["bash", "-l"])).toBe(false);
  });
});

describe("buildNodeInvokeResultParams", () => {
  it("omits optional fields when null/undefined", () => {
    const params = buildNodeInvokeResultParams(
      { id: "invoke-1", nodeId: "node-1", command: "system.run" },
      { ok: true, payloadJSON: null, error: null },
    );

    expect(params).toEqual({ id: "invoke-1", nodeId: "node-1", ok: true });
    expect("payloadJSON" in params).toBe(false);
    expect("error" in params).toBe(false);
  });

  it("includes payloadJSON when provided", () => {
    const params = buildNodeInvokeResultParams(
      { id: "invoke-2", nodeId: "node-2", command: "system.run" },
      { ok: true, payloadJSON: '{"ok":true}' },
    );

    expect(params.payloadJSON).toBe('{"ok":true}');
  });

  it("includes payload when provided", () => {
    const params = buildNodeInvokeResultParams(
      { id: "invoke-3", nodeId: "node-3", command: "system.run" },
      { ok: false, payload: { reason: "bad" } },
    );

    expect(params.payload).toEqual({ reason: "bad" });
  });
});
