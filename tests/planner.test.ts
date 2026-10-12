import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import { comparePlannerItems, plannerItemSchedule, type PlannerItem } from "@/lib/planner";

const day = dayjs("2026-10-13T00:00:00");
function task(
  id: string,
  date: Date | null,
  { status = "todo", createdAt = null, endAt = null }: {
    status?: "todo" | "done";
    createdAt?: Date | null;
    endAt?: Date | null;
  } = {},
): PlannerItem {
  return { kind: "task", date, data: {
    id, title: id, description: "", deadline: date, endAt, priority: "medium", status,
    tagId: null, tagName: "", tagColor: "", reminderMinutes: null, createdAt, updatedAt: null,
  } };
}

describe("comparePlannerItems", () => {
  test("puts finished tasks after open ones on the same day", () => {
    const done = task("done", day.toDate(), { status: "done", createdAt: new Date(1) });
    const open = task("open", day.toDate(), { createdAt: new Date(2) });
    expect([done, open].sort(comparePlannerItems).map((item) => item.data.id)).toEqual(["open", "done"]);
  });

  test("orders by day before status, and breaks same-day ties by creation", () => {
    const tomorrow = task("tomorrow", day.add(1, "day").toDate());
    const doneToday = task("doneToday", day.toDate(), { status: "done" });
    const later = task("later", day.toDate(), { createdAt: new Date(20) });
    const earlier = task("earlier", day.toDate(), { createdAt: new Date(10) });
    const undated = task("undated", null);
    expect(
      [undated, tomorrow, doneToday, later, earlier].sort(comparePlannerItems).map((item) => item.data.id),
    ).toEqual(["earlier", "later", "doneToday", "tomorrow", "undated"]);
  });
});

describe("plannerItemSchedule", () => {
  test("says nothing for a single day and shows the span across days", () => {
    expect(plannerItemSchedule(task("one", day.toDate(), { endAt: day.endOf("day").toDate() }))).toBe("");
    expect(plannerItemSchedule(task("span", day.toDate(), { endAt: day.add(2, "day").endOf("day").toDate() })))
      .toBe("13/10 – 15/10");
    expect(plannerItemSchedule(task("undated", null))).toBe("Chưa đặt ngày");
  });
});
