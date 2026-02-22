import { beforeEach, describe, expect, it, vi } from "vitest";
import { BROWSER_BRIDGES } from "./browser-bridges.js";
import { ensureSandboxBrowser } from "./browser.js";
import { resetNoVncObserverTokensForTests } from "./novnc-auth.js";
import type { SandboxConfig } from "./types.js";

const dockerMocks = vi.hoisted(() => ({
  dockerContainerState: vi.fn(),
  execDocker: vi.fn(),
  readDockerContainerEnvVar: vi.fn(),
  readDockerPort: vi.fn(),
}));

const registryMocks = vi.hoisted(() => ({
  updateBrowserRegistry: vi.fn(),
}));

const bridgeMocks = vi.hoisted(() => ({
  startBrowserBridgeServer: vi.fn(),
  stopBrowserBridgeServer: vi.fn(),
}));

vi.mock("./docker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./docker.js")>();
  return {
    ...actual,
    dockerContainerState: dockerMocks.dockerContainerState,
    execDocker: dockerMocks.execDocker,
    readDockerContainerEnvVar: dockerMocks.readDockerContainerEnvVar,
    readDockerPort: dockerMocks.readDockerPort,
  };
});

vi.mock("./registry.js", () => ({
  updateBrowserRegistry: registryMocks.updateBrowserRegistry,
}));

vi.mock("../../browser/bridge-server.js", () => ({
  startBrowserBridgeServer: bridgeMocks.startBrowserBridgeServer,
  stopBrowserBridgeServer: bridgeMocks.stopBrowserBridgeServer,
}));

function buildConfig(enableNoVnc: boolean): SandboxConfig {
  return {
    mode: "all",
    scope: "session",
    workspaceAccess: "none",
    workspaceRoot: "/tmp/openclaw-sandboxes",
    docker: {
      image: "clawdbot-sandbox:bookworm-slim",
      containerPrefix: "clawdbot-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp", "/var/tmp", "/run"],
      network: "none",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
    },
    browser: {
      enabled: true,
      image: "clawdbot-sandbox-browser:bookworm-slim",
      containerPrefix: "clawdbot-sbx-browser-",
      cdpPort: 9222,
      vncPort: 5900,
      noVncPort: 6080,
      headless: false,
      enableNoVnc,
      allowHostControl: false,
      autoStart: true,
      autoStartTimeoutMs: 12_000,
    },
    tools: {
      allow: ["browser"],
      deny: [],
    },
    prune: {
      idleHours: 24,
      maxAgeDays: 7,
    },
  };
}

function envEntriesFromDockerArgs(args: string[]): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "-e" && typeof args[i + 1] === "string") {
      values.push(args[i + 1]);
    }
  }
  return values;
}

describe("ensureSandboxBrowser 创建参数", () => {
  beforeEach(() => {
    BROWSER_BRIDGES.clear();
    resetNoVncObserverTokensForTests();
    dockerMocks.dockerContainerState.mockReset();
    dockerMocks.execDocker.mockReset();
    dockerMocks.readDockerContainerEnvVar.mockReset();
    dockerMocks.readDockerPort.mockReset();
    registryMocks.updateBrowserRegistry.mockReset();
    bridgeMocks.startBrowserBridgeServer.mockReset();
    bridgeMocks.stopBrowserBridgeServer.mockReset();

    dockerMocks.dockerContainerState.mockResolvedValue({ exists: false, running: false });
    dockerMocks.execDocker.mockImplementation(async (args: string[]) => {
      if (args[0] === "image" && args[1] === "inspect") {
        return { stdout: "[]", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    dockerMocks.readDockerContainerEnvVar.mockResolvedValue(null);
    dockerMocks.readDockerPort.mockImplementation(async (_containerName: string, port: number) => {
      if (port === 9222) {
        return 49100;
      }
      if (port === 6080) {
        return 49101;
      }
      return null;
    });
    registryMocks.updateBrowserRegistry.mockResolvedValue(undefined);
    bridgeMocks.startBrowserBridgeServer.mockResolvedValue({
      server: {} as never,
      port: 19000,
      baseUrl: "http://127.0.0.1:19000",
      state: {
        server: null,
        port: 19000,
        resolved: { profiles: {} },
        profiles: new Map(),
      },
    });
    bridgeMocks.stopBrowserBridgeServer.mockResolvedValue(undefined);
  });

  it("将 noVNC 发布到回环地址并注入 noVNC 密码环境变量", async () => {
    const result = await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg: buildConfig(true),
    });

    const createArgs = dockerMocks.execDocker.mock.calls.find(
      (call: unknown[]) => Array.isArray(call[0]) && call[0][0] === "create",
    )?.[0] as string[] | undefined;

    expect(createArgs).toBeDefined();
    expect(createArgs).toContain("127.0.0.1::6080");
    const envEntries = envEntriesFromDockerArgs(createArgs ?? []);
    const passwordEntry = envEntries.find((entry) =>
      entry.startsWith("CLAWDBOT_BROWSER_NOVNC_PASSWORD="),
    );
    expect(passwordEntry).toMatch(/^CLAWDBOT_BROWSER_NOVNC_PASSWORD=[a-f0-9]{8}$/);
    expect(result?.noVncUrl).toMatch(/^http:\/\/127\.0\.0\.1:19000\/sandbox\/novnc\?token=/);
    expect(result?.noVncUrl).not.toContain("password=");
  });

  it("禁用 noVNC 时不注入密码环境变量", async () => {
    const result = await ensureSandboxBrowser({
      scopeKey: "session:test",
      workspaceDir: "/tmp/workspace",
      agentWorkspaceDir: "/tmp/workspace",
      cfg: buildConfig(false),
    });

    const createArgs = dockerMocks.execDocker.mock.calls.find(
      (call: unknown[]) => Array.isArray(call[0]) && call[0][0] === "create",
    )?.[0] as string[] | undefined;
    const envEntries = envEntriesFromDockerArgs(createArgs ?? []);
    expect(envEntries.some((entry) => entry.startsWith("CLAWDBOT_BROWSER_NOVNC_PASSWORD="))).toBe(
      false,
    );
    expect(result?.noVncUrl).toBeUndefined();
  });
});
