import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import {
  describeEntry,
  diffFields,
  entryDateLabel,
  filterEntries,
  groupByDay,
  historyCutoff,
  historyExpiry,
  historyItemKey,
  historyTitle,
  isRestorable,
  type HistoryEntry,
} from "@/lib/history";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "h1",
    action: "delete",
    entity: "task",
    entityId: "t1",
    title: "Nộp báo cáo",
    before: { title: "Nộp báo cáo" },
    after: null,
    count: 1,
    at: new Date("2026-10-19T09:30:00"),
    ...overrides,
  };
}

describe("diffFields", () => {
  const before = {
    title: "A",
    description: "",
    deadline: new Date("2026-10-12T00:00:00"),
    endAt: null,
    status: "todo",
    priority: "medium",
    tagId: "x",
    tagName: "",
    tagColor: "",
    reminderMinutes: null,
  };

  test("chỉ liệt kê trường hiển thị có thay đổi, đã format", () => {
    const after = {
      ...before,
      title: "B",
      deadline: new Date("2026-10-14T00:00:00"),
      status: "done",
      tagId: "y",
      reminderMinutes: 15,
    };
    expect(diffFields(before, after)).toEqual([
      { field: "title", label: "Tiêu đề", from: "A", to: "B" },
      { field: "startAt", label: "Bắt đầu", from: "12/10/2026", to: "14/10/2026" },
      { field: "status", label: "Trạng thái", from: "Chưa xong", to: "Đã xong" },
      { field: "reminderMinutes", label: "Nhắc nhở", from: "Không nhắc", to: "Trước 15 phút" },
    ]);
  });

  test("so sánh ngày theo giá trị", () => {
    const after = { ...before, deadline: new Date("2026-10-12T00:00:00") };
    expect(diffFields(before, after)).toEqual([]);
  });

  test("đổi kiểu: deadline khớp startAt, trường chỉ một bên có thì bỏ qua", () => {
    const event = { title: "Họp", startAt: new Date("2026-10-12T00:00:00"), location: "A" };
    const task = { title: "Họp", deadline: new Date("2026-10-13T00:00:00"), priority: "medium" };
    expect(diffFields(event, task)).toEqual([
      { field: "startAt", label: "Bắt đầu", from: "12/10/2026", to: "13/10/2026" },
    ]);
  });

  test("thiếu một bên thì không có thay đổi", () => {
    expect(diffFields(null, before)).toEqual([]);
    expect(diffFields(before, null)).toEqual([]);
  });

  test("ghi chú dài bị cắt 80 ký tự, rỗng hiện 'Không có'", () => {
    const after = { ...before, description: "x".repeat(100) };
    expect(diffFields(before, after)).toEqual([
      { field: "description", label: "Ghi chú", from: "Không có", to: `${"x".repeat(80)}…` },
    ]);
  });
});

describe("describeEntry", () => {
  test.each([
    [entry({ action: "create", entity: "event", title: "Toán", count: 24 }), "Đã tạo 24 sự kiện “Toán”"],
    [entry({ action: "create", entity: "task" }), "Đã tạo nhiệm vụ “Nộp báo cáo”"],
    [entry({ action: "create", entity: "noteItem", title: "Mua sữa", count: 3 }), "Đã thêm 3 dòng ghi chú “Mua sữa”"],
    [entry({ action: "update", entity: "tag", title: "Học" }), "Đã sửa tag “Học”"],
    [entry({ action: "delete" }), "Đã xóa nhiệm vụ “Nộp báo cáo”"],
    [entry({ action: "delete", entity: "noteItem", title: "Mua sữa" }), "Đã tích dòng ghi chú “Mua sữa”"],
    [entry({ action: "complete" }), "Đã hoàn thành nhiệm vụ “Nộp báo cáo”"],
    [entry({ action: "reopen" }), "Đã mở lại nhiệm vụ “Nộp báo cáo”"],
    [entry({ action: "convert", entity: "task", title: "Họp nhóm" }), "Đã đổi sự kiện “Họp nhóm” thành nhiệm vụ"],
    [entry({ action: "convert", entity: "event", title: "Họp", count: 2 }), "Đã đổi nhiệm vụ “Họp” thành 2 sự kiện"],
    [entry({ action: "restore", entity: "tag", title: "Học" }), "Đã khôi phục tag “Học”"],
  ])("%#", (value, expected) => {
    expect(describeEntry(value)).toBe(expected);
  });
});

