import type * as Lark from "@larksuiteoapi/node-sdk";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import { Readable } from "stream";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { FeishuDocSchema, type FeishuDocParams } from "./doc-schema.js";
import { resolveToolsConfig } from "./tools-config.js";

// ============ Helpers ============

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

/** Extract image URLs from markdown content */
function extractImageUrls(markdown: string): string[] {
  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const urls: string[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      urls.push(url);
    }
  }
  return urls;
}

const BLOCK_TYPE_NAMES: Record<number, string> = {
  1: "Page",
  2: "Text",
  3: "Heading1",
  4: "Heading2",
  5: "Heading3",
  12: "Bullet",
  13: "Ordered",
  14: "Code",
  15: "Quote",
  17: "Todo",
  18: "Bitable",
  21: "Diagram",
  22: "Divider",
  23: "File",
  27: "Image",
  30: "Sheet",
  31: "Table",
  32: "TableCell",
};

// Block types that cannot be created via documentBlockChildren.create API
const UNSUPPORTED_CREATE_TYPES = new Set([31, 32]);

/** Clean blocks for insertion (remove unsupported types and read-only fields) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK block types
function cleanBlocksForInsert(blocks: any[]): { cleaned: any[]; skipped: string[] } {
  const skipped: string[] = [];
  const cleaned = blocks
    .filter((block) => {
      if (UNSUPPORTED_CREATE_TYPES.has(block.block_type)) {
        const typeName = BLOCK_TYPE_NAMES[block.block_type] || `type_${block.block_type}`;
        skipped.push(typeName);
        return false;
      }
      return true;
    })
    .map((block) => {
      if (block.block_type === 31 && block.table?.merge_info) {
        const { merge_info: _merge_info, ...tableRest } = block.table;
        return { ...block, table: tableRest };
      }
      return block;
    });
  return { cleaned, skipped };
}

// ============ Core Functions ============

/**
 * Convert Markdown to Feishu docx blocks locally (no API call required).
 * Supports: headings (H1-H6), bullet lists, ordered lists, code blocks,
 * blockquotes, horizontal rules, and paragraphs.
 */
function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n");
  const blocks: any[] = [];
  let i = 0;

  function makeTextElement(text: string) {
    // Strip inline markdown: bold, italic, inline code, links
    const cleaned = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    return { content: cleaned };
  }

  function makeTextBlock(blockType: number, text: string) {
    // Feishu API block_type → field name mapping
    // See: https://open.feishu.cn/document/server-docs/docs/content
    const typeKey: Record<number, string> = {
      2: "text",
      3: "heading1",
      4: "heading2",
      5: "heading3",
      6: "heading4",
      7: "heading5",
      8: "heading6",
      12: "bullet",
      13: "ordered",
      15: "quote",
    };
    const key = typeKey[blockType] ?? "text";
    // Note: do NOT pass style:{} for heading blocks - it causes field_validation_failed
    return {
      block_type: blockType,
      [key]: { elements: [{ text_run: makeTextElement(text) }] },
    };
  }

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "plaintext";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        block_type: 14,
        code: {
          elements: [{ text_run: { content: codeLines.join("\n") } }],
          style: {
            language:
              lang === "plaintext"
                ? 1
                : lang === "python"
                  ? 49
                  : lang === "javascript"
                    ? 22
                    : lang === "typescript"
                      ? 35
                      : lang === "java"
                        ? 21
                        : lang === "go"
                          ? 17
                          : lang === "shell" || lang === "bash"
                            ? 60
                            : 1,
          },
        },
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ block_type: 22, divider: {} });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push(makeTextBlock(15, line.slice(2)));
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6);
      const blockType = level + 2; // H1=3, H2=4, ..., H6=8
      blocks.push(makeTextBlock(blockType, headingMatch[2]));
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      blocks.push(makeTextBlock(12, line.replace(/^[-*+]\s+/, "")));
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      blocks.push(makeTextBlock(13, line.replace(/^\d+\.\s+/, "")));
      i++;
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push(makeTextBlock(2, line));
    i++;
  }

  return blocks;
}

