"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  parsePinnedTools,
  pinnedToolsStorageKey,
  togglePinnedTool,
} from "@/lib/tools/pins";
import type { ToolKey } from "@/lib/tools/registry";

// "storage" only fires in other tabs; this event tells this tab's listeners.
const localChangeEvent = "bo-do-it:pinned-tools-change";

function readRaw() {
  try {
    return localStorage.getItem(pinnedToolsStorageKey);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === pinnedToolsStorageKey) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(localChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(localChangeEvent, onChange);
  };
}

/** Tools pinned to the sidebar, per browser, in pin order. */
export function usePinnedTools() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const pinned = useMemo(() => parsePinnedTools(raw), [raw]);

  const togglePin = useCallback((key: ToolKey) => {
    const next = togglePinnedTool(parsePinnedTools(readRaw()), key);
    try {
      localStorage.setItem(pinnedToolsStorageKey, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode): the pin just won't stick.
    }
    window.dispatchEvent(new Event(localChangeEvent));
  }, []);

  return { pinned, togglePin };
}
