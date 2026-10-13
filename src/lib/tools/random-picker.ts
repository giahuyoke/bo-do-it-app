/** Returns a number in [0, 1). */
export type RandomSource = () => number;

/** Uniform randomness from the Web Crypto API rather than Math.random. */
export const cryptoRandom: RandomSource = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
};

/** One trimmed name per line; blank lines are skipped. */
export function parseNames(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], random: RandomSource = cryptoRandom): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[], count: number, random: RandomSource = cryptoRandom) {
  return shuffle(items, random).slice(0, Math.max(0, count));
}

export type GroupSplit =
  | { mode: "count"; value: number }
  | { mode: "size"; value: number };

/**
 * Deals shuffled items round-robin, so group sizes differ by at most one.
 * "size" mode makes as few groups as keep every group within the size.
 */
export function splitIntoGroups<T>(
  items: readonly T[],
  split: GroupSplit,
  random: RandomSource = cryptoRandom,
): T[][] {
  if (!items.length || split.value < 1) return [];
  const groupCount = Math.min(
    items.length,
    split.mode === "count" ? split.value : Math.ceil(items.length / split.value),
  );
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  shuffle(items, random).forEach((item, index) => groups[index % groupCount].push(item));
  return groups;
}

export function formatGroups(groups: readonly (readonly string[])[]) {
  return groups.map((group, index) => `Nhóm ${index + 1}: ${group.join(", ")}`).join("\n");
}
