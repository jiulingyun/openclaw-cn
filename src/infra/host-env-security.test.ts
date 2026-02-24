import { describe, expect, it } from "vitest";
import {
  isDangerousHostEnvOverrideVarName,
  isDangerousHostEnvVarName,
  normalizeEnvVarKey,
  sanitizeHostExecEnv,
} from "./host-env-security.js";

describe("sanitizeHostExecEnv", () => {
  it("blocks dangerous env keys", () => {
    const env = sanitizeHostExecEnv({
      baseEnv: {},
      overrides: {
        BASH_ENV: "/tmp/pwn.sh",
        NODE_OPTIONS: "--require /tmp/pwn.js",
        SAFE: "ok",
      },
    });
    expect(env.BASH_ENV).toBeUndefined();
    expect(env.NODE_OPTIONS).toBeUndefined();
    expect(env.SAFE).toBe("ok");
  });

  it("blocks PATH overrides by default", () => {
    const env = sanitizeHostExecEnv({
      baseEnv: { PATH: "/usr/bin:/bin" },
      overrides: { PATH: "/tmp/evil", SAFE: "ok" },
    });
    expect(env.PATH).toBe("/usr/bin:/bin");
    expect(env.SAFE).toBe("ok");
  });

  it("blocks HOME and ZDOTDIR overrides", () => {
    const env = sanitizeHostExecEnv({
      baseEnv: {
        PATH: "/usr/bin:/bin",
        HOME: "/tmp/trusted-home",
        ZDOTDIR: "/tmp/trusted-zdotdir",
      },
      overrides: {
        PATH: "/tmp/evil",
        HOME: "/tmp/evil-home",
        ZDOTDIR: "/tmp/evil-zdotdir",
        BASH_ENV: "/tmp/pwn.sh",
        SAFE: "ok",
      },
    });
    expect(env.PATH).toBe("/usr/bin:/bin");
    expect(env.BASH_ENV).toBeUndefined();
    expect(env.SAFE).toBe("ok");
    expect(env.HOME).toBe("/tmp/trusted-home");
    expect(env.ZDOTDIR).toBe("/tmp/trusted-zdotdir");
  });

  it("drops non-portable env key names", () => {
    const env = sanitizeHostExecEnv({
      baseEnv: {},
      overrides: {
        "INVALID KEY": "x",
        "ALSO-INVALID": "x",
        VALID: "yes",
      },
    });
    expect(env["INVALID KEY"]).toBeUndefined();
    expect(env["ALSO-INVALID"]).toBeUndefined();
    expect(env.VALID).toBe("yes");
  });

  it("blocks dangerous prefixes", () => {
    const env = sanitizeHostExecEnv({
      baseEnv: {},
      overrides: {
        DYLD_INSERT_LIBRARIES: "/tmp/pwn.dylib",
        LD_PRELOAD: "/tmp/pwn.so",
        SAFE: "ok",
      },
    });
    expect(env.DYLD_INSERT_LIBRARIES).toBeUndefined();
    expect(env.LD_PRELOAD).toBeUndefined();
    expect(env.SAFE).toBe("ok");
  });
});

describe("isDangerousHostEnvOverrideVarName", () => {
  it("matches override-only blocked keys case-insensitively", () => {
    expect(isDangerousHostEnvOverrideVarName("HOME")).toBe(true);
    expect(isDangerousHostEnvOverrideVarName("zdotdir")).toBe(true);
    expect(isDangerousHostEnvOverrideVarName("BASH_ENV")).toBe(false);
    expect(isDangerousHostEnvOverrideVarName("FOO")).toBe(false);
  });
});

describe("isDangerousHostEnvVarName", () => {
  it("matches blocked keys and prefixes", () => {
    expect(isDangerousHostEnvVarName("BASH_ENV")).toBe(true);
    expect(isDangerousHostEnvVarName("NODE_OPTIONS")).toBe(true);
    expect(isDangerousHostEnvVarName("LD_PRELOAD")).toBe(true);
    expect(isDangerousHostEnvVarName("DYLD_INSERT_LIBRARIES")).toBe(true);
    expect(isDangerousHostEnvVarName("HOME")).toBe(false);
    expect(isDangerousHostEnvVarName("FOO")).toBe(false);
  });
});

describe("normalizeEnvVarKey", () => {
  it("normalizes and validates keys", () => {
    expect(normalizeEnvVarKey("  OPENROUTER_API_KEY  ")).toBe("OPENROUTER_API_KEY");
    expect(normalizeEnvVarKey("")).toBeNull();
    expect(normalizeEnvVarKey("INVALID KEY")).toBeNull();
    expect(normalizeEnvVarKey("VALID_KEY_123")).toBe("VALID_KEY_123");
  });
});
