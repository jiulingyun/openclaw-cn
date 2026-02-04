import { logVerbose } from "../../globals.js";
import type { ReplyPayload } from "../types.js";
import type { CommandHandler } from "./commands-types.js";
import {
  getLastTtsAttempt,
  getTtsMaxLength,
  getTtsProvider,
  isSummarizationEnabled,
  isTtsProviderConfigured,
  normalizeTtsAutoMode,
  resolveTtsAutoMode,
  resolveTtsApiKey,
  resolveTtsConfig,
  resolveTtsPrefsPath,
  resolveTtsProviderOrder,
  setLastTtsAttempt,
  setSummarizationEnabled,
  setTtsMaxLength,
  setTtsProvider,
  textToSpeech,
} from "../../tts/tts.js";
import { updateSessionStore } from "../../config/sessions.js";

type ParsedTtsCommand = {
  action: string;
  args: string;
};

function parseTtsCommand(normalized: string): ParsedTtsCommand | null {
  // Accept `/tts` and `/tts <action> [args]` as a single control surface.
  if (normalized === "/tts") return { action: "status", args: "" };
  if (!normalized.startsWith("/tts ")) return null;
  const rest = normalized.slice(5).trim();
  if (!rest) return { action: "status", args: "" };
  const [action, ...tail] = rest.split(/\s+/);
  return { action: action.toLowerCase(), args: tail.join(" ").trim() };
}

function ttsUsage(): ReplyPayload {
  // Keep usage in one place so help/validation stays consistent.
  return {
    text:
      "⚙️ 用法: /tts <off|always|inbound|tagged|status|provider|limit|summary|audio> [参数]" +
      "\n示例:\n" +
      "/tts always\n" +
      "/tts provider openai\n" +
      "/tts provider edge\n" +
      "/tts limit 2000\n" +
      "/tts summary off\n" +
      "/tts audio 你好，这里是 Clawdbot",
  };
}

