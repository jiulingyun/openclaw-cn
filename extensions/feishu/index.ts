// Support both openclaw (upstream) and openclaw-cn (Chinese fork)
// @ts-ignore - dynamic import resolution
import type { ClawdbotPluginApi } from "openclaw/plugin-sdk";
// @ts-ignore - dynamic import resolution
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { feishuPlugin } from "./src/channel.js";
import { setFeishuRuntime } from "./src/runtime.js";
// Core document & knowledge modules
import { registerFeishuDocTools } from "./src/docx.js";
import { registerFeishuDriveTools } from "./src/drive.js";
import { registerFeishuWikiTools } from "./src/wiki.js";
import { registerFeishuPermTools } from "./src/perm.js";
import { registerFeishuBitableTools } from "./src/bitable.js";
// Enhanced modules
import { registerFeishuImTools } from "./src/im.js";
import { registerFeishuTaskTools } from "./src/task.js";
import { registerFeishuCalendarTools } from "./src/calendar.js";
import { registerFeishuSheetsTools } from "./src/sheets.js";


const plugin = {
  id: "feishu",
  name: "Feishu",
  description: "Feishu (Larksuite) channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setFeishuRuntime(api.runtime);
    api.registerChannel({ plugin: feishuPlugin });

    // Register all tool modules
    const registrations = [
      registerFeishuDocTools,
      registerFeishuDriveTools,
      registerFeishuWikiTools,
      registerFeishuPermTools,
      registerFeishuBitableTools,
      registerFeishuImTools,
      registerFeishuTaskTools,
      registerFeishuCalendarTools,
      registerFeishuSheetsTools,
    ];

    for (const register of registrations) {
      try {
        register(api as any);
      } catch (e) {
        console.error(`[feishu] tool registration failed: ${register.name}`, e);
      }
    }
    // Log directly to console to ensure visibility during startup
    console.log(`[feishu] plugins registered: ${registrations.length} modules loaded`);
  },
};

export default plugin;
