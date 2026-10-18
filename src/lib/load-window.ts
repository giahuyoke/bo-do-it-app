import dayjs, { type Dayjs } from "dayjs";

/**
 * The dashboard listens to tasks and events one calendar month at a time,
 * keyed "YYYY-MM", instead of to whole collections.
 */
export type MonthKey = string;

export function monthKey(date: Dayjs | Date): MonthKey {
  return dayjs(date).format("YYYY-MM");
}

/** Start (inclusive) and end (exclusive) of a month, in local time. */
export function monthBounds(key: MonthKey) {
  const start = dayjs(`${key}-01`).startOf("month");
  return { start: start.toDate(), end: start.add(1, "month").toDate() };
}

/** The month of `date` plus `before` months before it and `after` months after it. */
export function monthsAround(date: Dayjs, before: number, after: number): MonthKey[] {
  return Array.from({ length: before + after + 1 }, (_, index) =>
    monthKey(date.add(index - before, "month")),
  );
}

/**
 * Months to load for the calendar: around today, and around the dates the user
 * is looking at. One month of margin on each side catches plans that start in
 * the previous month and run into this one, and the days of neighbouring
 * months the month grid shows.
 */
export function plannerMonths(today: Dayjs, ...viewed: Dayjs[]): MonthKey[] {
  return [
    ...new Set([
      ...monthsAround(today, 1, 2),
      ...viewed.flatMap((date) => monthsAround(date, 1, 1)),
    ]),
  ].sort();
}
