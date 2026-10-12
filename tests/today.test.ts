import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import type { PlannerItem } from "@/lib/planner";
import { todaySections } from "@/lib/today";

const today = dayjs("2026-10-12T12:00:00");
function task(id: string, date: Date | null, status: "todo" | "in_progress" | "done" = "todo"): PlannerItem {
  return { kind: "task", date, data: {
    id, title: id, description: "", deadline: date, endAt: null, priority: "medium", status,
    tagId: null, tagName: "Công việc", tagColor: "#f6c76f", reminderMinutes: null, createdAt: null, updatedAt: null,
  } };
}

describe("Today tab", () => {
  test("includes both boundaries of the local day, excluding other days and undated tasks", () => {
    const items = [
      task("yesterday", today.startOf("day").subtract(1, "millisecond").toDate()),
      task("start", today.startOf("day").toDate()),
      task("end", today.endOf("day").toDate()),
      task("tomorrow", today.add(1, "day").startOf("day").toDate()),
      task("undated", null),
    ];
    expect(todaySections(items, today).pending.map((item) => item.data.id)).toEqual(["start", "end"]);
  });

  test("completed tasks remain visible and return to pending when unchecked", () => {
    const item = task("Done today", today.toDate(), "done");
    expect(todaySections([item], today).completed).toHaveLength(1);
    const unchecked = task("Done today", today.toDate(), "todo");
    expect(todaySections([unchecked], today)).toMatchObject({ pending: [unchecked], completed: [] });
  });

  test("sorts pending tasks chronologically without mutating the source", () => {
    const afternoon = task("afternoon", today.hour(16).toDate());
    const morning = task("morning", today.hour(8).toDate(), "in_progress");
    const items = [afternoon, morning];
    expect(todaySections(items, today).pending).toEqual([morning, afternoon]);
    expect(items).toEqual([afternoon, morning]);
  });

  test("search applies to today's completed tasks and events without including tomorrow", () => {
    const completed = task("BÁO CÁO", today.toDate(), "done");
    const event: PlannerItem = { kind: "event", date: today.toDate(), data: {
      ...completed.data, id: "meeting", title: "Họp báo cáo", location: "", startAt: today.toDate(), endAt: null,
    } };
    const result = todaySections([completed, event, task("Báo cáo ngày mai", today.add(1, "day").toDate())], today, "  báo cáo  ");
    expect(result.pending).toEqual([]);
    expect(result.completed).toEqual([completed]);
    expect(result.events).toEqual([event]);
  });
});
