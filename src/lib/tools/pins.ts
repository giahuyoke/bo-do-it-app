import { isToolKey, type ToolKey } from "@/lib/tools/registry";

export const pinnedToolsStorageKey = "bo-do-it:pinned-tools";

/**
 * Reads the stored pin list. Anything unreadable counts as no pins; unknown
 * keys (a tool that was removed) and repeats are dropped, order is kept.
 */
export function parsePinnedTools(raw: string | null): ToolKey[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isToolKey))];
}

/** Pins go to the end of the list, so the sidebar shows them in pin order. */
export function togglePinnedTool(pinned: readonly ToolKey[], key: ToolKey): ToolKey[] {
  return pinned.includes(key)
    ? pinned.filter((pin) => pin !== key)
    : [...pinned, key];
}
