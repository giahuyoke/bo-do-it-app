import type { CalendarEvent, Task } from "@/lib/firebase/models";

export type PlannerItem =
  | { kind: "task"; date: Date | null; data: Task }
  | { kind: "event"; date: Date; data: CalendarEvent };

export function plannerItemDate(item: PlannerItem) {
  return item.date;
}

export function plannerItemColor(item: PlannerItem) {
  return item.data.tagColor || (item.kind === "event" ? "#8fb8ff" : "#f6c76f");
}

export const reminderOptions = [
  { value: -1, label: "Không nhắc" },
  { value: 5, label: "Trước 5 phút" },
  { value: 15, label: "Trước 15 phút" },
  { value: 30, label: "Trước 30 phút" },
  { value: 60, label: "Trước 1 giờ" },
  { value: 1440, label: "Trước 1 ngày" },
];
