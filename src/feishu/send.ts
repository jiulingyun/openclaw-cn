import type { Client } from "@larksuiteoapi/node-sdk";
import { Readable } from "node:stream";
import { getChildLogger } from "../logging.js";
import { loadWebMedia } from "../web/media.js";
import { mediaKindFromMime } from "../media/constants.js";
import { containsMarkdown, markdownToFeishuPost } from "./format.js";

const logger = getChildLogger({ module: "feishu-send" });

export type FeishuMsgType = "text" | "image" | "file" | "audio" | "media" | "post" | "interactive";

export type FeishuSendOpts = {
  msgType?: FeishuMsgType;
  receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  /** URL of media to upload and send (for image/file/audio/media types) */
  mediaUrl?: string;
  /** Max bytes for media download */
  maxBytes?: number;
  /** Whether to auto-convert Markdown to rich text (post). Default: true */
  autoRichText?: boolean;
  /** Message ID to reply to (uses reply API instead of create). */
  replyToMessageId?: string;
};

export type FeishuSendResult = {
  message_id?: string;
};

/**
 * Upload an image to Feishu and get image_key
 */
export async function uploadImageFeishu(client: Client, imageBuffer: Buffer): Promise<string> {
  // Convert Buffer to Readable stream - Feishu SDK's axios requires streams for multipart uploads
  const imageStream = Readable.from(imageBuffer);

  const res = await client.im.image.create({
    data: {
      image_type: "message",
      image: imageStream as any,
    },
  });

  if (!res?.image_key) {
    throw new Error(`Feishu image upload failed: no image_key returned`);
  }
  return res.image_key;
}

/**
 * Upload a file to Feishu and get file_key
 * @param fileType - opus (audio), mp4 (video), pdf, doc, xls, ppt, stream (other)
 */
export async function uploadFileFeishu(
  client: Client,
  fileBuffer: Buffer,
  fileName: string,
  fileType: "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream",
  duration?: number,
): Promise<string> {
  logger.info(
    `Uploading file to Feishu: name=${fileName}, type=${fileType}, size=${fileBuffer.length}`,
  );

  // Convert Buffer to Readable stream - Feishu SDK's axios requires streams for multipart uploads
  const fileStream = Readable.from(fileBuffer);

  let res: any;
  try {
    res = await client.im.file.create({
      data: {
        file_type: fileType,
        file_name: fileName,
        file: fileStream as any,
        ...(duration ? { duration } : {}),
      },
    });
  } catch (err: any) {
    // Log the full error details
    logger.error(`Feishu file upload exception: ${err?.message || err}`);
    if (err?.response?.data) {
      logger.error(`Response data: ${JSON.stringify(err.response.data)}`);
    }
    if (err?.response?.status) {
      logger.error(`Response status: ${err.response.status}`);
    }
    throw new Error(`Feishu file upload failed: ${err?.message || err}`);
  }

  // Log full response for debugging
  logger.info(`Feishu file upload response: ${JSON.stringify(res)}`);

  // Check for API error code
  if (res?.code !== undefined && res.code !== 0) {
    const code = res.code;
    const msg = res.msg || "unknown error";
    logger.error(`Feishu file upload API error: code=${code}, msg=${msg}`);
    throw new Error(`Feishu file upload failed: ${msg} (code: ${code})`);
  }

  if (!res?.file_key) {
    logger.error(`Feishu file upload failed - no file_key in response: ${JSON.stringify(res)}`);
    throw new Error(`Feishu file upload failed: no file_key returned`);
  }

  logger.info(`Feishu file upload successful: file_key=${res.file_key}`);
  return res.file_key;
}

/**
 * Determine Feishu file_type from content type
 */
function resolveFeishuFileType(
  contentType?: string,
  fileName?: string,
): "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream" {
  const ct = contentType?.toLowerCase() ?? "";
  const fn = fileName?.toLowerCase() ?? "";

  // Audio - Feishu only supports opus for audio messages
  if (ct.includes("audio/") || fn.endsWith(".opus") || fn.endsWith(".ogg")) {
    return "opus";
  }
  // Video
  if (ct.includes("video/") || fn.endsWith(".mp4") || fn.endsWith(".mov")) {
    return "mp4";
  }
  // Documents
  if (ct.includes("pdf") || fn.endsWith(".pdf")) return "pdf";
  if (
    ct.includes("msword") ||
    ct.includes("wordprocessingml") ||
    fn.endsWith(".doc") ||
    fn.endsWith(".docx")
  ) {
    return "doc";
  }
  if (
    ct.includes("excel") ||
    ct.includes("spreadsheetml") ||
    fn.endsWith(".xls") ||
    fn.endsWith(".xlsx")
  ) {
    return "xls";
  }
  if (
    ct.includes("powerpoint") ||
    ct.includes("presentationml") ||
    fn.endsWith(".ppt") ||
    fn.endsWith(".pptx")
  ) {
    return "ppt";
  }

  return "stream";
}

/**
 * Send a message to Feishu
 */
