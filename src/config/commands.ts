import type { ChannelId } from "../channels/plugins/types.js";
import { normalizeChannelId } from "../channels/plugins/index.js";
import type { NativeCommandsSetting } from "./types.js";

export type CommandFlagKey = "bash" | "config" | "debug";

export function isCommandFlagEnabled(
  cfg: { commands?: unknown } | undefined,
  key: CommandFlagKey,
): boolean {
  const commands = cfg?.commands;
  if (!commands || typeof commands !== "object") return false;
  // Use hasOwnProperty to prevent prototype-pollution enabling privileged commands.
  if (!Object.prototype.hasOwnProperty.call(commands, key)) return false;
  return (commands as Record<string, unknown>)[key] === true;
}

function resolveAutoDefault(providerId?: ChannelId): boolean {
  const id = normalizeChannelId(providerId);
  if (!id) return false;
  if (id === "discord" || id === "telegram") return true;
  if (id === "slack") return false;
  return false;
}

export function resolveNativeSkillsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  return resolveAutoDefault(providerId);
}

export function resolveNativeCommandsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  // auto or undefined -> heuristic
  return resolveAutoDefault(providerId);
}

export function isNativeCommandsExplicitlyDisabled(params: {
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerSetting, globalSetting } = params;
  if (providerSetting === false) return true;
  if (providerSetting === undefined) return globalSetting === false;
  return false;
}
