import type { Dayjs } from "dayjs";

/** Weekdays in Vietnamese order, Monday first. Values are dayjs `day()` numbers. */
export const classWeekdays = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
] as const;

/** One import writes a single batch; this keeps it well inside Firestore's cap. */
export const maxClassSessions = 150;

/** Every date from `start` to `end` (inclusive) that falls on one of `weekdays`. */
export function classSessionDates(start: Dayjs, end: Dayjs, weekdays: number[]) {
  const wanted = new Set(weekdays);
  const dates: Dayjs[] = [];
  for (
    let day = start.startOf("day");
    !day.isAfter(end, "day") && dates.length <= maxClassSessions;
    day = day.add(1, "day")
  ) {
    if (wanted.has(day.day())) dates.push(day);
  }
  return dates;
}
