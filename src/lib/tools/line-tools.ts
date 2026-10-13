import { cryptoRandom, shuffle, type RandomSource } from "@/lib/tools/random-picker";

export type LineOperation =
  | { type: "sort"; direction: "asc" | "desc" }
  | { type: "dedupe"; caseSensitive: boolean }
  | { type: "reverse" }
  | { type: "shuffle" }
  | { type: "removeEmpty" }
  | { type: "trim" }
  /** `{n}` in either part becomes the 1-based line number. */
  | { type: "affix"; prefix: string; suffix: string };

// Vietnamese order (a ă â b … d đ), ignoring case, "mục 2" before "mục 10".
const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });

function splitLines(text: string) {
  return text.split(/\r?\n/);
}

export function countLines(text: string) {
  return text ? splitLines(text).length : 0;
}

function transformLines(
  lines: string[],
  operation: LineOperation,
  random: RandomSource,
): string[] {
  switch (operation.type) {
    case "sort": {
      const sorted = [...lines].sort(collator.compare);
      return operation.direction === "asc" ? sorted : sorted.reverse();
    }
    case "dedupe": {
      const seen = new Set<string>();
      return lines.filter((line) => {
        const key = operation.caseSensitive ? line : line.toLocaleLowerCase("vi");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    case "reverse":
      return [...lines].reverse();
    case "shuffle":
      return shuffle(lines, random);
    case "removeEmpty":
      return lines.filter((line) => line.trim());
    case "trim":
      return lines.map((line) => line.trim());
    case "affix":
      return lines.map((line, index) => {
        const number = String(index + 1);
        return (
          operation.prefix.replaceAll("{n}", number) +
          line +
          operation.suffix.replaceAll("{n}", number)
        );
      });
  }
}

export function applyLineOperation(
  text: string,
  operation: LineOperation,
  random: RandomSource = cryptoRandom,
) {
  return transformLines(splitLines(text), operation, random).join("\n");
}
