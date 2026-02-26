import type { Client } from "@larksuiteoapi/node-sdk";
import { saveMediaBuffer } from "../media/store.js";
import { getChildLogger } from "../logging.js";

const logger = getChildLogger({ module: "feishu-download" });

export type FeishuMediaRef = {
  path: string;
  contentType?: string;
  placeholder: string;
};

/**
 * Download a resource from a user message using messageResource.get
 * This is the correct API for downloading resources from messages sent by users.
 *
 * @param type - Resource type: "image", "file", "audio", or "video"
 *
 * Note: Feishu API only accepts two values for the type parameter:
 * - "image": for images in messages or rich text
 * - "file": for files, audio, and video
 *
 * See: https://open.feishu.cn/document/server-docs/im-v1/message/get
 */
export async function downloadFeishuMessageResource(
  client: Client,
  messageId: string,
  fileKey: string,
  type: "image" | "file" | "audio" | "video",
  maxBytes: number = 30 * 1024 * 1024,
): Promise<FeishuMediaRef> {
  // Feishu API type parameter: "image" for images, "file" for everything else (audio, video, file)
  const apiType = type === "image" ? "image" : "file";
  logger.debug(
    `Downloading Feishu ${type} (API type: ${apiType}): messageId=${messageId}, fileKey=${fileKey}`,
  );

  const res = await client.im.messageResource.get({
    params: { type: apiType },
    path: {
      message_id: messageId,
      file_key: fileKey,
    },
  });

  if (!res) {
    throw new Error(`Failed to get ${type} resource: no response`);
  }

  const stream = res.getReadableStream();
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of stream) {
    totalSize += chunk.length;
    if (totalSize > maxBytes) {
      throw new Error(`${type} resource exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`);
    }
    chunks.push(Buffer.from(chunk));
  }

  const buffer = Buffer.concat(chunks);

  // Try to detect content type from headers
  const contentType =
    res.headers?.["content-type"] ?? res.headers?.["Content-Type"] ?? getDefaultContentType(type);

  const saved = await saveMediaBuffer(buffer, contentType, "inbound", maxBytes);

  return {
    path: saved.path,
    contentType: saved.contentType,
    placeholder: getPlaceholder(type),
  };
}

function getDefaultContentType(type: string): string {
  switch (type) {
    case "image":
      return "image/jpeg";
    case "audio":
      return "audio/ogg";
    case "video":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function getPlaceholder(type: string): string {
  switch (type) {
    case "image":
      return "<media:image>";
    case "audio":
      return "<media:audio>";
    case "video":
      return "<media:video>";
    default:
      return "<media:document>";
  }
}

/**
 * Extract image keys from a post (rich text) message content.
 * Handles both direct format { title, content } and locale-wrapped format { post: { zh_cn: { title, content } } }
 */
export function extractPostImageKeys(content: any): string[] {
  const imageKeys: string[] = [];

  // Try to find the actual post content
  // Format 1: { post: { zh_cn: { title, content } } }
  // Format 2: { title, content } (direct)
  let postData = content;
  if (content.post && typeof content.post === "object") {
    // Find the first locale key (zh_cn, en_us, etc.)
    const localeKey = Object.keys(content.post).find(
      (key) => content.post[key]?.content || content.post[key]?.title,
    );
    if (localeKey) {
      postData = content.post[localeKey];
    }
  }

  // Extract image_key from content blocks
  if (Array.isArray(postData.content)) {
    for (const line of postData.content) {
      if (!Array.isArray(line)) continue;
      for (const element of line) {
        if (element.tag === "img" && element.image_key) {
          imageKeys.push(element.image_key);
        }
      }
    }
  }

  return imageKeys;
}

/**
 * Download embedded images from a post (rich text) message.
 * Returns an array of downloaded media references.
 */
export async function downloadPostImages(
  client: Client,
  messageId: string,
  imageKeys: string[],
  maxBytes: number = 30 * 1024 * 1024,
  maxImages: number = 5,
): Promise<FeishuMediaRef[]> {
  const results: FeishuMediaRef[] = [];
  const keysToDownload = imageKeys.slice(0, maxImages);

  for (const imageKey of keysToDownload) {
    try {
      const media = await downloadFeishuMessageResource(
        client,
        messageId,
        imageKey,
        "image",
        maxBytes,
      );
      results.push(media);
    } catch (err) {
      logger.error(`Failed to download post image ${imageKey}: ${String(err)}`);
    }
  }

  return results;
}

/**
 * Resolve media from a Feishu message
 * Returns the downloaded media reference or null if no media
 *
 * Uses messageResource.get API to download resources from user messages.
 */
export async function resolveFeishuMedia(
  client: Client,
  message: any,
  maxBytes: number = 30 * 1024 * 1024,
): Promise<FeishuMediaRef | null> {
  const msgType = message.message_type;
  const messageId = message.message_id;

  if (!messageId) {
    logger.warn(`Cannot download media: message_id is missing`);
    return null;
  }

  try {
    if (msgType === "image") {
      // Image message: content = { image_key: "..." }
      const content = JSON.parse(message.content);
      if (content.image_key) {
        return await downloadFeishuMessageResource(
          client,
          messageId,
          content.image_key,
          "image",
          maxBytes,
        );
      }
    } else if (msgType === "file") {
      // File message: content = { file_key: "...", file_name: "..." }
      const content = JSON.parse(message.content);
      if (content.file_key) {
        return await downloadFeishuMessageResource(
          client,
          messageId,
          content.file_key,
          "file",
          maxBytes,
        );
      }
    } else if (msgType === "audio") {
      // Audio message: content = { file_key: "..." }
      const content = JSON.parse(message.content);
      if (content.file_key) {
        return await downloadFeishuMessageResource(
          client,
          messageId,
          content.file_key,
          "audio",
          maxBytes,
        );
      }
    } else if (msgType === "media") {
      // Video message: content = { file_key: "...", image_key: "..." (thumbnail) }
      const content = JSON.parse(message.content);
      if (content.file_key) {
        return await downloadFeishuMessageResource(
          client,
          messageId,
          content.file_key,
          "video",
          maxBytes,
        );
      }
    } else if (msgType === "sticker") {
      // Sticker - not supported for download via messageResource API
      logger.debug(`Sticker messages are not supported for download`);
      return null;
    }
  } catch (err) {
    logger.error(`Failed to resolve Feishu media (${msgType}): ${String(err)}`);
  }

  return null;
}
