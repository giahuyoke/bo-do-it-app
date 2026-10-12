import dayjs, { type Dayjs } from "dayjs";
import type { CalendarEvent, Task } from "@/lib/firebase/models";

export type PlannerItem =
  | { kind: "task"; date: Date | null; data: Task }
  | { kind: "event"; date: Date; data: CalendarEvent };

export function plannerItemDate(item: PlannerItem) {
  return item.date;
}

/** True when the item falls on `day`, counting every day of a multi-day span. */
export function plannerItemCoversDay(item: PlannerItem, day: Dayjs | Date) {
  return plannerItemOverlaps(item, dayjs(day), dayjs(day));
}

/** True when any day of the item lies within `from`..`to` (inclusive days). */
export function plannerItemOverlaps(item: PlannerItem, from: Dayjs, to: Dayjs) {
  const date = plannerItemDate(item);
  if (!date) return false;
  const start = dayjs(date);
  const end = dayjs(item.data.endAt ?? date);
  return !start.isAfter(to, "day") && !end.isBefore(from, "day");
}

/**
 * Plans are date-only, so a single day needs no schedule text: only a span
 * across days (or a missing date) is worth showing. Empty means "say nothing".
 */
export function plannerItemSchedule(item: PlannerItem) {
  const date = plannerItemDate(item);
  if (!date) return "Chưa đặt ngày";
  const endAt = item.data.endAt;
  if (!endAt || dayjs(endAt).isSame(date, "day")) return "";
  return `${dayjs(date).format("DD/MM")} – ${dayjs(endAt).format("DD/MM")}`;
}

function isDone(item: PlannerItem) {
  return item.kind === "task" && item.data.status === "done";
}

/**
 * Day first, then open items above finished ones. Same-day items all start at
 * midnight, so creation order breaks the tie instead of leaving it arbitrary.
 * Undated items sort last.
 */
export function comparePlannerItems(left: PlannerItem, right: PlannerItem) {
  const leftDate = plannerItemDate(left);
  const rightDate = plannerItemDate(right);
  if (!leftDate || !rightDate) return Number(!leftDate) - Number(!rightDate);
  const byDay =
    dayjs(leftDate).startOf("day").valueOf() -
    dayjs(rightDate).startOf("day").valueOf();
  if (byDay) return byDay;
  const byDone = Number(isDone(left)) - Number(isDone(right));
  if (byDone) return byDone;
  const byTime = leftDate.getTime() - rightDate.getTime();
  if (byTime) return byTime;
  return (
    (left.data.createdAt?.getTime() ?? 0) - (right.data.createdAt?.getTime() ?? 0)
  );
}

export function defaultItemColor(kind: PlannerItem["kind"]) {
  return kind === "event" ? "#8fb8ff" : "#f6c76f";
}

/** `tagColor` holds the color picked on the item itself, not its tag's. */
export function plannerItemColor(item: PlannerItem) {
  return item.data.tagColor || defaultItemColor(item.kind);
}

export const reminderOptions = [
  { value: -1, label: "Không nhắc" },
  { value: 5, label: "Trước 5 phút" },
  { value: 15, label: "Trước 15 phút" },
  { value: 30, label: "Trước 30 phút" },
  { value: 60, label: "Trước 1 giờ" },
  { value: 1440, label: "Trước 1 ngày" },
];
