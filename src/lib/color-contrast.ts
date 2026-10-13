import type { ResolvedTheme } from "@/lib/theme";

type Rgb = readonly [number, number, number];

/** Body text and card surface per theme; mirrors --foreground / --surface. */
const themeColors: Record<ResolvedTheme, { ink: Rgb; surface: Rgb }> = {
  light: { ink: [0x30, 0x2b, 0x20], surface: [0xff, 0xff, 0xff] },
  dark: { ink: [0xef, 0xe7, 0xd6], surface: [0x1f, 0x1c, 0x16] },
};

/** WCAG AA: 4.5:1 for text, 3:1 for icons and other graphics. */
export const minTextContrast = 4.5;
export const minGraphicContrast = 3;

/** Parses #rgb, #rgba, #rrggbb or #rrggbbaa; alpha is ignored. */
export function parseHexColor(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const full =
    hex.length <= 4 ? [...hex.slice(0, 3)].map((digit) => digit + digit).join("") : hex.slice(0, 6);
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16)) as unknown as Rgb;
}

function toHex(color: Rgb) {
  return `#${color.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** `amount` 0 keeps `from`, 1 gives `to`. */
function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return from.map((channel, index) => channel + (to[index] - channel) * amount) as unknown as Rgb;
}

function relativeLuminance(color: Rgb) {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: Rgb, second: Rgb) {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Pulls `color` toward the theme's ink one step at a time (from `start`) until
 * it reaches `minimum` contrast on `background`, keeping as much hue as it can.
 */
function readableOn(color: Rgb, background: Rgb, ink: Rgb, minimum: number, start = 0) {
  for (let amount = start; amount < 1; amount += 0.05) {
    const candidate = mix(color, ink, amount);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return ink;
}

export interface ItemPalette {
  /** Tinted fill behind the item, e.g. a calendar chip. */
  background: string;
  /** Title text on `background`. */
  text: string;
  /** Edge bars, dots and check icons, legible on both the tint and the card. */
  accent: string;
}

/**
 * Colors for a plan drawn in its own color. A pale yellow would vanish on a
 * white card and a navy one on the dark theme, so text and icons are nudged
 * toward the theme's ink just far enough to stay readable.
 */
export function itemPalette(color: string, theme: ResolvedTheme): ItemPalette {
  const { ink, surface } = themeColors[theme];
  const base = parseHexColor(color) ?? ink;
  const background = mix(surface, base, theme === "dark" ? 0.24 : 0.15);
  // The accent sits on the tint (chips) and on the bare card (lists); the
  // lower-contrast of the two decides.
  const backdrop =
    contrastRatio(base, background) < contrastRatio(base, surface) ? background : surface;

  return {
    background: toHex(background),
    // Titles read as ink with a hint of the item's hue, never as bright color.
    text: toHex(readableOn(base, background, ink, minTextContrast, 0.6)),
    accent: toHex(readableOn(base, backdrop, ink, minGraphicContrast)),
  };
}
