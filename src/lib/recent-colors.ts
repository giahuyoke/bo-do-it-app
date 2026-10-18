/** Swatches the picker always shows; only colors outside them count as recent. */
export const presetColors = [
  "#e9bd4e",
  "#ef946c",
  "#e77991",
  "#b58ce1",
  "#7f9ee8",
  "#60afd1",
  "#65b98c",
  "#8fa261",
];

export const maxRecentColors = 8;

const hexColor = /^#[0-9a-fA-F]{6}$/;

/**
 * Reads a stored list. Anything unreadable counts as no colors; invalid
 * entries, presets and repeats are dropped, newest-first order is kept.
 */
export function normalizeRecentColors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const colors = value
    .filter((color): color is string => typeof color === "string" && hexColor.test(color))
    .map((color) => color.toLowerCase())
    .filter((color) => !presetColors.includes(color));
  return [...new Set(colors)].slice(0, maxRecentColors);
}

/**
 * Moves `color` to the front. Returns null when nothing would change (empty,
 * invalid, a preset, or already first), so callers can skip the write.
 */
export function pushRecentColor(recent: readonly string[], color: string): string[] | null {
  const next = normalizeRecentColors([color, ...recent]);
  const unchanged =
    next.length === recent.length && next.every((item, index) => item === recent[index]);
  return unchanged ? null : next;
}
