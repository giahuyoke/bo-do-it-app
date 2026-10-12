import type { CalendarEvent, PlannerTag, Task } from "@/lib/firebase/models";

export const defaultPlannerTags: PlannerTag[] = [
  { id: "default-study", name: "Học tập", color: "#8fb8ff", createdAt: null, updatedAt: null },
  { id: "default-work", name: "Công việc", color: "#b9a7f8", createdAt: null, updatedAt: null },
  { id: "default-personal", name: "Cá nhân", color: "#f4b6c2", createdAt: null, updatedAt: null },
  { id: "default-important", name: "Quan trọng", color: "#ff9f9f", createdAt: null, updatedAt: null },
  { id: "default-deadline", name: "Deadline", color: "#f6c76f", createdAt: null, updatedAt: null },
  { id: "default-meeting", name: "Cuộc hẹn", color: "#78c6a3", createdAt: null, updatedAt: null },
];

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
