import dayjs from "dayjs";
import { describe, expect, test } from "vitest";
import {
  addToDate,
  addWorkingDays,
  countWorkingDays,
  dateDifference,
} from "@/lib/tools/date-calc";
import { applyLineOperation, countLines } from "@/lib/tools/line-tools";
import { parsePinnedTools, togglePinnedTool } from "@/lib/tools/pins";
import {
  formatGroups,
  parseNames,
  pickRandom,
  shuffle,
  splitIntoGroups,
} from "@/lib/tools/random-picker";
import { isToolKey, tools } from "@/lib/tools/registry";
import {
  countdownRemaining,
  createCountdown,
  formatDuration,
  initialStopwatch,
  lapSplits,
  lapStopwatch,
  pauseCountdown,
  pauseStopwatch,
  startCountdown,
  startStopwatch,
  stopwatchElapsed,
} from "@/lib/tools/timer";
import { countText } from "@/lib/tools/word-counter";

/** Deterministic stand-in for Math.random: cycles through the given values. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("tool registry", () => {
  test("keys are unique and recognised", () => {
    const keys = tools.map((tool) => tool.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(isToolKey)).toBe(true);
    expect(isToolKey("nope")).toBe(false);
  });
});

describe("pinned tools", () => {
  test("broken or missing storage reads as no pins", () => {
    expect(parsePinnedTools(null)).toEqual([]);
    expect(parsePinnedTools("{oops")).toEqual([]);
    expect(parsePinnedTools('{"a":1}')).toEqual([]);
  });

  test("drops unknown and repeated keys, keeping pin order", () => {
    expect(
      parsePinnedTools('["line-tools","ghost","timer","line-tools",4]'),
    ).toEqual(["line-tools", "timer"]);
  });

  test("toggling appends new pins and removes existing ones", () => {
    const pinned = togglePinnedTool(["timer"], "line-tools");
    expect(pinned).toEqual(["timer", "line-tools"]);
    expect(togglePinnedTool(pinned, "timer")).toEqual(["line-tools"]);
  });
});

describe("stopwatch", () => {
  test("counts from timestamps across pause and resume", () => {
    let watch = startStopwatch(initialStopwatch, 1_000);
    expect(stopwatchElapsed(watch, 3_500)).toBe(2_500);
    watch = pauseStopwatch(watch, 4_000);
    expect(stopwatchElapsed(watch, 99_000)).toBe(3_000);
    watch = startStopwatch(watch, 10_000);
    expect(stopwatchElapsed(watch, 11_000)).toBe(4_000);
  });

  test("laps record totals and splits are the time of each lap", () => {
    let watch = startStopwatch(initialStopwatch, 0);
    watch = lapStopwatch(watch, 1_000);
    watch = lapStopwatch(watch, 3_500);
    expect(watch.laps).toEqual([1_000, 3_500]);
    expect(lapSplits(watch.laps)).toEqual([1_000, 2_500]);
  });

  test("starting a running stopwatch changes nothing", () => {
    const watch = startStopwatch(initialStopwatch, 0);
    expect(startStopwatch(watch, 5_000)).toBe(watch);
  });
});

describe("countdown", () => {
  test("runs down from timestamps and never goes negative", () => {
    let countdown = startCountdown(createCountdown(60_000), 1_000);
    expect(countdownRemaining(countdown, 31_000)).toBe(30_000);
    expect(countdownRemaining(countdown, 500_000)).toBe(0);
    countdown = pauseCountdown(countdown, 21_000);
    expect(countdownRemaining(countdown, 900_000)).toBe(40_000);
    countdown = startCountdown(countdown, 100_000);
    expect(countdownRemaining(countdown, 110_000)).toBe(30_000);
  });

  test("formats durations", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65_400)).toBe("01:05");
    expect(formatDuration(65_420, { centiseconds: true })).toBe("01:05.42");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
    // A countdown shows 00:01 until the last millisecond is gone.
    expect(formatDuration(200, { roundUp: true })).toBe("00:01");
  });
});

describe("date calculator", () => {
  const friday = dayjs("2026-10-16");

  test("adds calendar units, clamping month ends", () => {
    expect(addToDate(dayjs("2026-01-31"), 1, "month").format("YYYY-MM-DD")).toBe("2026-02-28");
    expect(addToDate(friday, -2, "week").format("YYYY-MM-DD")).toBe("2026-10-02");
  });

  test("adds working days, skipping the weekend", () => {
    expect(addWorkingDays(friday, 1, false).format("YYYY-MM-DD")).toBe("2026-10-19");
    expect(addWorkingDays(friday, 1, true).format("YYYY-MM-DD")).toBe("2026-10-17");
    expect(addWorkingDays(dayjs("2026-10-19"), -1, false).format("YYYY-MM-DD")).toBe("2026-10-16");
    expect(addWorkingDays(friday, 0, false).format("YYYY-MM-DD")).toBe("2026-10-16");
  });

  test("counts working days in a half-open range", () => {
    // Fri 16 → Mon 26 (exclusive): Fri, Mon–Fri = 6 working days.
    expect(countWorkingDays(friday, dayjs("2026-10-26"), false)).toBe(6);
    // With Saturdays: + Sat 17, Sat 24.
    expect(countWorkingDays(friday, dayjs("2026-10-26"), true)).toBe(8);
  });

  test("measures the gap between two dates", () => {
    const gap = dateDifference(dayjs("2026-10-01"), dayjs("2026-11-15"), {
      includeEnd: false,
      includeSaturday: false,
    });
    expect(gap).toMatchObject({
      days: 45,
      direction: "forward",
      weeks: 6,
      weekRemainder: 3,
      months: 1,
      monthRemainder: 14,
      workingDays: 32,
    });
  });

  test("including the end day adds it to every count", () => {
    const gap = dateDifference(dayjs("2026-10-12"), dayjs("2026-10-16"), {
      includeEnd: true,
      includeSaturday: false,
    });
    expect(gap.days).toBe(5);
    expect(gap.workingDays).toBe(5);
  });

  test("a reversed range is measured the same way, flagged backward", () => {
    const gap = dateDifference(dayjs("2026-11-15"), dayjs("2026-10-01"), {
      includeEnd: false,
      includeSaturday: false,
    });
    expect(gap.direction).toBe("backward");
    expect(gap.days).toBe(45);
    expect(dateDifference(friday, friday, { includeEnd: false, includeSaturday: false }).direction).toBe("same");
  });
});

describe("random picker", () => {
  test("reads one trimmed name per non-empty line", () => {
    expect(parseNames("  An \n\nBình\r\n  \nChi")).toEqual(["An", "Bình", "Chi"]);
  });

  test("shuffle keeps every item and leaves the source alone", () => {
    const source = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(source, sequence(0.9, 0.1, 0.5, 0.3));
    expect([...shuffled].sort()).toEqual(source);
    expect(source).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("picks k distinct names", () => {
    const picked = pickRandom(["a", "b", "c", "d"], 3, sequence(0.42, 0.7, 0.1));
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  test("splits into N groups whose sizes differ by at most one", () => {
    const names = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const groups = splitIntoGroups(names, { mode: "count", value: 3 }, sequence(0.3));
    expect(groups.map((group) => group.length)).toEqual([4, 3, 3]);
    expect(groups.flat().sort()).toEqual([...names].sort());
  });

  test("splits into groups of at most N people, evenly", () => {
    const names = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const groups = splitIntoGroups(names, { mode: "size", value: 4 }, sequence(0.3));
    expect(groups.map((group) => group.length)).toEqual([4, 3, 3]);
  });

  test("never makes more groups than people", () => {
    expect(splitIntoGroups(["a", "b"], { mode: "count", value: 5 }, sequence(0.5))).toHaveLength(2);
  });

  test("formats groups as copyable text", () => {
    expect(formatGroups([["An", "Bình"], ["Chi"]])).toBe("Nhóm 1: An, Bình\nNhóm 2: Chi");
  });
});

describe("word counter", () => {
  test("empty text counts nothing", () => {
    expect(countText("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      sentences: 0,
      paragraphs: 0,
      readingMinutes: 0,
    });
  });

  test("counts Vietnamese words, sentences and paragraphs", () => {
    const text = "Hôm nay   trời đẹp quá! Đi chơi nhé?\n\nỪ, đi thôi… - được";
    const counts = countText(text);
    expect(counts.words).toBe(12);
    expect(counts.sentences).toBe(4);
    expect(counts.paragraphs).toBe(2);
    expect(counts.lines).toBe(3);
  });

  test("counts characters as people see them", () => {
    expect(countText("Đà 👍🏽").characters).toBe(4);
    expect(countText("Đà 👍🏽").charactersNoSpaces).toBe(3);
  });

  test("reading time is words at 200 per minute", () => {
    expect(countText(Array(300).fill("chữ").join(" ")).readingMinutes).toBe(1.5);
  });
});

describe("line tools", () => {
  test("sorts in Vietnamese order with numbers compared as numbers", () => {
    const text = "đ\nb\nă\na\nâ\nd\nmục 10\nmục 2";
    expect(applyLineOperation(text, { type: "sort", direction: "asc" })).toBe(
      "a\nă\nâ\nb\nd\nđ\nmục 2\nmục 10",
    );
    expect(applyLineOperation("a\nc\nb", { type: "sort", direction: "desc" })).toBe("c\nb\na");
  });

  test("removes duplicates keeping the first, with or without case", () => {
    const text = "Táo\ncam\ntáo\nCam\ncam";
    expect(applyLineOperation(text, { type: "dedupe", caseSensitive: true })).toBe(
      "Táo\ncam\ntáo\nCam",
    );
    expect(applyLineOperation(text, { type: "dedupe", caseSensitive: false })).toBe("Táo\ncam");
  });

  test("reverses, trims and drops empty lines", () => {
    expect(applyLineOperation("1\n2\n3", { type: "reverse" })).toBe("3\n2\n1");
    expect(applyLineOperation("  a \n\tb", { type: "trim" })).toBe("a\nb");
    expect(applyLineOperation("a\n\n  \nb\r\n", { type: "removeEmpty" })).toBe("a\nb");
  });

  test("shuffles every line", () => {
    const out = applyLineOperation("a\nb\nc", { type: "shuffle" }, sequence(0.1, 0.9));
    expect(out.split("\n").sort()).toEqual(["a", "b", "c"]);
  });

  test("adds a prefix and suffix, numbering {n}", () => {
    expect(
      applyLineOperation("An\nBình", { type: "affix", prefix: "{n}. ", suffix: " ✓" }),
    ).toBe("1. An ✓\n2. Bình ✓");
  });

  test("counts lines", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb\n")).toBe(3);
  });
});