// Feishu documentBlockChildren.create API limit: max 50 blocks per request.
const FEISHU_BLOCK_BATCH_SIZE = 50;

/* eslint-disable @typescript-eslint/no-explicit-any -- SDK block types */
async function insertBlocks(
  client: Lark.Client,
  docToken: string,
  blocks: any[],
  parentBlockId?: string,
): Promise<{ children: any[]; skipped: string[] }> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const { cleaned, skipped } = cleanBlocksForInsert(blocks);
  const blockId = parentBlockId ?? docToken;

  if (cleaned.length === 0) {
    return { children: [], skipped };
  }

  // Batch into chunks of FEISHU_BLOCK_BATCH_SIZE to respect API limit.
  const allChildren: any[] = [];
  for (let offset = 0; offset < cleaned.length; offset += FEISHU_BLOCK_BATCH_SIZE) {
    const batch = cleaned.slice(offset, offset + FEISHU_BLOCK_BATCH_SIZE);
    let res: any;
    try {
      res = await client.docx.documentBlockChildren.create({
        path: { document_id: docToken, block_id: blockId },
        data: {
          children: batch,
          // Insert at end for each batch (index-based: after last inserted block)
          ...(offset > 0 ? { index: offset } : {}),
        },
      });
    } catch (err: any) {
      if (err.isAxiosError && err.response?.data) {
        throw new Error(
          `Feishu API Error (${err.message}): ${JSON.stringify(err.response.data)}` +
          `\nBatch [${offset}..${offset + batch.length}], first block: ${batch[0] ? JSON.stringify(batch[0], null, 2) : "(empty)"}`,
        );
      }
      throw err;
    }

    if (res.code !== 0) {
      const errDetail = res as any;
      const violations = errDetail.field_violations ?? errDetail.error?.field_violations ?? [];
      const firstBlock = batch[0] ? JSON.stringify(batch[0], null, 2) : "(empty)";
      throw new Error(
        `insertBlocks failed (code=${res.code}): ${res.msg}` +
        `\nfield_violations: ${JSON.stringify(violations)}` +
        `\nbatch [${offset}..${offset + batch.length}], first block: ${firstBlock}`,
      );
    }
    allChildren.push(...(res.data?.children ?? []));
  }

  return { children: allChildren, skipped };
}

async function clearDocumentContent(client: Lark.Client, docToken: string) {
  const existing = await client.docx.documentBlock.list({
    path: { document_id: docToken },
  });
  if (existing.code !== 0) {
    throw new Error(existing.msg);
  }

  const childIds =
    existing.data?.items
      ?.filter((b) => b.parent_id === docToken && b.block_type !== 1)
      .map((b) => b.block_id) ?? [];

  if (childIds.length > 0) {
    const res = await client.docx.documentBlockChildren.batchDelete({
      path: { document_id: docToken, block_id: docToken },
      data: { start_index: 0, end_index: childIds.length },
    });
    if (res.code !== 0) {
      throw new Error(res.msg);
    }
  }

  return childIds.length;
}

