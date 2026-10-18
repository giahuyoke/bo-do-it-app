import { describe, expect, test } from "vitest";
import {
  maxRecentColors,
  normalizeRecentColors,
  presetColors,
  pushRecentColor,
} from "@/lib/recent-colors";

describe("normalizeRecentColors", () => {
  test("bỏ giá trị không hợp lệ, preset, trùng lặp và giữ thứ tự", () => {
    expect(
      normalizeRecentColors(["#ABCDEF", "red", 3, presetColors[0], "#abcdef", "#123456"]),
    ).toEqual(["#abcdef", "#123456"]);
  });

  test("dữ liệu không phải mảng thì rỗng", () => {
    expect(normalizeRecentColors(undefined)).toEqual([]);
    expect(normalizeRecentColors("#123456")).toEqual([]);
  });

  test("giới hạn số lượng", () => {
    const many = Array.from({ length: 12 }, (_, i) => `#0000${String(i).padStart(2, "0")}`);
    expect(normalizeRecentColors(many)).toHaveLength(maxRecentColors);
  });
});

describe("pushRecentColor", () => {
  test("đưa màu lên đầu và bỏ bản cũ", () => {
    expect(pushRecentColor(["#111111", "#222222"], "#222222")).toEqual(["#222222", "#111111"]);
    expect(pushRecentColor(["#111111"], "#333333")).toEqual(["#333333", "#111111"]);
  });

  test("không đổi thì trả về null", () => {
    expect(pushRecentColor(["#111111"], "#111111")).toBeNull();
    expect(pushRecentColor(["#111111"], presetColors[2])).toBeNull();
    expect(pushRecentColor([], "")).toBeNull();
    expect(pushRecentColor([], "not-a-color")).toBeNull();
  });

  test("màu thứ 9 đẩy màu cũ nhất ra", () => {
    const full = Array.from({ length: maxRecentColors }, (_, i) => `#1111${i}${i}`);
    const next = pushRecentColor(full, "#999999");
    expect(next?.[0]).toBe("#999999");
    expect(next).toHaveLength(maxRecentColors);
    expect(next).not.toContain(full.at(-1));
  });
});
