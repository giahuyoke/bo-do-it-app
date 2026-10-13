import type { Dayjs } from "dayjs";

export type DateUnit = "day" | "week" | "month" | "year";

/** Calendar arithmetic; month ends clamp (31/01 + 1 tháng = 28/02). */
export function addToDate(date: Dayjs, amount: number, unit: DateUnit) {
  return date.add(amount, unit);
}

export function isWorkingDay(date: Dayjs, includeSaturday: boolean) {
  const weekday = date.day();
  return weekday !== 0 && (includeSaturday || weekday !== 6);
}

/**
 * Moves `amount` working days forward (or back, when negative), skipping
 * Sundays and, unless counted, Saturdays.
 */
export function addWorkingDays(date: Dayjs, amount: number, includeSaturday: boolean) {
  const step = Math.sign(amount);
  let current = date.startOf("day");
  let left = Math.abs(amount);
  while (left > 0) {
    current = current.add(step, "day");
    if (isWorkingDay(current, includeSaturday)) left -= 1;
  }
  return current;
}

/** Working days in [start, end): the start day counts, the end day does not. */
export function countWorkingDays(start: Dayjs, end: Dayjs, includeSaturday: boolean) {
  const from = start.startOf("day");
  const days = end.startOf("day").diff(from, "day");
  if (days <= 0) return 0;
  const workdaysPerWeek = includeSaturday ? 6 : 5;
  let count = Math.floor(days / 7) * workdaysPerWeek;
  for (let i = Math.floor(days / 7) * 7; i < days; i += 1) {
    if (isWorkingDay(from.add(i, "day"), includeSaturday)) count += 1;
  }
  return count;
}

export interface DateDifference {
  /** Always non-negative; `direction` says which way. */
  days: number;
  direction: "forward" | "backward" | "same";
  weeks: number;
  weekRemainder: number;
  months: number;
  monthRemainder: number;
  workingDays: number;
}

export function dateDifference(
  from: Dayjs,
  to: Dayjs,
  { includeEnd, includeSaturday }: { includeEnd: boolean; includeSaturday: boolean },
): DateDifference {
  const a = from.startOf("day");
  const b = to.startOf("day");
  const raw = b.diff(a, "day");
  const [start, end] = raw < 0 ? [b, a] : [a, b];
  // Counting the end day means measuring up to the day after it.
  const stop = includeEnd ? end.add(1, "day") : end;
  const days = stop.diff(start, "day");
  const months = stop.diff(start, "month");
  return {
    days,
    direction: raw > 0 ? "forward" : raw < 0 ? "backward" : "same",
    weeks: Math.floor(days / 7),
    weekRemainder: days % 7,
    months,
    monthRemainder: stop.diff(start.add(months, "month"), "day"),
    workingDays: countWorkingDays(start, stop, includeSaturday),
  };
}
