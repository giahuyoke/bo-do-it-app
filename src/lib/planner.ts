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

/**
 * Within one day, plans read in the order they were entered. A just-saved plan
 * has no `createdAt` until the server stamps it, so it counts as newest.
 */
export function compareByCreation(left: PlannerItem, right: PlannerItem) {
  const created = (item: PlannerItem) =>
    item.data.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const leftCreated = created(left);
  const rightCreated = created(right);
  return leftCreated === rightCreated ? 0 : leftCreated < rightCreated ? -1 : 1;
}

/** Lists spanning several days: by start day, then in entry order. Undated last. */
export function comparePlannerItems(left: PlannerItem, right: PlannerItem) {
  const leftDate = plannerItemDate(left);
  const rightDate = plannerItemDate(right);
  if (!leftDate || !rightDate) return Number(!leftDate) - Number(!rightDate);
  const byDay =
    dayjs(leftDate).startOf("day").valueOf() -
    dayjs(rightDate).startOf("day").valueOf();
  return byDay || compareByCreation(left, right);
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
