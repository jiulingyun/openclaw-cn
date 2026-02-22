import { describe, expect, it } from "vitest";
import { sanitizeEnv, buildNodeInvokeResultParams } from "./runner.js";

describe("node-host sanitizeEnv", () => {
  it("ignores PATH overrides", () => {
    const prev = process.env.PATH;
    process.env.PATH = "/usr/bin";
    try {
      const env = sanitizeEnv({ PATH: "/tmp/evil" });
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
      const env = sanitizeEnv({
        PYTHONPATH: "/tmp/pwn",
        LD_PRELOAD: "/tmp/pwn.so",
        FOO: "bar",
      });
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

  it("blocks startup-file injection vars from overrides", () => {
    const env = sanitizeEnv({
      BASH_ENV: "/tmp/evil.sh",
      ENV: "/tmp/evil.sh",
      GCONV_PATH: "/tmp/evil",
      IFS: "x",
      SSLKEYLOGFILE: "/tmp/keys",
      NODE_PATH: "/tmp/evil",
      RUBYLIB: "/tmp/evil",
    });
    expect(env.BASH_ENV).toBeUndefined();
    expect(env.ENV).toBeUndefined();
    expect(env.GCONV_PATH).toBeUndefined();
    expect(env.IFS).toBeUndefined();
    expect(env.SSLKEYLOGFILE).toBeUndefined();
    expect(env.NODE_PATH).toBeUndefined();
    expect(env.RUBYLIB).toBeUndefined();
  });

  it("blocks BASH_FUNC_ prefix from overrides", () => {
    const env = sanitizeEnv({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "BASH_FUNC_evil%%": "() { /tmp/pwn; }",
      SAFE: "value",
    });
    expect(env["BASH_FUNC_evil%%"]).toBeUndefined();
    expect(env.SAFE).toBe("value");
  });

  it("strips dangerous vars inherited from base environment", () => {
    const prevBashEnv = process.env.BASH_ENV;
    const prevLdPreload = process.env.LD_PRELOAD;
    try {
      process.env.BASH_ENV = "/tmp/evil.sh";
      process.env.LD_PRELOAD = "/tmp/evil.so";
      const env = sanitizeEnv(null);
      expect(env.BASH_ENV).toBeUndefined();
      expect(env.LD_PRELOAD).toBeUndefined();
    } finally {
      if (prevBashEnv === undefined) {
        delete process.env.BASH_ENV;
      } else {
        process.env.BASH_ENV = prevBashEnv;
      }
      if (prevLdPreload === undefined) {
        delete process.env.LD_PRELOAD;
      } else {
        process.env.LD_PRELOAD = prevLdPreload;
      }
    }
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
