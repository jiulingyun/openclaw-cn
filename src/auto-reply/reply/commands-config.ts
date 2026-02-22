import {
  readConfigFileSnapshot,
  validateConfigObjectWithPlugins,
  writeConfigFile,
} from "../../config/config.js";
import {
  getConfigValueAtPath,
  parseConfigPath,
  setConfigValueAtPath,
  unsetConfigValueAtPath,
} from "../../config/config-paths.js";
import {
  getConfigOverrides,
  resetConfigOverrides,
  setConfigOverride,
  unsetConfigOverride,
} from "../../config/runtime-overrides.js";
import { resolveChannelConfigWrites } from "../../channels/plugins/config-writes.js";
import { normalizeChannelId } from "../../channels/registry.js";
import { rejectUnauthorizedCommand, requireCommandFlagEnabled } from "./command-gates.js";
import type { CommandHandler } from "./commands-types.js";
import { parseConfigCommand } from "./config-commands.js";
import { parseDebugCommand } from "./debug-commands.js";

export const handleConfigCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) return null;
  const configCommand = parseConfigCommand(params.command.commandBodyNormalized);
  if (!configCommand) return null;
  const unauthorized = rejectUnauthorizedCommand(params, "/config");
  if (unauthorized) return unauthorized;
  const configDisabled = requireCommandFlagEnabled(params.cfg, {
    label: "/config",
    configKey: "config",
  });
  if (configDisabled) return configDisabled;
  if (configCommand.action === "error") {
    return {
      shouldContinue: false,
      reply: { text: `⚠️ ${configCommand.message}` },
    };
  }

  if (configCommand.action === "set" || configCommand.action === "unset") {
    const channelId = params.command.channelId ?? normalizeChannelId(params.command.channel);
    const allowWrites = resolveChannelConfigWrites({
      cfg: params.cfg,
      channelId,
      accountId: params.ctx.AccountId,
    });
    if (!allowWrites) {
      const channelLabel = channelId ?? "此渠道";
      const hint = channelId
        ? `channels.${channelId}.configWrites=true`
        : "channels.<channel>.configWrites=true";
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ ${channelLabel} 的配置写入已禁用。设置 ${hint} 以启用。`,
        },
      };
    }
  }

  const snapshot = await readConfigFileSnapshot();
  if (!snapshot.valid || !snapshot.parsed || typeof snapshot.parsed !== "object") {
    return {
      shouldContinue: false,
      reply: {
        text: "⚠️ 配置文件无效；请先修复后再使用 /config。",
      },
    };
  }
  const parsedBase = structuredClone(snapshot.parsed as Record<string, unknown>);

  if (configCommand.action === "show") {
    const pathRaw = configCommand.path?.trim();
    if (pathRaw) {
      const parsedPath = parseConfigPath(pathRaw);
      if (!parsedPath.ok || !parsedPath.path) {
        return {
          shouldContinue: false,
          reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` },
        };
      }
      const value = getConfigValueAtPath(parsedBase, parsedPath.path);
      const rendered = JSON.stringify(value ?? null, null, 2);
      return {
        shouldContinue: false,
        reply: {
          text: `⚙️ 配置 ${pathRaw}:\n\`\`\`json\n${rendered}\n\`\`\``,
        },
      };
    }
    const json = JSON.stringify(parsedBase, null, 2);
    return {
      shouldContinue: false,
      reply: { text: `⚙️ 配置 (原始):\n\`\`\`json\n${json}\n\`\`\`` },
    };
  }

  if (configCommand.action === "unset") {
    const parsedPath = parseConfigPath(configCommand.path);
    if (!parsedPath.ok || !parsedPath.path) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` },
      };
    }
    const removed = unsetConfigValueAtPath(parsedBase, parsedPath.path);
    if (!removed) {
      return {
        shouldContinue: false,
        reply: { text: `⚙️ 未找到 ${configCommand.path} 的配置值。` },
      };
    }
    const validated = validateConfigObjectWithPlugins(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ 删除后配置无效 (${issue.path}: ${issue.message})。`,
        },
      };
    }
    await writeConfigFile(validated.config);
    return {
      shouldContinue: false,
      reply: { text: `⚙️ 配置已更新: ${configCommand.path} 已删除。` },
    };
  }

  if (configCommand.action === "set") {
    const parsedPath = parseConfigPath(configCommand.path);
    if (!parsedPath.ok || !parsedPath.path) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${parsedPath.error ?? "Invalid path."}` },
      };
    }
    setConfigValueAtPath(parsedBase, parsedPath.path, configCommand.value);
    const validated = validateConfigObjectWithPlugins(parsedBase);
    if (!validated.ok) {
      const issue = validated.issues[0];
      return {
        shouldContinue: false,
        reply: {
          text: `⚠️ 设置后配置无效 (${issue.path}: ${issue.message})。`,
        },
      };
    }
    await writeConfigFile(validated.config);
    const valueLabel =
      typeof configCommand.value === "string"
        ? `"${configCommand.value}"`
        : JSON.stringify(configCommand.value);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ 配置已更新: ${configCommand.path}=${valueLabel ?? "null"}`,
      },
    };
  }

  return null;
};

export const handleDebugCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) return null;
  const debugCommand = parseDebugCommand(params.command.commandBodyNormalized);
  if (!debugCommand) return null;
  const unauthorized = rejectUnauthorizedCommand(params, "/debug");
  if (unauthorized) return unauthorized;
  const debugDisabled = requireCommandFlagEnabled(params.cfg, {
    label: "/debug",
    configKey: "debug",
  });
  if (debugDisabled) return debugDisabled;
  if (debugCommand.action === "error") {
    return {
      shouldContinue: false,
      reply: { text: `⚠️ ${debugCommand.message}` },
    };
  }
  if (debugCommand.action === "show") {
    const overrides = getConfigOverrides();
    const hasOverrides = Object.keys(overrides).length > 0;
    if (!hasOverrides) {
      return {
        shouldContinue: false,
        reply: { text: "⚙️ 调试覆盖: (无)" },
      };
    }
    const json = JSON.stringify(overrides, null, 2);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ 调试覆盖 (仅内存):\n\`\`\`json\n${json}\n\`\`\``,
      },
    };
  }
  if (debugCommand.action === "reset") {
    resetConfigOverrides();
    return {
      shouldContinue: false,
      reply: { text: "⚙️ 调试覆盖已清除；使用磁盘上的配置。" },
    };
  }
  if (debugCommand.action === "unset") {
    const result = unsetConfigOverride(debugCommand.path);
    if (!result.ok) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${result.error ?? "无效路径。"}` },
      };
    }
    if (!result.removed) {
      return {
        shouldContinue: false,
        reply: {
          text: `⚙️ 未找到 ${debugCommand.path} 的调试覆盖。`,
        },
      };
    }
    return {
      shouldContinue: false,
      reply: { text: `⚙️ 已删除 ${debugCommand.path} 的调试覆盖。` },
    };
  }
  if (debugCommand.action === "set") {
    const result = setConfigOverride(debugCommand.path, debugCommand.value);
    if (!result.ok) {
      return {
        shouldContinue: false,
        reply: { text: `⚠️ ${result.error ?? "无效覆盖。"}` },
      };
    }
    const valueLabel =
      typeof debugCommand.value === "string"
        ? `"${debugCommand.value}"`
        : JSON.stringify(debugCommand.value);
    return {
      shouldContinue: false,
      reply: {
        text: `⚙️ 调试覆盖已设置: ${debugCommand.path}=${valueLabel ?? "null"}`,
      },
    };
  }

  return null;
};
