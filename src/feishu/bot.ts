import * as Lark from "@larksuiteoapi/node-sdk";
import { getFeishuClient, toLarkDomain } from "./client.js";
import { getChildLogger } from "../logging.js";
import { processFeishuMessage } from "./message.js";
import type { FeishuDomain } from "../config/types.feishu.js";

const logger = getChildLogger({ module: "feishu-bot" });

export type FeishuBotOptions = {
  appId: string;
  appSecret: string;
  domain?: FeishuDomain;
};

export function createFeishuBot(opts: FeishuBotOptions) {
  const { appId, appSecret, domain } = opts;
  const client = getFeishuClient(appId, appSecret, domain);

  const eventDispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      try {
        await processFeishuMessage(client, data, appId);
      } catch (err) {
        logger.error(`Error processing Feishu message: ${String(err)}`);
      }
    },
  });

  const wsClient = new Lark.WSClient({
    appId,
    appSecret,
    domain: toLarkDomain(domain),
    logger: {
      debug: (...args) => {
        logger.debug(args.join(" "));
      },
      info: (...args) => {
        logger.info(args.join(" "));
      },
      warn: (...args) => {
        logger.warn(args.join(" "));
      },
      error: (...args) => {
        logger.error(args.join(" "));
      },
      trace: (...args) => {
        logger.silly(args.join(" "));
      },
    },
  });

  return { client, wsClient, eventDispatcher };
}

export async function startFeishuBot(bot: ReturnType<typeof createFeishuBot>) {
  logger.info("Starting Feishu bot WS client...");
  await bot.wsClient.start({
    eventDispatcher: bot.eventDispatcher,
  });
}
