import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import { classSessionDates, maxClassSessions } from "@/lib/class-schedule";

describe("classSessionDates", () => {
  test("lists each chosen weekday between the two dates, both ends included", () => {
    // 13/10/2026 is a Tuesday; Tuesdays and Thursdays through 22/10.
    const dates = classSessionDates(dayjs("2026-10-13"), dayjs("2026-10-22"), [2, 4]);
    expect(dates.map((date) => date.format("DD/MM"))).toEqual(["13/10", "15/10", "20/10", "22/10"]);
  });

  test("is empty without weekdays or when the range is reversed", () => {
    expect(classSessionDates(dayjs("2026-10-13"), dayjs("2026-12-31"), [])).toEqual([]);
    expect(classSessionDates(dayjs("2026-10-20"), dayjs("2026-10-13"), [2])).toEqual([]);
  });

  test("stops one past the cap so callers can tell the range is too long", () => {
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    expect(classSessionDates(dayjs("2026-01-01"), dayjs("2027-12-31"), everyDay)).toHaveLength(
      maxClassSessions + 1,
    );
  });
});
