import {
  installLaunchAgent,
  isLaunchAgentLoaded,
  readLaunchAgentProgramArguments,
  readLaunchAgentRuntime,
  restartLaunchAgent,
  stopLaunchAgent,
  uninstallLaunchAgent,
} from "./launchd.js";
import {
  installScheduledTask,
  isScheduledTaskInstalled,
  readScheduledTaskCommand,
  readScheduledTaskRuntime,
  restartScheduledTask,
  stopScheduledTask,
  uninstallScheduledTask,
} from "./schtasks.js";
import type { GatewayServiceRuntime } from "./service-runtime.js";
import {
  installSystemdService,
  isSystemdServiceEnabled,
  readSystemdServiceExecStart,
  readSystemdServiceRuntime,
  restartSystemdService,
  stopSystemdService,
  uninstallSystemdService,
} from "./systemd.js";

export type GatewayServiceInstallArgs = {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  programArguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string | undefined>;
  description?: string;
};

export type GatewayService = {
  label: string;
  loadedText: string;
  notLoadedText: string;
  install: (args: GatewayServiceInstallArgs) => Promise<void>;
  uninstall: (args: {
    env: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  stop: (args: {
    env?: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  restart: (args: {
    env?: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  isLoaded: (args: { env?: Record<string, string | undefined> }) => Promise<boolean>;
  readCommand: (env: Record<string, string | undefined>) => Promise<{
    programArguments: string[];
    workingDirectory?: string;
    environment?: Record<string, string>;
    sourcePath?: string;
  } | null>;
  readRuntime: (env: Record<string, string | undefined>) => Promise<GatewayServiceRuntime>;
};

export function resolveGatewayService(): GatewayService {
  if (process.platform === "darwin") {
    return {
      label: "LaunchAgent",
      loadedText: "loaded",
      notLoadedText: "not loaded",
      install: async (args) => {
        await installLaunchAgent(args);
      },
      uninstall: async (args) => {
        await uninstallLaunchAgent(args);
      },
      stop: async (args) => {
        await stopLaunchAgent({
          stdout: args.stdout,
          env: args.env,
        });
      },
      restart: async (args) => {
        await restartLaunchAgent({
          stdout: args.stdout,
          env: args.env,
        });
      },
      isLoaded: async (args) => isLaunchAgentLoaded(args),
      readCommand: readLaunchAgentProgramArguments,
      readRuntime: readLaunchAgentRuntime,
    };
  }

  if (process.platform === "linux") {
    return {
      label: "systemd",
      loadedText: "enabled",
      notLoadedText: "disabled",
      install: async (args) => {
        try {
          await installSystemdService(args);
        } catch (error) {
          // 提供更友好的错误信息，特别是针对Ubuntu
          const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
          let enhancedError = error instanceof Error ? error.message : String(error);
          
          // 添加Ubuntu特定提示
          if (errorMsg.includes("ubuntu") || errorMsg.includes("debian")) {
            enhancedError += "\n\nUbuntu/Debian 用户请注意:";
            enhancedError += "\n1. 确保已启用用户linger: sudo loginctl enable-linger $USER";
            enhancedError += "\n2. 创建用户目录: mkdir -p ~/.config/systemd/user";
            enhancedError += "\n3. 重启用户服务: systemctl --user daemon-reexec";
          }
          
          // 添加WSL2特定提示
          if (errorMsg.includes("wsl") || errorMsg.includes("not been booted")) {
            enhancedError += "\n\nWSL2 用户请注意:";
            enhancedError += "\n1. 编辑 /etc/wsl.conf 添加:";
            enhancedError += "\n   [boot]";
            enhancedError += "\n   systemd=true";
            enhancedError += "\n2. 重启WSL: wsl --shutdown";
            enhancedError += "\n3. 重新打开WSL终端";
          }
          
          // 添加通用替代方案
          enhancedError += "\n\n替代方案:";
          enhancedError += "\n• 使用前台模式: openclaw-cn gateway run";
          enhancedError += "\n• 使用其他进程管理器 (pm2, supervisor等)";
          enhancedError += "\n• 手动创建systemd服务文件";
          
          throw new Error(enhancedError);
        }
      },
      uninstall: async (args) => {
        await uninstallSystemdService(args);
      },
      stop: async (args) => {
        await stopSystemdService({
          stdout: args.stdout,
          env: args.env,
        });
      },
      restart: async (args) => {
        await restartSystemdService({
          stdout: args.stdout,
          env: args.env,
        });
      },
      isLoaded: async (args) => isSystemdServiceEnabled(args),
      readCommand: readSystemdServiceExecStart,
      readRuntime: async (env) => await readSystemdServiceRuntime(env),
    };
  }

  if (process.platform === "win32") {
    return {
      label: "Scheduled Task",
      loadedText: "registered",
      notLoadedText: "missing",
      install: async (args) => {
        await installScheduledTask(args);
      },
      uninstall: async (args) => {
        await uninstallScheduledTask(args);
      },
      stop: async (args) => {
        await stopScheduledTask({
          stdout: args.stdout,
          env: args.env,
        });
      },
      restart: async (args) => {
        await restartScheduledTask({
          stdout: args.stdout,
          env: args.env,
        });
      },
      isLoaded: async (args) => isScheduledTaskInstalled(args),
      readCommand: readScheduledTaskCommand,
      readRuntime: async (env) => await readScheduledTaskRuntime(env),
    };
  }

  throw new Error(`Gateway service install not supported on ${process.platform}`);
}

/**
 * 获取Linux平台友好的服务安装指南
 */
export function getLinuxServiceInstallGuide(): {
  title: string;
  sections: Array<{
    title: string;
    steps?: string[];
    notes?: string[];
    options?: Array<{
      name: string;
      command?: string;
      description: string;
    }>;
  }>;
} {
  const guide = {
    title: "Linux系统服务安装指南",
    sections: [
      {
        title: "systemd用户服务 (推荐)",
        steps: [
          "1. 启用用户linger: sudo loginctl enable-linger $USER",
          "2. 创建配置目录: mkdir -p ~/.config/systemd/user",
          "3. 安装服务: openclaw-cn gateway install",
          "4. 验证状态: systemctl --user status openclaw-gateway"
        ],
        notes: [
          "• 适用于大多数现代Linux发行版",
          "• 需要systemd版本>=239",
          "• 用户注销后服务仍可运行"
        ]
      },
      {
        title: "WSL2特定配置",
        steps: [
          "1. 编辑 /etc/wsl.conf:",
          "   [boot]",
          "   systemd=true",
          "2. 重启WSL: wsl --shutdown",
          "3. 重新打开WSL终端",
          "4. 按照systemd用户服务步骤继续"
        ]
      },
      {
        title: "替代方案",
        options: [
          {
            name: "前台模式",
            command: "openclaw-cn gateway run",
            description: "在前台运行网关，适合测试和容器环境"
          },
          {
            name: "PM2进程管理器",
            command: "pm2 start ~/.config/openclaw/run.sh --name openclaw",
            description: "功能丰富的Node.js进程管理器"
          },
          {
            name: "手动systemd服务",
            description: "手动创建~/.config/systemd/user/openclaw.service文件"
          }
        ]
      }
    ]
  };
  
  return guide;
}
