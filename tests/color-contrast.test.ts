import { describe, expect, test } from "vitest";
import {
  contrastRatio,
  itemPalette,
  minGraphicContrast,
  minTextContrast,
  parseHexColor,
} from "@/lib/color-contrast";

const cardSurface = { light: "#ffffff", dark: "#1f1c16" } as const;
const swatches = ["#f6c76f", "#8fb8ff", "#fff3b0", "#ffffff", "#000000", "#1e3a8a", "#e11d48", "#65b98c", "#3b0764"];

function ratio(first: string, second: string) {
  return contrastRatio(parseHexColor(first)!, parseHexColor(second)!);
}

describe("parseHexColor", () => {
  test("reads short, long and alpha forms, and rejects anything else", () => {
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
    expect(parseHexColor("#8fb8ff")).toEqual([0x8f, 0xb8, 0xff]);
    expect(parseHexColor("#8fb8ff26")).toEqual([0x8f, 0xb8, 0xff]);
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor("red")).toBeNull();
  });
});

describe("itemPalette", () => {
  for (const theme of ["light", "dark"] as const) {
    test.each(swatches)(`keeps %s readable in the ${theme} theme`, (color) => {
      const palette = itemPalette(color, theme);
      expect(ratio(palette.text, palette.background)).toBeGreaterThanOrEqual(minTextContrast);
      expect(ratio(palette.accent, palette.background)).toBeGreaterThanOrEqual(minGraphicContrast);
      expect(ratio(palette.accent, cardSurface[theme])).toBeGreaterThanOrEqual(minGraphicContrast);
    });
  }

  test("leaves a color that already stands out untouched as the accent", () => {
    expect(itemPalette("#1e3a8a", "light").accent).toBe("#1e3a8a");
  });

  test("falls back to the theme ink for an unreadable color value", () => {
    expect(itemPalette("", "light").accent).toBe("#302b20");
  });
});
