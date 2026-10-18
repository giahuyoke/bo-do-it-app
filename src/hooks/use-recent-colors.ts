"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveRecentColors, subscribeToRecentColors } from "@/lib/firebase/preferences";
import { pushRecentColor } from "@/lib/recent-colors";

/** Custom colors this account picked lately, newest first, synced via Firestore. */
export function useRecentColors(userId: string) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  // Read by rememberColor so it stays stable while the list changes.
  const latest = useRef<string[]>([]);

  useEffect(() => {
    return subscribeToRecentColors(
      userId,
      (next) => {
        latest.current = next;
        setRecentColors(next);
      },
      // Recent colors are a convenience; the picker works without them.
      () => {},
    );
  }, [userId]);

  const rememberColor = useCallback(
    (color: string | undefined) => {
      const next = color ? pushRecentColor(latest.current, color) : null;
      if (!next) return;
      latest.current = next;
      setRecentColors(next);
      void saveRecentColors(userId, next).catch(() => {});
    },
    [userId],
  );

  return { recentColors, rememberColor };
}
