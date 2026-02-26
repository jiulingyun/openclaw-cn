import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";
import { resolveToolsConfig } from "./tools-config.js";
import { FeishuTaskSchema } from "./task-schema.js";

// ============ Helpers ============

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

/** Parse a date string into Unix timestamp (milliseconds) */
function parseDateToTimestamp(dateStr: string): string {
  // Already a unix timestamp
  if (/^\d{10,13}$/.test(dateStr)) {
    const ts = dateStr.length === 10 ? Number(dateStr) * 1000 : Number(dateStr);
    return String(ts);
  }
  // ISO 8601 or other date format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return String(d.getTime());
}

// ============ Core Functions ============

/** Create a new task */
export async function createTask(
  client: ReturnType<typeof createFeishuClient>,
  summary: string,
  description?: string,
  due?: string,
  members?: Array<{ id: string; role?: string }>,
) {
  const data: Record<string, unknown> = {
    summary,
    ...(description && { description }),
  };

  if (due) {
    data.due = {
      timestamp: parseDateToTimestamp(due),
      is_all_day: false,
    };
  }

  if (members && members.length > 0) {
    data.members = members.map((m) => ({
      id: m.id,
      type: "user",
      role: m.role || "assignee",
    }));
  }

  const res = await client.task.v2.task.create({
    data,
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** Get task by GUID */
export async function getTask(client: ReturnType<typeof createFeishuClient>, taskGuid: string) {
  const res = await client.task.v2.task.get({
    path: { task_guid: taskGuid },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** Update a task */
export async function updateTask(
  client: ReturnType<typeof createFeishuClient>,
  taskGuid: string,
  updates: {
    summary?: string;
    description?: string;
    due?: string;
  },
) {
  const data: Record<string, unknown> = {};
  const updateFields: string[] = [];

  if (updates.summary) {
    data.summary = updates.summary;
    updateFields.push("summary");
  }
  if (updates.description !== undefined) {
    data.description = updates.description;
    updateFields.push("description");
  }
  if (updates.due) {
    data.due = {
      timestamp: parseDateToTimestamp(updates.due),
      is_all_day: false,
    };
    updateFields.push("due");
  }

  const res = await client.task.v2.task.patch({
    path: { task_guid: taskGuid },
    data: {
      task: data,
      update_fields: updateFields,
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** Complete a task */
export async function completeTask(
  client: ReturnType<typeof createFeishuClient>,
  taskGuid: string,
) {
  const res = await client.task.v2.task.patch({
    path: { task_guid: taskGuid },
    data: {
      task: { completed_at: String(Date.now()) },
      update_fields: ["completed_at"],
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** Add members to a task */
export async function addTaskMembers(
  client: ReturnType<typeof createFeishuClient>,
  taskGuid: string,
  memberIds: string[],
  role: string = "assignee",
) {
  const res = await client.task.v2.task.addMembers({
    path: { task_guid: taskGuid },
    data: {
      members: memberIds.map((id) => ({
        id,
        type: "user",
        role,
      })),
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** Add a reminder to a task */
export async function addTaskReminder(
  client: ReturnType<typeof createFeishuClient>,
  taskGuid: string,
  relativeFireMinutes: number,
) {
  const res = await client.task.v2.task.addReminders({
    path: { task_guid: taskGuid },
    data: {
      reminders: [
        {
          relative_fire_minute: relativeFireMinutes,
        },
      ],
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    task: res.data?.task,
  };
}

/** List tasks */
export async function listTasks(
  client: ReturnType<typeof createFeishuClient>,
  pageSize?: number,
  pageToken?: string,
) {
  const res = await client.task.v2.task.list({
    params: {
      page_size: pageSize ?? 50,
      ...(pageToken && { page_token: pageToken }),
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    tasks: res.data?.items ?? [],
    has_more: res.data?.has_more ?? false,
    page_token: res.data?.page_token,
  };
}

/** Add a comment to a task */
export async function addTaskComment(
  client: ReturnType<typeof createFeishuClient>,
  taskGuid: string,
  content: string,
) {
  const res = await (client.task.v2 as any).taskComment.create({
    path: { task_guid: taskGuid },
    data: {
      content,
    },
    // oxlint-disable-next-line typescript/no-explicit-any
  } as any);
  if (res.code !== 0) {
    throw new Error(res.msg);
  }

  return {
    comment: res.data?.comment,
  };
}

// ============ Tool Registration ============

export function registerFeishuTaskTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("feishu_task: No config available, skipping");
    return;
  }

  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) {
    api.logger.debug?.("feishu_task: No Feishu accounts configured, skipping");
    return;
  }

  const firstAccount = accounts[0];
  const toolsCfg = resolveToolsConfig(firstAccount.config.tools);

  if (!toolsCfg.task) {
    api.logger.debug?.("feishu_task: Task tools disabled in config");
    return;
  }

  const getClient = () => createFeishuClient(firstAccount);

  api.registerTool(
    {
      name: "feishu_task",
      label: "飞书 - 任务管理",
      description: `飞书 Task v2 任务管理工具。支持以下操作:
- create: 创建任务（可设置标题、描述、截止时间、初始成员）
- get: 获取任务详情
- update: 更新任务（标题、描述、截止时间）
- complete: 完成任务
- add_members: 添加成员（负责人 assignee 或关注者 follower）
- add_reminder: 添加提醒（基于截止时间的相对分钟数）
- list: 列出任务
- add_comment: 给任务添加评论
IMPORTANT: When creating a task, you MUST always pass sender_open_id (the user's open_id from SenderId context, starts with ou_) so the message sender is automatically added as the task assignee. Example: action=create, summary=..., sender_open_id=<SenderId>.`,
      parameters: FeishuTaskSchema,
      async execute(_toolCallId, params) {
        const p = params as Record<string, unknown>;
        const action = p.action as string;
        const client = getClient();

        try {
          switch (action) {
            case "create": {
              // Auto-add sender as assignee if sender_open_id is provided
              let members = p.members as Array<{ id: string; role?: string }> | undefined;
              const senderOpenId = p.sender_open_id as string | undefined;
              if (senderOpenId) {
                const alreadyIncluded = members?.some((m) => m.id === senderOpenId);
                if (!alreadyIncluded) {
                  members = [...(members ?? []), { id: senderOpenId, role: "assignee" }];
                }
              }
              return json(
                await createTask(
                  client,
                  p.summary as string,
                  p.description as string | undefined,
                  p.due as string | undefined,
                  members,
                ),
              );
            }
            case "get":
              return json(await getTask(client, p.task_guid as string));
            case "update":
              return json(
                await updateTask(client, p.task_guid as string, {
                  summary: p.summary as string | undefined,
                  description: p.description as string | undefined,
                  due: p.due as string | undefined,
                }),
              );
            case "complete":
              return json(await completeTask(client, p.task_guid as string));
            case "add_members":
              return json(
                await addTaskMembers(
                  client,
                  p.task_guid as string,
                  p.member_ids as string[],
                  (p.role as string) || "assignee",
                ),
              );
            case "add_reminder":
              return json(
                await addTaskReminder(
                  client,
                  p.task_guid as string,
                  p.relative_fire_minutes as number,
                ),
              );
            case "list":
              return json(
                await listTasks(
                  client,
                  p.page_size as number | undefined,
                  p.page_token as string | undefined,
                ),
              );
            case "add_comment":
              return json(await addTaskComment(client, p.task_guid as string, p.content as string));
            default:
              return json({ error: `Unknown action: ${action}` });
          }
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    },
    { name: "feishu_task" },
  );

  api.logger.info?.("feishu_task: Registered feishu_task tool (8 actions)");
}
