import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Mock Setup ============

// Mock the Lark SDK client
const mockClient = {
  im: {
    chat: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
    chatMembers: {
      get: vi.fn(),
    },
    message: {
      create: vi.fn(),
      reply: vi.fn(),
      list: vi.fn(),
    },
  },
};

vi.mock("./client.js", () => ({
  createFeishuClient: vi.fn(() => mockClient),
}));

vi.mock("./accounts.js", () => ({
  listEnabledFeishuAccounts: vi.fn(() => [
    {
      accountId: "default",
      enabled: true,
      configured: true,
      appId: "cli_test",
      appSecret: "secret_test",
      domain: "feishu",
      config: {},
    },
  ]),
}));

vi.mock("./tools-config.js", () => ({
  resolveToolsConfig: vi.fn(() => ({
    doc: true,
    wiki: true,
    drive: true,
    perm: false,
    scopes: true,
    im: true,
    bitable: true,
    task: true,
    calendar: true,
    sheets: true,
  })),
}));

import {
  listChats,
  getChatInfo,
  listChatMembers,
  sendMessage,
  replyMessage,
  listMessages,
  createChat,
  registerFeishuImTools,
} from "./im.js";

// ============ Tests ============

describe("IM Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- listChats ---
  describe("listChats", () => {
    it("should return chat list with pagination", async () => {
      mockClient.im.chat.list.mockResolvedValue({
        code: 0,
        data: {
          items: [
            {
              chat_id: "oc_chat1",
              name: "测试群",
              description: "测试描述",
              owner_id: "ou_owner",
              chat_mode: "group",
              chat_type: "group",
              user_count: 5,
            },
          ],
          has_more: true,
          page_token: "next_token",
        },
      });

      const result = await listChats(mockClient as any);

      expect(result.chats).toHaveLength(1);
      expect(result.chats[0]).toEqual({
        chat_id: "oc_chat1",
        name: "测试群",
        description: "测试描述",
        owner_id: "ou_owner",
        chat_mode: "group",
        chat_type: "group",
        member_count: 5,
      });
      expect(result.has_more).toBe(true);
      expect(result.page_token).toBe("next_token");
    });

    it("should handle empty results", async () => {
      mockClient.im.chat.list.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false },
      });

      const result = await listChats(mockClient as any);
      expect(result.chats).toHaveLength(0);
      expect(result.has_more).toBe(false);
    });

    it("should throw on API error", async () => {
      mockClient.im.chat.list.mockResolvedValue({
        code: 99991,
        msg: "Permission denied",
      });

      await expect(listChats(mockClient as any)).rejects.toThrow("Permission denied");
    });

    it("should pass pagination params", async () => {
      mockClient.im.chat.list.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false },
      });

      await listChats(mockClient as any, 50, "token123");

      expect(mockClient.im.chat.list).toHaveBeenCalledWith({
        params: {
          page_size: 50,
          page_token: "token123",
        },
      });
    });
  });

  // --- getChatInfo ---
  describe("getChatInfo", () => {
    it("should return chat details", async () => {
      mockClient.im.chat.get.mockResolvedValue({
        code: 0,
        data: {
          chat_id: "oc_chat1",
          name: "项目群",
          description: "项目讨论",
          owner_id: "ou_owner",
          chat_mode: "group",
          chat_type: "group",
          user_count: 10,
          bot_name: "TestBot",
        },
      });

      const result = await getChatInfo(mockClient as any, "oc_chat1");

      expect(result.chat_id).toBe("oc_chat1");
      expect(result.name).toBe("项目群");
      expect(result.member_count).toBe(10);
      expect(result.bot_name).toBe("TestBot");
    });

    it("should throw for non-existent chat", async () => {
      mockClient.im.chat.get.mockResolvedValue({
        code: 230001,
        msg: "Chat not found",
      });

      await expect(getChatInfo(mockClient as any, "oc_invalid")).rejects.toThrow("Chat not found");
    });
  });

  // --- listChatMembers ---
  describe("listChatMembers", () => {
    it("should return member list", async () => {
      mockClient.im.chatMembers.get.mockResolvedValue({
        code: 0,
        data: {
          items: [
            {
              member_id: "ou_user1",
              member_id_type: "open_id",
              name: "张三",
              tenant_key: "tenant1",
            },
            {
              member_id: "ou_user2",
              member_id_type: "open_id",
              name: "李四",
              tenant_key: "tenant1",
            },
          ],
          has_more: false,
          member_total: 2,
        },
      });

      const result = await listChatMembers(mockClient as any, "oc_chat1");

      expect(result.members).toHaveLength(2);
      expect(result.members[0].name).toBe("张三");
      expect(result.member_total).toBe(2);
    });

    it("should pass pagination params", async () => {
      mockClient.im.chatMembers.get.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false, member_total: 0 },
      });

      await listChatMembers(mockClient as any, "oc_chat1", 50, "page2");

      expect(mockClient.im.chatMembers.get).toHaveBeenCalledWith({
        path: { chat_id: "oc_chat1" },
        params: {
          page_size: 50,
          page_token: "page2",
        },
      });
    });
  });

  // --- sendMessage ---
  describe("sendMessage", () => {
    it("should send text message to chat", async () => {
      mockClient.im.message.create.mockResolvedValue({
        code: 0,
        data: {
          message_id: "om_msg1",
          chat_id: "oc_chat1",
        },
      });

      const result = await sendMessage(mockClient as any, "oc_chat1", "text", '{"text":"hello"}');

      expect(result.message_id).toBe("om_msg1");
      expect(mockClient.im.message.create).toHaveBeenCalledWith({
        params: { receive_id_type: "chat_id" },
        data: {
          receive_id: "oc_chat1",
          msg_type: "text",
          content: '{"text":"hello"}',
        },
      });
    });

    it("should auto-detect open_id type", async () => {
      mockClient.im.message.create.mockResolvedValue({
        code: 0,
        data: { message_id: "om_msg2", chat_id: "oc_chat1" },
      });

      await sendMessage(mockClient as any, "ou_user1", "text", '{"text":"hi"}');

      expect(mockClient.im.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { receive_id_type: "open_id" },
        }),
      );
    });

    it("should use explicit receive_id_type when provided", async () => {
      mockClient.im.message.create.mockResolvedValue({
        code: 0,
        data: { message_id: "om_msg3", chat_id: "oc_chat1" },
      });

      await sendMessage(mockClient as any, "user123", "text", '{"text":"hi"}', "user_id");

      expect(mockClient.im.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { receive_id_type: "user_id" },
        }),
      );
    });

    it("should throw on API error", async () => {
      mockClient.im.message.create.mockResolvedValue({
        code: 230002,
        msg: "Not in chat",
      });

      await expect(
        sendMessage(mockClient as any, "oc_chat1", "text", '{"text":"hello"}'),
      ).rejects.toThrow("Not in chat");
    });
  });

  // --- replyMessage ---
  describe("replyMessage", () => {
    it("should reply to a message", async () => {
      mockClient.im.message.reply.mockResolvedValue({
        code: 0,
        data: { message_id: "om_reply1", chat_id: "oc_chat1" },
      });

      const result = await replyMessage(mockClient as any, "om_msg1", "text", '{"text":"reply"}');

      expect(result.message_id).toBe("om_reply1");
      expect(mockClient.im.message.reply).toHaveBeenCalledWith({
        path: { message_id: "om_msg1" },
        data: {
          msg_type: "text",
          content: '{"text":"reply"}',
        },
      });
    });
  });

  // --- listMessages ---
  describe("listMessages", () => {
    it("should list messages with time range", async () => {
      mockClient.im.message.list.mockResolvedValue({
        code: 0,
        data: {
          items: [
            {
              message_id: "om_msg1",
              msg_type: "text",
              body: { content: '{"text":"hello"}' },
              sender: { id: "ou_user1", sender_type: "user" },
              create_time: "1700000000",
              chat_id: "oc_chat1",
            },
          ],
          has_more: false,
        },
      });

      const result = await listMessages(mockClient as any, "oc_chat1", "1699900000", "1700100000");

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].message_id).toBe("om_msg1");
      expect(result.messages[0].content).toBe('{"text":"hello"}');
    });

    it("should pass sort_type param", async () => {
      mockClient.im.message.list.mockResolvedValue({
        code: 0,
        data: { items: [], has_more: false },
      });

      await listMessages(
        mockClient as any,
        "oc_chat1",
        undefined,
        undefined,
        20,
        undefined,
        "ByCreateTimeDesc",
      );

      expect(mockClient.im.message.list).toHaveBeenCalledWith({
        params: expect.objectContaining({
          container_id: "oc_chat1",
          sort_type: "ByCreateTimeDesc",
        }),
      });
    });
  });

  // --- createChat ---
  describe("createChat", () => {
    it("should create a chat with members", async () => {
      mockClient.im.chat.create.mockResolvedValue({
        code: 0,
        data: { chat_id: "oc_new_chat", name: "新群" },
      });

      const result = await createChat(mockClient as any, "新群", "新群描述", [
        "ou_user1",
        "ou_user2",
      ]);

      expect(result.chat_id).toBe("oc_new_chat");
      expect(result.name).toBe("新群");
    });

    it("should create chat without members", async () => {
      mockClient.im.chat.create.mockResolvedValue({
        code: 0,
        data: { chat_id: "oc_empty", name: "空群" },
      });

      const result = await createChat(mockClient as any, "空群");

      expect(result.chat_id).toBe("oc_empty");
    });
  });
});

// --- registerFeishuImTools ---
describe("registerFeishuImTools", () => {
  it("should register all 7 IM tools", () => {
    const registeredTools: string[] = [];
    const mockApi = {
      config: { channels: { feishu: { appId: "cli_test", appSecret: "secret_test" } } },
      logger: { debug: vi.fn(), info: vi.fn() },
      registerTool: vi.fn((_def, opts) => {
        registeredTools.push(opts.name);
      }),
    };

    registerFeishuImTools(mockApi as any);

    expect(registeredTools).toEqual([
      "feishu_im_list_chats",
      "feishu_im_get_chat",
      "feishu_im_list_members",
      "feishu_im_send_message",
      "feishu_im_reply_message",
      "feishu_im_get_messages",
      "feishu_im_create_chat",
    ]);
  });

  it("should skip registration when config is missing", () => {
    const mockApi = {
      config: null,
      logger: { debug: vi.fn(), info: vi.fn() },
      registerTool: vi.fn(),
    };

    registerFeishuImTools(mockApi as any);

    expect(mockApi.registerTool).not.toHaveBeenCalled();
  });
});
