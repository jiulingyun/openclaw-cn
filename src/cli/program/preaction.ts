import type { Command } from "commander";
import { defaultRuntime } from "../../runtime.js";
import { emitCliBanner } from "../banner.js";
import { getCommandPath, getVerboseFlag, hasHelpOrVersion } from "../argv.js";
import { ensureConfigReady } from "./config-guard.js";
import { ensurePluginRegistryLoaded } from "../plugin-registry.js";
import { isTruthyEnvValue } from "../../infra/env.js";
import { setVerbose } from "../../globals.js";

function setProcessTitleForCommand(actionCommand: Command) {
  let current: Command = actionCommand;
  while (current.parent && current.parent.parent) {
    current = current.parent;
  }
  const name = current.name();
  if (!name || name === "clawdbot") return;
  process.title = `clawdbot-${name}`;
}

// Commands that need channel plugins loaded
const PLUGIN_REQUIRED_COMMANDS = new Set(["message", "channels", "directory"]);

export function registerPreActionHooks(program: Command, programVersion: string) {
  program.hook("preAction", async (_thisCommand, actionCommand) => {
    setProcessTitleForCommand(actionCommand);
    const argv = process.argv;
    if (hasHelpOrVersion(argv)) return;
    const commandPath = getCommandPath(argv, 2);
    const hideBanner =
      isTruthyEnvValue(process.env.OPENCLAW_HIDE_BANNER) ||
      commandPath[0] === "update" ||
      (commandPath[0] === "plugins" && commandPath[1] === "update");
    if (!hideBanner) {
      emitCliBanner(programVersion);
    }
    const verbose = getVerboseFlag(argv, { includeDebug: true });
    setVerbose(verbose);
    if (!verbose) {
      process.env.NODE_NO_WARNINGS ??= "1";
    }
    if (commandPath[0] === "doctor") return;
    await ensureConfigReady({ runtime: defaultRuntime, commandPath });
    // Load plugins for commands that need channel access
    if (PLUGIN_REQUIRED_COMMANDS.has(commandPath[0])) {
      ensurePluginRegistryLoaded();
    }

    // Initialize command queue mode
    // Priority: environment variable > openclaw.json > default (memory)
    try {
      const { loadConfig } = await import("../../config/io.js");
      const cfg = loadConfig();
      const queueConfig = cfg?.queue;
      const queueMode = process.env.OPENCLAW_QUEUE_MODE?.trim() || queueConfig?.mode || "memory";

      const { setQueueMode } = await import("../../process/queue-backend.js");
      const customDbPath =
        process.env.OPENCLAW_QUEUE_DB_PATH?.trim() || queueConfig?.dbPath || undefined;
      await setQueueMode(queueMode as "memory" | "persistent", customDbPath);

      // Handler registration is independent of queue mode; drainLane needs to find handlers in both modes
      const { initializeAgentHandlers } = await import("../../agents/handlers.js");
      initializeAgentHandlers();

      // Only persistent mode needs to recover tasks interrupted by the previous shutdown
      if (queueMode === "persistent") {
        const { queueBackend } = await import("../../process/queue-backend.js");
        const { resetAllLanes } = await import("../../process/command-queue.js");

        const autoRecover =
          process.env.OPENCLAW_QUEUE_AUTO_RECOVER !== "false" && queueConfig?.autoRecover !== false;

        if (autoRecover) {
          // 1. Reset RUNNING tasks left over from the previous crash back to PENDING
          const affectedLanes = queueBackend().recoverRunningTasks();
          const pendingLanes = queueBackend().getPendingLanes();
          const totalLanes = new Set([...affectedLanes, ...pendingLanes]);

          if (totalLanes.size > 0) {
            console.log(
              `[queue-recovery] recovered ${affectedLanes.length} lanes with RUNNING tasks, ${pendingLanes.length} lanes with PENDING tasks`,
            );
          }

          // 2. Trigger queue consumption (no notifications, silent recovery execution)
          // Handlers are registered above; resetAllLanes will drain all lanes
          resetAllLanes();

          // 3. Recover messages previously queued in the followup queue (in-memory)
          // These messages were persisted in the pending_followup table
          try {
            const queueDb = await import("../../process/queue-db.js");
            const pendingFollowups = queueDb.getAllPendingFollowups();
            if (pendingFollowups.length > 0) {
              console.log(
                `[queue-recovery] found ${pendingFollowups.length} pending followup item(s), recovering...`,
              );
              const { resolveEmbeddedSessionLane } = await import("../../agents/pi-embedded.js");

              for (const row of pendingFollowups) {
                try {
                  const followupRun = JSON.parse(row.payload);
                  const run = followupRun.run;
                  if (!run) continue;

                  // Build EMBEDDED_PI_RUN payload, consistent with queueEmbeddedPiMessage
                  const taskPayload = {
                    sessionId: run.sessionId,
                    sessionKey: run.sessionKey,
                    messageProvider: run.messageProvider,
                    messageTo: followupRun.originatingTo,
                    messageThreadId: followupRun.originatingThreadId,
                    messageChatType: followupRun.originatingChatType,
                    agentAccountId: run.agentAccountId,
                    groupId: run.groupId,
                    groupChannel: run.groupChannel,
                    groupSpace: run.groupSpace,
                    sessionFile: run.sessionFile,
                    workspaceDir: run.workspaceDir,
                    config: run.config,
                    skillsSnapshot: run.skillsSnapshot,
                    prompt: followupRun.prompt,
                    extraSystemPrompt: run.extraSystemPrompt,
                    ownerNumbers: run.ownerNumbers,
                    enforceFinalTag: run.enforceFinalTag,
                    provider: run.provider,
                    model: run.model,
                    authProfileId: run.authProfileId,
                    authProfileIdSource: run.authProfileIdSource,
                    thinkLevel: run.thinkLevel,
                    verboseLevel: run.verboseLevel,
                    reasoningLevel: run.reasoningLevel,
                    execOverrides: run.execOverrides,
                    bashElevated: run.bashElevated,
                    timeoutMs: run.timeoutMs,
                    blockReplyBreak: run.blockReplyBreak,
                    senderId: run.senderId,
                    senderName: run.senderName,
                  };

                  // Insert into the command queue for the corresponding session lane
                  const lane = resolveEmbeddedSessionLane(run.sessionKey || run.sessionId);
                  queueBackend().insertTask(lane, "EMBEDDED_PI_RUN", taskPayload);
                  console.log(
                    `[queue-recovery] re-queued followup item for lane=${lane} (prompt preview: "${followupRun.prompt?.slice(0, 60)}...")`,
                  );
                } catch (itemErr) {
                  console.warn(
                    `[queue-recovery] failed to recover followup item id=${row.id}: ${String(itemErr)}`,
                  );
                }
              }

              // Clear all recovered pending followup items
              queueDb.clearAllPendingFollowups();
              console.log(`[queue-recovery] cleared pending_followup table after recovery`);

              // Re-trigger drain to consume newly inserted tasks
              resetAllLanes();
            }
          } catch (followupErr) {
            console.warn(
              `[queue-recovery] failed to recover pending followups: ${String(followupErr)}`,
            );
          }
        }
      }
    } catch {
      // better-sqlite3 is an optional dependency; silently ignore if not available in the environment
    }
  });
}