export async function sendMessageFeishu(
  client: Client,
  receiveId: string,
  content: any,
  opts: FeishuSendOpts = {},
): Promise<FeishuSendResult | null> {
  const receiveIdType = opts.receiveIdType || "chat_id";
  let msgType = opts.msgType || "text";
  let finalContent = content;

  // Handle media URL - upload first, then send
  if (opts.mediaUrl) {
    try {
      logger.info(`Loading media from: ${opts.mediaUrl}`);
      const media = await loadWebMedia(opts.mediaUrl, opts.maxBytes);
      const kind = mediaKindFromMime(media.contentType ?? undefined);
      const fileName = media.fileName ?? "file";
      logger.info(
        `Media loaded: kind=${kind}, contentType=${media.contentType}, fileName=${fileName}, size=${media.buffer.length}`,
      );

      if (kind === "image") {
        // Upload image and send as image message
        const imageKey = await uploadImageFeishu(client, media.buffer);
        msgType = "image";
        finalContent = { image_key: imageKey };
      } else if (kind === "video") {
        // Upload video file and send as media message
        const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "mp4");
        msgType = "media";
        finalContent = { file_key: fileKey };
      } else if (kind === "audio") {
        // Feishu audio messages (msg_type: "audio") only support opus format
        // For other audio formats (mp3, wav, etc.), send as file instead
        const isOpus =
          media.contentType?.includes("opus") ||
          media.contentType?.includes("ogg") ||
          fileName.toLowerCase().endsWith(".opus") ||
          fileName.toLowerCase().endsWith(".ogg");

        if (isOpus) {
          logger.info(`Uploading opus audio: ${fileName}`);
          const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "opus");
          logger.info(`Opus upload successful, file_key: ${fileKey}`);
          msgType = "audio";
          finalContent = { file_key: fileKey };
        } else {
          // Send non-opus audio as file attachment
          logger.info(`Uploading non-opus audio as file: ${fileName}`);
          const fileKey = await uploadFileFeishu(client, media.buffer, fileName, "stream");
          logger.info(`File upload successful, file_key: ${fileKey}`);
          msgType = "file";
          finalContent = { file_key: fileKey };
        }
      } else {
        // Upload as file
        const fileType = resolveFeishuFileType(media.contentType, fileName);
        const fileKey = await uploadFileFeishu(client, media.buffer, fileName, fileType);
        msgType = "file";
        finalContent = { file_key: fileKey };
      }

      // If there's text alongside media, we need to send two messages
      // First send the media, then send text as a follow-up
      if (content?.text && typeof content.text === "string" && content.text.trim()) {
        // Send media first
        const mediaRes = await client.im.message.create({
          params: { receive_id_type: receiveIdType },
          data: {
            receive_id: receiveId,
            msg_type: msgType,
            content: JSON.stringify(finalContent),
          },
        });

        if (mediaRes.code !== 0) {
          logger.error(`Feishu media send failed: ${mediaRes.code} - ${mediaRes.msg}`);
          throw new Error(`Feishu API Error: ${mediaRes.msg}`);
        }

        // Then send text
        const textRes = await client.im.message.create({
          params: { receive_id_type: receiveIdType },
          data: {
            receive_id: receiveId,
            msg_type: "text",
            content: JSON.stringify({ text: content.text }),
          },
        });

        return textRes.data ?? null;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      logger.error(`Feishu media upload/send error: ${errMsg}`);
      if (errStack) logger.error(`Stack: ${errStack}`);
      // Re-throw the error instead of falling back to text
      // This makes debugging easier and prevents silent failures
      throw new Error(`Feishu media upload failed: ${errMsg}`);
    }
  }

  // Auto-convert Markdown to rich text if enabled and content is text with Markdown
  const autoRichText = opts.autoRichText !== false;
  if (
    autoRichText &&
    msgType === "text" &&
    finalContent?.text &&
    typeof finalContent.text === "string" &&
    containsMarkdown(finalContent.text)
  ) {
    try {
      const postContent = markdownToFeishuPost(finalContent.text);
      msgType = "post";
      finalContent = postContent;
      logger.debug(`Converted Markdown to Feishu post format`);
    } catch (err) {
      logger.warn(`Failed to convert Markdown to post, falling back to text: ${String(err)}`);
      // Fall back to plain text
    }
  }

  const contentStr = typeof finalContent === "string" ? finalContent : JSON.stringify(finalContent);

  try {
    // Use reply API if replyToMessageId is provided (for message quoting)
    if (opts.replyToMessageId) {
      const res = await client.im.message.reply({
        path: { message_id: opts.replyToMessageId },
        data: {
          msg_type: msgType,
          content: contentStr,
        },
      });

      if (res.code !== 0) {
        logger.error(`Feishu reply failed: ${res.code} - ${res.msg}`);
        throw new Error(`Feishu API Error: ${res.msg}`);
      }
      return res.data ?? null;
    }

    // Default: create new message
    const res = await client.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: receiveId,
        msg_type: msgType,
        content: contentStr,
      },
    });

    if (res.code !== 0) {
      logger.error(`Feishu send failed: ${res.code} - ${res.msg}`);
      throw new Error(`Feishu API Error: ${res.msg}`);
    }
    return res.data ?? null;
  } catch (err) {
    logger.error(`Feishu send error: ${String(err)}`);
    throw err;
  }
}
