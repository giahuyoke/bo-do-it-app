import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import {
  comparePlannerItems,
  plannerItemCoversDay,
  plannerItemOverlaps,
  plannerItemSchedule,
  type PlannerItem,
} from "@/lib/planner";
import { todaySections } from "@/lib/today";

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

describe("multi-day spans", () => {
  const span = task("span", day.toDate(), { endAt: day.add(2, "day").endOf("day").toDate() });

  test("cover every day from start to end, and nothing outside", () => {
    expect([-1, 0, 1, 2, 3].map((offset) => plannerItemCoversDay(span, day.add(offset, "day"))))
      .toEqual([false, true, true, true, false]);
    expect(plannerItemCoversDay(task("single", day.toDate()), day.add(1, "day"))).toBe(false);
    expect(plannerItemCoversDay(task("undated", null), day)).toBe(false);
  });

  test("overlap a month they only partly fall in", () => {
    const crossing = task("crossing", dayjs("2026-10-30").toDate(), {
      endAt: dayjs("2026-11-02").endOf("day").toDate(),
    });
    const november = dayjs("2026-11-15");
    expect(plannerItemOverlaps(crossing, november.startOf("month"), november.endOf("month"))).toBe(true);
    expect(plannerItemOverlaps(span, november.startOf("month"), november.endOf("month"))).toBe(false);
  });

  test("still show on the Today tab after their first day", () => {
    expect(todaySections([span], day.add(1, "day").hour(12)).pending).toEqual([span]);
  });
});