async function uploadImageToDocx(
  client: Lark.Client,
  blockId: string,
  imageBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const res = await client.drive.media.uploadAll({
    data: {
      file_name: fileName,
      parent_type: "docx_image",
      parent_node: blockId,
      size: imageBuffer.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK stream type
      file: Readable.from(imageBuffer) as any,
    },
  });

  const fileToken = res?.file_token;
  if (!fileToken) {
    throw new Error("Image upload failed: no file_token returned");
  }
  return fileToken;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/* eslint-disable @typescript-eslint/no-explicit-any -- SDK block types */
async function processImages(
  client: Lark.Client,
  docToken: string,
  markdown: string,
  insertedBlocks: any[],
): Promise<number> {
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const imageUrls = extractImageUrls(markdown);
  if (imageUrls.length === 0) {
    return 0;
  }

  const imageBlocks = insertedBlocks.filter((b) => b.block_type === 27);

  let processed = 0;
  for (let i = 0; i < Math.min(imageUrls.length, imageBlocks.length); i++) {
    const url = imageUrls[i];
    const blockId = imageBlocks[i].block_id;

    try {
      const buffer = await downloadImage(url);
      const urlPath = new URL(url).pathname;
      const fileName = urlPath.split("/").pop() || `image_${i}.png`;
      const fileToken = await uploadImageToDocx(client, blockId, buffer, fileName);

      await client.docx.documentBlock.patch({
        path: { document_id: docToken, block_id: blockId },
        data: {
          replace_image: { token: fileToken },
        },
      });

      processed++;
    } catch (err) {
      console.error(`Failed to process image ${url}:`, err);
    }
  }

  return processed;
}

// ============ Actions ============

const STRUCTURED_BLOCK_TYPES = new Set([14, 18, 21, 23, 27, 30, 31, 32]);

async function readDoc(client: Lark.Client, docToken: string) {
  const [contentRes, infoRes, blocksRes] = await Promise.all([
    client.docx.document.rawContent({ path: { document_id: docToken } }),
    client.docx.document.get({ path: { document_id: docToken } }),
    client.docx.documentBlock.list({ path: { document_id: docToken } }),
  ]);

  if (contentRes.code !== 0) {
    throw new Error(contentRes.msg);
  }

  const blocks = blocksRes.data?.items ?? [];
  const blockCounts: Record<string, number> = {};
  const structuredTypes: string[] = [];

  for (const b of blocks) {
    const type = b.block_type ?? 0;
    const name = BLOCK_TYPE_NAMES[type] || `type_${type}`;
    blockCounts[name] = (blockCounts[name] || 0) + 1;

    if (STRUCTURED_BLOCK_TYPES.has(type) && !structuredTypes.includes(name)) {
      structuredTypes.push(name);
    }
  }

  let hint: string | undefined;
  if (structuredTypes.length > 0) {
    hint = `This document contains ${structuredTypes.join(", ")} which are NOT included in the plain text above. Use feishu_doc with action: "list_blocks" to get full content.`;
  }

  return {
    title: infoRes.data?.document?.title,
    content: contentRes.data?.content,
    revision_id: infoRes.data?.document?.revision_id,
    block_count: blocks.length,
    block_types: blockCounts,
    ...(hint && { hint }),
  };
}

async function createDoc(client: Lark.Client, title: string, folderToken?: string) {
  const res = await client.docx.document.create({
    data: { title, folder_token: folderToken },
  });
  if (res.code !== 0) {
    throw new Error(res.msg);
  }
  const doc = res.data?.document;
  return {
    document_id: doc?.document_id,
    title: doc?.title,
    url: `https://feishu.cn/docx/${doc?.document_id}`,
  };
}

async function writeDoc(client: Lark.Client, docToken: string, markdown: string) {
  const deleted = await clearDocumentContent(client, docToken);

  const blocks = markdownToBlocks(markdown);
  if (blocks.length === 0) {
    return { success: true, blocks_deleted: deleted, blocks_added: 0, images_processed: 0 };
  }

  const { children: inserted, skipped } = await insertBlocks(client, docToken, blocks);
  const imagesProcessed = await processImages(client, docToken, markdown, inserted);

  return {
    success: true,
    blocks_deleted: deleted,
    blocks_added: inserted.length,
    images_processed: imagesProcessed,
    ...(skipped.length > 0 && {
      warning: `Skipped unsupported block types: ${skipped.join(", ")}. Tables are not supported via this API.`,
    }),
  };
}

async function appendDoc(client: Lark.Client, docToken: string, markdown: string) {
  const blocks = markdownToBlocks(markdown);
  if (blocks.length === 0) {
    throw new Error("Content is empty");
  }

  const { children: inserted, skipped } = await insertBlocks(client, docToken, blocks);
  const imagesProcessed = await processImages(client, docToken, markdown, inserted);

  return {
    success: true,
    blocks_added: inserted.length,
    images_processed: imagesProcessed,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK block type
    block_ids: inserted.map((b: any) => b.block_id),
    ...(skipped.length > 0 && {
      warning: `Skipped unsupported block types: ${skipped.join(", ")}. Tables are not supported via this API.`,
    }),
  };
}

async function updateBlock(
  client: Lark.Client,
  docToken: string,
  blockId: string,
  content: string,
) {
  const blockInfo = await client.docx.documentBlock.get({
    path: { document_id: docToken, block_id: blockId },
  });
  if (blockInfo.code !== 0) {
    throw new Error(blockInfo.msg);
  }

  const res = await client.docx.documentBlock.patch({
    path: { document_id: docToken, block_id: blockId },
    data: {
      update_text_elements: {
        elements: [{ text_run: { content } }],
      },
    },
  });
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return { success: true, block_id: blockId };
}

async function deleteBlock(client: Lark.Client, docToken: string, blockId: string) {
  const blockInfo = await client.docx.documentBlock.get({
    path: { document_id: docToken, block_id: blockId },
  });
  if (blockInfo.code !== 0) {
    throw new Error(blockInfo.msg);
  }

  const parentId = blockInfo.data?.block?.parent_id ?? docToken;

  const children = await client.docx.documentBlockChildren.get({
    path: { document_id: docToken, block_id: parentId },
  });
  if (children.code !== 0) {
    throw new Error(children.msg);
  }

  const items = children.data?.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK block type
  const index = items.findIndex((item: any) => item.block_id === blockId);
  if (index === -1) {
    throw new Error("Block not found");
  }

  const res = await client.docx.documentBlockChildren.batchDelete({
    path: { document_id: docToken, block_id: parentId },
    data: { start_index: index, end_index: index + 1 },
  });
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return { success: true, deleted_block_id: blockId };
}

async function listBlocks(client: Lark.Client, docToken: string) {
  const res = await client.docx.documentBlock.list({
    path: { document_id: docToken },
  });
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    blocks: res.data?.items ?? [],
  };
}

