import dayjs from "dayjs";
import type { CalendarEvent, Task } from "@/lib/firebase/models";

export type PlannerItem =
  | { kind: "task"; date: Date | null; data: Task }
  | { kind: "event"; date: Date; data: CalendarEvent };

export function plannerItemDate(item: PlannerItem) {
  return item.date;
}

/** Plans are date-only: a single day reads "Cả ngày", a span shows its dates. */
export function plannerItemSchedule(item: PlannerItem) {
  const date = plannerItemDate(item);
  if (!date) return "Chưa đặt ngày";
  const endAt = item.data.endAt;
  if (!endAt || dayjs(endAt).isSame(date, "day")) return "Cả ngày";
  return `${dayjs(date).format("DD/MM")} – ${dayjs(endAt).format("DD/MM")}`;
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
