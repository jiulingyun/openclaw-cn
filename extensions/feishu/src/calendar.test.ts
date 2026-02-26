import { describe, it, expect, vi, beforeEach } from "vitest";

// ============ Mock Setup ============

const mockClient = {
  calendar: {
    v4: {
      calendar: { primary: vi.fn() },
      calendarEvent: {
        create: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      },
      calendarEventAttendee: {
        create: vi.fn(),
      },
      freebusy: {
        list: vi.fn(),
      },
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
    calendar: true,
  })),
}));

import {
  getPrimaryCalendar,
  createCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  addEventAttendees,
  queryFreebusy,
  registerFeishuCalendarTools,
} from "./calendar.js";

// ============ Tests ============

describe("Calendar Core Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPrimaryCalendar", () => {
    it("should return primary calendar info", async () => {
      mockClient.calendar.v4.calendar.primary.mockResolvedValue({
        code: 0,
        data: {
          calendars: [
            {
              calendar: {
                calendar_id: "cal_primary",
                summary: "我的日历",
                type: "primary",
              },
            },
          ],
        },
      });

      const result = await getPrimaryCalendar(mockClient as any);
      expect(result.calendar_id).toBe("cal_primary");
      expect(result.summary).toBe("我的日历");
    });
  });

  describe("createCalendarEvent", () => {
    it("should create an event", async () => {
      mockClient.calendar.v4.calendarEvent.create.mockResolvedValue({
        code: 0,
        data: {
          event: { event_id: "evt_1", summary: "会议" },
        },
      });

      const result = await createCalendarEvent(
        mockClient as any,
        "cal_primary",
        "会议",
        "2025-03-01T10:00:00+08:00",
        "2025-03-01T11:00:00+08:00",
        "讨论项目",
      );

      expect(result.event?.event_id).toBe("evt_1");
    });

    it("should create event with attendees", async () => {
      mockClient.calendar.v4.calendarEvent.create.mockResolvedValue({
        code: 0,
        data: { event: { event_id: "evt_2" } },
      });
      mockClient.calendar.v4.calendarEventAttendee.create.mockResolvedValue({
        code: 0,
        data: { attendees: [] },
      });

      await createCalendarEvent(
        mockClient as any,
        "cal_primary",
        "团队会议",
        "1709262000",
        "1709265600",
        undefined,
        [{ type: "user", id: "ou_user1" }],
      );

      expect(mockClient.calendar.v4.calendarEventAttendee.create).toHaveBeenCalled();
    });

    it("should throw on API error", async () => {
      mockClient.calendar.v4.calendarEvent.create.mockResolvedValue({
        code: 99991,
        msg: "Calendar not found",
      });

      await expect(
        createCalendarEvent(mockClient as any, "bad_cal", "会议", "123", "456"),
      ).rejects.toThrow("Calendar not found");
    });
  });

  describe("getCalendarEvent", () => {
    it("should get event details", async () => {
      mockClient.calendar.v4.calendarEvent.get.mockResolvedValue({
        code: 0,
        data: { event: { event_id: "evt_1", summary: "会议" } },
      });

      const result = await getCalendarEvent(mockClient as any, "cal", "evt_1");
      expect(result.event?.event_id).toBe("evt_1");
    });
  });

  describe("updateCalendarEvent", () => {
    it("should update event fields", async () => {
      mockClient.calendar.v4.calendarEvent.patch.mockResolvedValue({
        code: 0,
        data: { event: { event_id: "evt_1", summary: "更新后" } },
      });

      await updateCalendarEvent(mockClient as any, "cal", "evt_1", {
        summary: "更新后",
        location: "会议室A",
      });

      expect(mockClient.calendar.v4.calendarEvent.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            summary: "更新后",
            location: { name: "会议室A" },
          }),
        }),
      );
    });
  });

  describe("deleteCalendarEvent", () => {
    it("should delete event", async () => {
      mockClient.calendar.v4.calendarEvent.delete.mockResolvedValue({ code: 0 });

      const result = await deleteCalendarEvent(mockClient as any, "cal", "evt_1");
      expect(result.success).toBe(true);
    });
  });

  describe("listCalendarEvents", () => {
    it("should list events with time range", async () => {
      mockClient.calendar.v4.calendarEvent.list.mockResolvedValue({
        code: 0,
        data: {
          items: [{ event_id: "evt_1" }, { event_id: "evt_2" }],
          has_more: false,
        },
      });

      const result = await listCalendarEvents(mockClient as any, "cal", "2025-03-01", "2025-03-31");
      expect(result.events).toHaveLength(2);
    });
  });

  describe("addEventAttendees", () => {
    it("should add user attendees", async () => {
      mockClient.calendar.v4.calendarEventAttendee.create.mockResolvedValue({
        code: 0,
        data: { attendees: [{ type: "user" }] },
      });

      const result = await addEventAttendees(mockClient as any, "cal", "evt_1", [
        { type: "user", id: "ou_user1" },
      ]);

      expect(result.attendees).toHaveLength(1);
    });

    it("should handle chat and resource attendees", async () => {
      mockClient.calendar.v4.calendarEventAttendee.create.mockResolvedValue({
        code: 0,
        data: { attendees: [] },
      });

      await addEventAttendees(mockClient as any, "cal", "evt_1", [
        { type: "chat", id: "oc_chat1" },
        { type: "resource", id: "rm_room1" },
      ]);

      expect(mockClient.calendar.v4.calendarEventAttendee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            attendees: [
              { type: "chat", chat_id: "oc_chat1" },
              { type: "resource", room_id: "rm_room1" },
            ],
          },
        }),
      );
    });
  });

  describe("queryFreebusy", () => {
    it("should query free/busy status", async () => {
      mockClient.calendar.v4.freebusy.list.mockResolvedValue({
        code: 0,
        data: {
          freebusy_list: [{ user_id: "ou_user1", busy_times: [] }],
        },
      });

      const result = await queryFreebusy(mockClient as any, "2025-03-01", "2025-03-02", [
        "ou_user1",
      ]);
      expect(result.freebusy_list).toHaveLength(1);
    });
  });
});

describe("registerFeishuCalendarTools", () => {
  it("should register feishu_calendar tool", () => {
    const registeredTools: string[] = [];
    const mockApi = {
      config: { channels: { feishu: { appId: "cli_test", appSecret: "secret_test" } } },
      logger: { debug: vi.fn(), info: vi.fn() },
      registerTool: vi.fn((_def, opts) => {
        registeredTools.push(opts.name);
      }),
    };

    registerFeishuCalendarTools(mockApi as any);
    expect(registeredTools).toEqual(["feishu_calendar"]);
  });
});