export const handleTtsCommands: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) return null;
  const parsed = parseTtsCommand(params.command.commandBodyNormalized);
  if (!parsed) return null;

  if (!params.command.isAuthorizedSender) {
    logVerbose(
      `Ignoring TTS command from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  const config = resolveTtsConfig(params.cfg);
  const prefsPath = resolveTtsPrefsPath(config);
  const action = parsed.action;
  const args = parsed.args;

  if (action === "help") {
    return { shouldContinue: false, reply: ttsUsage() };
  }

  const requestedAuto = normalizeTtsAutoMode(
    action === "on" ? "always" : action === "off" ? "off" : action,
  );
  if (requestedAuto) {
    const entry = params.sessionEntry;
    const sessionKey = params.sessionKey;
    const store = params.sessionStore;
    if (entry && store && sessionKey) {
      entry.ttsAuto = requestedAuto;
      entry.updatedAt = Date.now();
      store[sessionKey] = entry;
      if (params.storePath) {
        await updateSessionStore(params.storePath, (store) => {
          store[sessionKey] = entry;
        });
      }
    }
    const label = requestedAuto === "always" ? "已启用 (始终)" : requestedAuto;
    return {
      shouldContinue: false,
      reply: {
        text: requestedAuto === "off" ? "🔇 TTS 已禁用。" : `🔊 TTS ${label}。`,
      },
    };
  }

  if (action === "audio") {
    if (!args.trim()) {
      return { shouldContinue: false, reply: ttsUsage() };
    }

    const start = Date.now();
    const result = await textToSpeech({
      text: args,
      cfg: params.cfg,
      channel: params.command.channel,
      prefsPath,
    });

    if (result.success && result.audioPath) {
      // Store last attempt for `/tts status`.
      setLastTtsAttempt({
        timestamp: Date.now(),
        success: true,
        textLength: args.length,
        summarized: false,
        provider: result.provider,
        latencyMs: result.latencyMs,
      });
      const payload: ReplyPayload = {
        mediaUrl: result.audioPath,
        audioAsVoice: result.voiceCompatible === true,
      };
      return { shouldContinue: false, reply: payload };
    }

    // Store failure details for `/tts status`.
    setLastTtsAttempt({
      timestamp: Date.now(),
      success: false,
      textLength: args.length,
      summarized: false,
      error: result.error,
      latencyMs: Date.now() - start,
    });
    return {
      shouldContinue: false,
      reply: { text: `❌ 生成音频时出错: ${result.error ?? "未知错误"}` },
    };
  }

  if (action === "provider") {
    const currentProvider = getTtsProvider(config, prefsPath);
    if (!args.trim()) {
      const fallback = resolveTtsProviderOrder(currentProvider)
        .slice(1)
        .filter((provider) => isTtsProviderConfigured(config, provider));
      const hasOpenAI = Boolean(resolveTtsApiKey(config, "openai"));
      const hasElevenLabs = Boolean(resolveTtsApiKey(config, "elevenlabs"));
      const hasEdge = isTtsProviderConfigured(config, "edge");
      return {
        shouldContinue: false,
        reply: {
          text:
            `🎙️ TTS 提供商\n` +
            `主要: ${currentProvider}\n` +
            `备选: ${fallback.join(", ") || "无"}\n` +
            `OpenAI 密钥: ${hasOpenAI ? "✅" : "❌"}\n` +
            `ElevenLabs 密钥: ${hasElevenLabs ? "✅" : "❌"}\n` +
            `Edge 已启用: ${hasEdge ? "✅" : "❌"}\n` +
            `用法: /tts provider openai | elevenlabs | edge`,
        },
      };
    }

    const requested = args.trim().toLowerCase();
    if (requested !== "openai" && requested !== "elevenlabs" && requested !== "edge") {
      return { shouldContinue: false, reply: ttsUsage() };
    }

    setTtsProvider(prefsPath, requested);
    const fallback = resolveTtsProviderOrder(requested)
      .slice(1)
      .filter((provider) => isTtsProviderConfigured(config, provider));
    return {
      shouldContinue: false,
      reply: {
        text:
          `✅ TTS 提供商已设置为 ${requested} (备选: ${fallback.join(", ") || "无"})。` +
          (requested === "edge"
            ? "\n在配置中启用 Edge TTS: messages.tts.edge.enabled = true。"
            : ""),
      },
    };
  }

  if (action === "limit") {
    if (!args.trim()) {
      const currentLimit = getTtsMaxLength(prefsPath);
      return {
        shouldContinue: false,
        reply: { text: `📏 TTS 限制: ${currentLimit} 字符。` },
      };
    }
    const next = Number.parseInt(args.trim(), 10);
    if (!Number.isFinite(next) || next < 100 || next > 10_000) {
      return { shouldContinue: false, reply: ttsUsage() };
    }
    setTtsMaxLength(prefsPath, next);
    return {
      shouldContinue: false,
      reply: { text: `✅ TTS 限制已设置为 ${next} 字符。` },
    };
  }

  if (action === "summary") {
    if (!args.trim()) {
      const enabled = isSummarizationEnabled(prefsPath);
      return {
        shouldContinue: false,
        reply: { text: `📝 TTS 自动摘要: ${enabled ? "开启" : "关闭"}。` },
      };
    }
    const requested = args.trim().toLowerCase();
    if (requested !== "on" && requested !== "off") {
      return { shouldContinue: false, reply: ttsUsage() };
    }
    setSummarizationEnabled(prefsPath, requested === "on");
    return {
      shouldContinue: false,
      reply: {
        text: requested === "on" ? "✅ TTS 自动摘要已启用。" : "❌ TTS 自动摘要已禁用。",
      },
    };
  }

  if (action === "status") {
    const sessionAuto = params.sessionEntry?.ttsAuto;
    const autoMode = resolveTtsAutoMode({ config, prefsPath, sessionAuto });
    const enabled = autoMode !== "off";
    const provider = getTtsProvider(config, prefsPath);
    const hasKey = isTtsProviderConfigured(config, provider);
    const providerStatus =
      provider === "edge"
        ? hasKey
          ? "✅ 已启用"
          : "❌ 已禁用"
        : hasKey
          ? "✅ 已配置密钥"
          : "❌ 无密钥";
    const maxLength = getTtsMaxLength(prefsPath);
    const summarize = isSummarizationEnabled(prefsPath);
    const last = getLastTtsAttempt();
    const autoLabel = sessionAuto ? `${autoMode} (会话)` : autoMode;
    const lines = [
      "📊 TTS 状态",
      `自动: ${enabled ? autoLabel : "关闭"}`,
      `提供商: ${provider} (${providerStatus})`,
      `文本限制: ${maxLength} 字符`,
      `自动摘要: ${summarize ? "开启" : "关闭"}`,
    ];
    if (last) {
      const timeAgo = Math.round((Date.now() - last.timestamp) / 1000);
      lines.push("");
      lines.push(`上次尝试 (${timeAgo}秒前): ${last.success ? "✅" : "❌"}`);
      lines.push(`文本: ${last.textLength} 字符${last.summarized ? " (已摘要)" : ""}`);
      if (last.success) {
        lines.push(`提供商: ${last.provider ?? "未知"}`);
        lines.push(`延迟: ${last.latencyMs ?? 0}ms`);
      } else if (last.error) {
        lines.push(`错误: ${last.error}`);
      }
    }
    return { shouldContinue: false, reply: { text: lines.join("\n") } };
  }

  return { shouldContinue: false, reply: ttsUsage() };
};
