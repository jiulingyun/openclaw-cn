import { registerCommandHandler } from "../process/command-queue.js";
import { runEmbeddedPiAgent } from "./pi-embedded-runner/run.js";
import { compactEmbeddedPiSessionDirect } from "./pi-embedded-runner/compact.js";

// Track recovery notification targets to ensure each user only receives one notification per restart.
const recoveryNotifiedTargets = new Set<string>();

const RECOVERY_NOTICE =
  "🔄 **Service has been restored**\n\n" +
  "Incomplete conversation tasks from before the restart have been detected and automatically recovered. " +
  'Any stale "⏳ Thinking..." cards from previous conversations are now invalid and can be ignored.\n\n' +
  "Below are the replies to previously interrupted messages:";

/**
 * Attempt to create a streaming card session for a recovered Feishu task and inject onBlockReply.
 * Falls back to regular message sending if creation fails (e.g., Feishu credentials unavailable).
 *
 * @returns If a streaming session is successfully created, returns { session, cleanup }; otherwise null.
 */
async function trySetupFeishuStreaming(payload: any): Promise<{
  session: any;
  closedSuccessfully: boolean;
  cleanup: () => Promise<void>;
} | null> {
  const channel = (payload.messageProvider || payload.messageChannel)?.toLowerCase();
  const to = payload.messageTo;
  if (channel !== "feishu" || !to) return null;

  try {
    const { resolveFeishuAccount } = await import("../feishu/accounts.js");
    const { getFeishuClient } = await import("../feishu/client.js");
    const { FeishuStreamingSession } = await import("../feishu/streaming-card.js");
    const { loadConfig } = await import("../config/config.js");
    const cfg = loadConfig();

    const account = resolveFeishuAccount({ cfg, accountId: payload.agentAccountId });
    const { appId, appSecret } = account.config;
    if (!appId || !appSecret) return null;

    const client = getFeishuClient(payload.agentAccountId);
    const session = new FeishuStreamingSession(client, { appId, appSecret });

    // Start the streaming card
    await session.start(to, "chat_id");

    // Accumulate text (onBlockReply sends a complete block each time)
    let accumulatedText = "";

    // Inject onBlockReply into payload so runEmbeddedPiAgent can stream output
    payload.onBlockReply = async (block: { text?: string; mediaUrls?: string[] }) => {
      if (block.text) {
        accumulatedText += block.text;
        await session.update(accumulatedText);
      }
    };

    // Also inject onPartialReply for finer-grained streaming updates
    payload.onPartialReply = async (partial: { text?: string }) => {
      if (partial.text) {
        await session.update(accumulatedText + partial.text);
      }
    };

    const result = { session, closedSuccessfully: false, cleanup: async () => {} };

    result.cleanup = async () => {
      try {
        if (session.isActive()) {
          const closed = await session.close(accumulatedText || undefined);
          result.closedSuccessfully = closed;
          if (!closed) {
            console.warn(
              `[queue-recovery] streaming card close failed, will fallback to routeReply`,
            );
          }
        }
      } catch (err) {
        console.warn(`[queue-recovery] streaming session cleanup error: ${String(err)}`);
      }
    };

    return result;
  } catch (err) {
    console.warn(`[queue-recovery] failed to setup feishu streaming: ${String(err)}`);
    return null;
  }
}

export function initializeAgentHandlers() {
  registerCommandHandler("EMBEDDED_PI_RUN", async (payload: any) => {
    // When dequeued from persistent queue, callback functions (onBlockReply, etc.) are lost.
    // We detect this condition and reconstruct reply routing after execution.
    const isRecoveredFromPersistentQueue = !payload.onBlockReply && !payload.enqueue;

    if (!payload.enqueue) {
      payload.enqueue = <T>(_taskType: string, _p: any, _opts?: any): Promise<T> => {
        // Direct execute - bypass re-enqueue. Return resolved promise since
        // the outer runEmbeddedPiAgent will do the actual work.
        return Promise.resolve(undefined as T);
      };
    }

    // For recovered Feishu tasks, attempt to create a streaming card for real-time streaming replies
    let streamingSetup: Awaited<ReturnType<typeof trySetupFeishuStreaming>> = null;
    if (isRecoveredFromPersistentQueue) {
      streamingSetup = await trySetupFeishuStreaming(payload);
    }

    const result = await runEmbeddedPiAgent(payload);

    // Clean up streaming session
    if (streamingSetup) {
      await streamingSetup.cleanup();
    }

    // When recovered from persistent queue, route final payloads back to the
    // originating channel (e.g. feishu) since the original dispatcher/callbacks are lost.
    // If the streaming card has already successfully displayed content, skip duplicate sending.
    const streamingSucceeded = streamingSetup?.closedSuccessfully === true;
    if (isRecoveredFromPersistentQueue && result.payloads?.length && !streamingSucceeded) {
      const channel = payload.messageProvider || payload.messageChannel;
      const to = payload.messageTo;
      if (channel && to) {
        try {
          const { routeReply } = await import("../auto-reply/reply/route-reply.js");
          const { loadConfig } = await import("../config/config.js");
          const cfg = loadConfig();

          // Send a one-time recovery notification per target (channel:to combination).
          const targetKey = `${channel}:${to}`;
          if (!recoveryNotifiedTargets.has(targetKey)) {
            recoveryNotifiedTargets.add(targetKey);
            await routeReply({
              payload: { text: RECOVERY_NOTICE },
              channel,
              to,
              sessionKey: payload.sessionKey,
              accountId: payload.agentAccountId,
              threadId: payload.messageThreadId,
              cfg,
            });
          }

          for (const p of result.payloads) {
            if (!p.text?.trim() && !p.mediaUrls?.length) continue;
            const routeResult = await routeReply({
              payload: p,
              channel,
              to,
              sessionKey: payload.sessionKey,
              accountId: payload.agentAccountId,
              threadId: payload.messageThreadId,
              cfg,
            });
            if (!routeResult.ok) {
              console.warn(
                `[queue-recovery] route-reply failed for recovered task: ${routeResult.error}`,
              );
            } else {
              console.log(`[queue-recovery] successfully routed reply back to ${channel}:${to}`);
            }
          }
        } catch (err) {
          console.error(`[queue-recovery] failed to route reply for recovered task:`, err);
        }
      }
    }

    return result;
  });

  registerCommandHandler("EMBEDDED_PI_COMPACT", async (payload: any) => {
    // CompactSessionParams is passed as payload
    return compactEmbeddedPiSessionDirect(payload);
  });
}
