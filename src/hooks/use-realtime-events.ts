"use client";

import { useMemo } from "react";
import { useMergedListeners } from "@/hooks/use-merged-listeners";
import type { CalendarEvent } from "@/lib/firebase/models";
import { subscribeToEvents, subscribeToEventsInMonth } from "@/lib/firebase/events";
import type { MonthKey } from "@/lib/load-window";

/** Events that start in `months`; `loadAll` adds the 200 earliest of any date. */
export function useRealtimeEvents(userId: string, months: readonly MonthKey[], loadAll: boolean) {
  const keys = useMemo(
    () => [...months.map((month) => `month:${month}`), ...(loadAll ? ["all"] : [])],
    [months, loadAll],
  );
  const { items, loading, fetching, error } = useMergedListeners<CalendarEvent>(userId, keys, (key) => {
    if (key === "all") return (onData, onError) => subscribeToEvents(userId, onData, onError);
    const month = key.slice("month:".length);
    return (onData, onError) => subscribeToEventsInMonth(userId, month, onData, onError);
  });

  const events = useMemo(
    () => [...items].sort((left, right) => left.startAt.getTime() - right.startAt.getTime()),
    [items],
  );

  return { events, loading, fetching, error };
}