describe("groupByDay", () => {
  test("Hôm nay, Hôm qua, rồi thứ + ngày; giữ thứ tự mới nhất trước", () => {
    const today = dayjs("2026-10-19T12:00:00");
    const days = groupByDay(
      [
        entry({ id: "a", at: new Date("2026-10-19T08:00:00") }),
        entry({ id: "b", at: new Date("2026-10-19T00:00:00") }),
        entry({ id: "c", at: new Date("2026-10-18T23:59:59") }),
        entry({ id: "d", at: new Date("2026-10-12T10:00:00") }),
      ],
      today,
    );
    expect(days.map((day) => day.label)).toEqual(["Hôm nay", "Hôm qua", "Thứ hai, 12/10"]);
    expect(days.map((day) => day.entries.map((item) => item.id))).toEqual([["a", "b"], ["c"], ["d"]]);
  });
});

describe("retention and helpers", () => {
  test("cutoff lùi 30 ngày, expiry tiến 30 ngày", () => {
    const now = new Date("2026-10-19T00:00:00Z");
    expect(historyCutoff(now).toISOString()).toBe("2026-09-19T00:00:00.000Z");
    expect(historyExpiry(now).toISOString()).toBe("2026-11-18T00:00:00.000Z");
  });

  test("historyTitle cắt khoảng trắng và giới hạn 200 ký tự", () => {
    expect(historyTitle("  Mua sữa  ")).toBe("Mua sữa");
    expect(historyTitle("x".repeat(300))).toHaveLength(200);
  });

  test("isRestorable: chỉ dòng xóa có bản chụp và mục chưa quay lại", () => {
    const deleted = entry();
    expect(isRestorable(deleted, new Set())).toBe(true);
    expect(isRestorable(deleted, new Set([historyItemKey("task", "t1")]))).toBe(false);
    expect(isRestorable(entry({ action: "update" }), new Set())).toBe(false);
    expect(isRestorable(entry({ before: null }), new Set())).toBe(false);
  });

  test("filterEntries lọc theo loại và chỉ mục đã xóa", () => {
    const items = [
      entry({ id: "1", entity: "task", action: "delete" }),
      entry({ id: "2", entity: "task", action: "update" }),
      entry({ id: "3", entity: "event", action: "delete" }),
    ];
    expect(filterEntries(items, "all", false).map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(filterEntries(items, "task", false).map((item) => item.id)).toEqual(["1", "2"]);
    expect(filterEntries(items, "all", true).map((item) => item.id)).toEqual(["1", "3"]);
  });
});

describe("entryDateLabel", () => {
  const today = dayjs("2026-10-19T12:00:00");
  const at = (date: string) => new Date(date);

  test("ngày của mục khi tạo hoặc xóa", () => {
    expect(entryDateLabel(entry({ before: null, after: { deadline: at("2026-10-20T00:00:00") } }), today)).toBe("20/10");
    expect(entryDateLabel(entry({ before: { startAt: at("2026-10-21T08:00:00") } }), today)).toBe("21/10");
  });

  test("sửa có dời ngày thì hiện cũ → mới, cùng ngày thì một ngày", () => {
    const moved = entry({ action: "update", before: { deadline: at("2026-10-12T00:00:00") }, after: { deadline: at("2026-10-14T00:00:00") } });
    expect(entryDateLabel(moved, today)).toBe("12/10 → 14/10");
    const sameDay = entry({ action: "update", before: { startAt: at("2026-10-12T08:00:00") }, after: { startAt: at("2026-10-12T10:00:00") } });
    expect(entryDateLabel(sameDay, today)).toBe("12/10");
  });

  test("đổi kiểu so deadline với startAt", () => {
    const convert = entry({ action: "convert", before: { startAt: at("2026-10-12T08:00:00") }, after: { deadline: at("2026-10-13T00:00:00") } });
    expect(entryDateLabel(convert, today)).toBe("12/10 → 13/10");
  });

  test("tạo hàng loạt hiện ngày đầu, năm khác thì có năm", () => {
    expect(entryDateLabel(entry({ before: null, after: { startAt: at("2026-10-20T01:00:00") }, count: 24 }), today)).toBe("từ 20/10");
    expect(entryDateLabel(entry({ before: null, after: { deadline: at("2027-01-05T00:00:00") } }), today)).toBe("05/01/2027");
  });

  test("không có ngày thì null", () => {
    expect(entryDateLabel(entry({ entity: "tag", before: { name: "Học", color: "#78c6a3" } }), today)).toBeNull();
    expect(entryDateLabel(entry({ action: "complete", before: null, after: null }), today)).toBeNull();
    expect(entryDateLabel(entry({ before: { deadline: null } }), today)).toBeNull();
  });
});
