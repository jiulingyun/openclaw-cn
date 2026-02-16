import type { OpenClawConfig as ClawdbotConfig } from "openclaw/plugin-sdk";
export type DownloadImageResult = {
    buffer: Buffer;
    contentType?: string;
};
export type DownloadMessageResourceResult = {
    buffer: Buffer;
    contentType?: string;
    fileName?: string;
};
/**
 * Download an image from Feishu using image_key.
 * Used for downloading images sent in messages.
 */
export declare function downloadImageFeishu(params: {
    cfg: ClawdbotConfig;
    imageKey: string;
    accountId?: string;
}): Promise<DownloadImageResult>;
/**
 * Download a message resource (file/image/audio/video) from Feishu.
 * Used for downloading files, audio, and video from messages.
 */
export declare function downloadMessageResourceFeishu(params: {
    cfg: ClawdbotConfig;
    messageId: string;
    fileKey: string;
    type: "image" | "file";
    accountId?: string;
}): Promise<DownloadMessageResourceResult>;
export type UploadImageResult = {
    imageKey: string;
};
export type UploadFileResult = {
    fileKey: string;
};
export type SendMediaResult = {
    messageId: string;
    chatId: string;
};
/**
 * Upload an image to Feishu and get an image_key for sending.
 * Supports: JPEG, PNG, WEBP, GIF, TIFF, BMP, ICO
 */
export declare function uploadImageFeishu(params: {
    cfg: ClawdbotConfig;
    image: Buffer | string;
    imageType?: "message" | "avatar";
    accountId?: string;
}): Promise<UploadImageResult>;
/**
 * Upload a file to Feishu and get a file_key for sending.
 * Max file size: 30MB
 */
export declare function uploadFileFeishu(params: {
    cfg: ClawdbotConfig;
    file: Buffer | string;
    fileName: string;
    fileType: "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream";
    duration?: number;
    accountId?: string;
}): Promise<UploadFileResult>;
/**
 * Send an image message using an image_key
 */
export declare function sendImageFeishu(params: {
    cfg: ClawdbotConfig;
    to: string;
    imageKey: string;
    replyToMessageId?: string;
    accountId?: string;
}): Promise<SendMediaResult>;
/**
 * Send a file message using a file_key
 */
export declare function sendFileFeishu(params: {
    cfg: ClawdbotConfig;
    to: string;
    fileKey: string;
    replyToMessageId?: string;
    accountId?: string;
}): Promise<SendMediaResult>;
/**
 * Helper to detect file type from extension
 */
export declare function detectFileType(fileName: string): "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream";
/**
 * Upload and send media (image or file) from URL, local path, or buffer
 */
export declare function sendMediaFeishu(params: {
    cfg: ClawdbotConfig;
    to: string;
    mediaUrl?: string;
    mediaBuffer?: Buffer;
    fileName?: string;
    replyToMessageId?: string;
    accountId?: string;
}): Promise<SendMediaResult>;
//# sourceMappingURL=media.d.ts.map