async function getBlock(client: Lark.Client, docToken: string, blockId: string) {
  const res = await client.docx.documentBlock.get({
    path: { document_id: docToken, block_id: blockId },
  });
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    block: res.data?.block,
  };
}

async function listAppScopes(client: Lark.Client) {
  const res = await client.application.scope.list({});
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  const scopes = res.data?.scopes ?? [];
  const granted = scopes.filter((s) => s.grant_status === 1);
  const pending = scopes.filter((s) => s.grant_status !== 1);

  return {
    granted: granted.map((s) => ({ name: s.scope_name, type: s.scope_type })),
    pending: pending.map((s) => ({ name: s.scope_name, type: s.scope_type })),
    summary: `${granted.length} granted, ${pending.length} pending`,
  };
}

// ============ Tool Registration ============

import { addMember } from "./perm.js";

// ...

// ============ Tool Registration ============

export function registerFeishuDocTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("feishu_doc: No config available, skipping doc tools");
    return;
  }

  // Check if any account is configured
  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) {
    api.logger.debug?.("feishu_doc: No Feishu accounts configured, skipping doc tools");
    return;
  }

  // Use first account's config for tools configuration
  const firstAccount = accounts[0];
  const toolsCfg = resolveToolsConfig(firstAccount.config.tools);

  // Helper to get client for the default account
  const getClient = () => createFeishuClient(firstAccount);
  const registered: string[] = [];

  // Main document tool with action-based dispatch
  if (toolsCfg.doc) {
    api.registerTool(
      {
        name: "feishu_doc",
        label: "Feishu Doc",
        description:
          "Feishu document operations. Actions: read, write, append, create, list_blocks, get_block, update_block, delete_block. " +
          "To create a doc with content and grant the requester access in one step, use action=create with title, content (markdown), and sender_open_id (the user's open_id, starts with ou_). " +
          "Example workflow: user asks to write a Feishu doc → call feishu_doc with action=create, title=..., content=..., sender_open_id=<user's open_id from SenderId context>.",
        parameters: FeishuDocSchema,
        async execute(_toolCallId, params) {
          const p = params as FeishuDocParams;
          try {
            const client = getClient();
            switch (p.action) {
              case "read":
                return json(await readDoc(client, p.doc_token));
              case "write":
                return json(await writeDoc(client, p.doc_token, p.content));
              case "append":
                return json(await appendDoc(client, p.doc_token, p.content));
              case "create": {
                const result = await createDoc(client, p.title, p.folder_token);
                // Auto-permission: Grant full_access to sender if sender_open_id is provided
                const senderId = (p as any).sender_open_id;
                if (result.document_id && senderId) {
                  let memberType = "userid";
                  if (senderId.startsWith("ou_")) memberType = "openid";
                  else if (senderId.startsWith("on_")) memberType = "unionid";
                  else if (senderId.includes("@")) memberType = "email";

                  try {
                    await addMember(
                      client,
                      result.document_id,
                      "docx",
                      memberType,
                      senderId,
                      "full_access",
                    );
                    (result as any).permission_granted = true;
                    (result as any).permission_granted_to = senderId;
                  } catch (permErr) {
                    api.logger.warn?.(
                      `feishu_doc: Failed to grant permission to ${senderId}: ${permErr}`,
                    );
                    (result as any).permission_error = String(permErr);
                  }
                }
                // Write content if provided
                const initialContent = (p as any).content;
                if (result.document_id && initialContent) {
                  try {
                    await writeDoc(client, result.document_id, initialContent);
                    (result as any).content_written = true;
                  } catch (writeErr) {
                    api.logger.warn?.(`feishu_doc: Failed to write initial content: ${writeErr}`);
                    // Provide clear guidance to agent: document exists, use 'write' action to retry
                    (result as any).content_written = false;
                    (result as any).content_write_instruction =
                      `Document was created successfully (doc_token: ${result.document_id}). ` +
                      `Content write failed. Use action='write' with doc_token='${result.document_id}' to retry writing the content. ` +
                      `DO NOT create a new document.`;
                  }
                }
                return json(result);
              }
              case "list_blocks":
                return json(await listBlocks(client, p.doc_token));
              case "get_block":
                return json(await getBlock(client, p.doc_token, p.block_id));
              case "update_block":
                return json(await updateBlock(client, p.doc_token, p.block_id, p.content));
              case "delete_block":
                return json(await deleteBlock(client, p.doc_token, p.block_id));
              default:
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exhaustive check fallback
                return json({ error: `Unknown action: ${(p as any).action}` });
            }
          } catch (err) {
            return json({ error: err instanceof Error ? err.message : String(err) });
          }
        },
      },
      { name: "feishu_doc" },
    );
    registered.push("feishu_doc");
  }

  // Keep feishu_app_scopes as independent tool
  if (toolsCfg.scopes) {
    api.registerTool(
      {
        name: "feishu_app_scopes",
        label: "Feishu App Scopes",
        description:
          "List current app permissions (scopes). Use to debug permission issues or check available capabilities.",
        parameters: Type.Object({}),
        async execute() {
          try {
            const result = await listAppScopes(getClient());
            return json(result);
          } catch (err) {
            return json({ error: err instanceof Error ? err.message : String(err) });
          }
        },
      },
      { name: "feishu_app_scopes" },
    );
    registered.push("feishu_app_scopes");
  }

  if (registered.length > 0) {
    api.logger.info?.(`feishu_doc: Registered ${registered.join(", ")}`);
  }
}
