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

    // Remove internal prefix like "user:" or "chat:"
    let realTo = to;
    if (realTo.startsWith("user:")) realTo = realTo.substring(5);
    else if (realTo.startsWith("chat:")) realTo = realTo.substring(5);

    // Determine idType based on the prefix of 'to'
    let idType = "chat_id";
    if (realTo.startsWith("ou_")) idType = "open_id";
    else if (realTo.startsWith("on_")) idType = "union_id";
    else if (realTo.includes("@")) idType = "email";

    // Start the streaming card
    await session.start(realTo, idType as any);

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

    const result = { session, closedSuccessfully: false, cleanup: async () => { } };

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
    // If this task was created BEFORE the gateway process started, the persistent queue
    // backend specifically injects __isRecoveredTask to clearly identify historical items.
    // This strict check prevents newly dispatched items in persistent mode from triggering
    // the "Service has been restored" fallback recovery path incorrectly.
    const isRecoveredFromPersistentQueue = payload.__isRecoveredTask === true;

    if (!payload.enqueue) {
      payload.enqueue = <T>(_taskType: string, _p: any, _opts?: any): Promise<T> => {
        // Direct execute - bypass re-enqueue. Return resolved promise since
        // the outer runEmbeddedPiAgent will do the actual work.
        return Promise.resolve(undefined as T);
      };
    }

    // Tasks dispatched by runEmbeddedPiAgent itself (via enqueueSession/enqueueGlobal)
    // have __dispatchedViaQueue set. The actual agent execution happens in the outer
    // .then(async () => { ... }) of runEmbeddedPiAgent – not here in the handler.
    // Returning early prevents the agent from running 3x (once per handler + once in .then()).
    if (payload.__dispatchedViaQueue) {
      return undefined;
    }

    // For tasks that lost their callback functions due to serialization (e.g. persistent queue),
    // attempt to recreate the streaming card session if they are targeting Feishu.
    const isMissingCallbacks = !payload.onBlockReply && !payload.onPartialReply;
    let streamingSetup: Awaited<ReturnType<typeof trySetupFeishuStreaming>> = null;
    if (isMissingCallbacks) {
      streamingSetup = await trySetupFeishuStreaming(payload);
    }

    // Send a one-time recovery notification BEFORE agent execution so the user
    // sees the "service restored" message regardless of whether streaming succeeds.
    if (isRecoveredFromPersistentQueue) {
      const channel = payload.messageProvider || payload.messageChannel;
      const to = payload.messageTo;
      if (channel && to) {
        const targetKey = `${channel}:${to}`;
        if (!recoveryNotifiedTargets.has(targetKey)) {
          recoveryNotifiedTargets.add(targetKey);
          try {
            const { routeReply } = await import("../auto-reply/reply/route-reply.js");
            const { loadConfig } = await import("../config/config.js");
            const cfg = loadConfig();
            await routeReply({
              payload: { text: RECOVERY_NOTICE },
              channel,
              to,
              sessionKey: payload.sessionKey,
              accountId: payload.agentAccountId,
              threadId: payload.messageThreadId,
              cfg,
            });
            console.log(`[queue-recovery] sent recovery notification to ${channel}:${to}`);
          } catch (notifyErr) {
            console.warn(
              `[queue-recovery] failed to send recovery notification: ${String(notifyErr)}`,
            );
          }
        }
      }
    }

    const { isShuttingDownState } = await import("../process/command-queue.js");

    const result = await runEmbeddedPiAgent(payload);

    // If the agent was aborted due to process shutdown, throw so the task
    // stays in RUNNING state and can be recovered on next startup.
    if (result.meta?.aborted && isShuttingDownState()) {
      throw new Error("__SHUTDOWN_ABORT__");
    }

    // Clean up streaming session
    if (streamingSetup) {
      await streamingSetup.cleanup();
    }

    // Route final payloads back to the originating channel since callbacks are lost.
    // If the streaming card has already successfully displayed content, skip duplicate sending.
    const streamingSucceeded = streamingSetup?.closedSuccessfully === true;
    if (isMissingCallbacks && result.payloads?.length && !streamingSucceeded) {
      const channel = payload.messageProvider || payload.messageChannel;
      const to = payload.messageTo;
      if (channel && to) {
        try {
          const { routeReply } = await import("../auto-reply/reply/route-reply.js");
          const { loadConfig } = await import("../config/config.js");
          const cfg = loadConfig();

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
