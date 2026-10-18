"use client";

import { useEffect, useMemo, useState } from "react";
import { useMergedListeners } from "@/hooks/use-merged-listeners";
import type { Task } from "@/lib/firebase/models";
import {
  countDoneTasks,
  subscribeToOpenTasks,
  subscribeToTasks,
  subscribeToTasksInMonth,
} from "@/lib/firebase/tasks";
import type { MonthKey } from "@/lib/load-window";

/**
 * Tasks that start in `months`, plus every open task. `loadAll` adds the 200
 * newest tasks of any date, for searching past the loaded months.
 */
export function useRealtimeTasks(userId: string, months: readonly MonthKey[], loadAll: boolean) {
  const keys = useMemo(
    () => ["open", ...months.map((month) => `month:${month}`), ...(loadAll ? ["all"] : [])],
    [months, loadAll],
  );
  const { items, loading, fetching, error } = useMergedListeners<Task>(userId, keys, (key) => {
    if (key === "open") return (onData, onError) => subscribeToOpenTasks(userId, onData, onError);
    if (key === "all") return (onData, onError) => subscribeToTasks(userId, onData, onError);
    const month = key.slice("month:".length);
    return (onData, onError) => subscribeToTasksInMonth(userId, month, onData, onError);
  });

  const tasks = useMemo(
    () =>
      [...items].sort(
        (left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0),
      ),
    [items],
  );

  const loadedDone = tasks.filter((task) => task.status === "done").length;
  const [serverDone, setServerDone] = useState<{ userId: string; count: number } | null>(null);

  // Recount whenever the loaded tasks change. Counting costs one read; offline
  // it fails and the loaded count stands in.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    countDoneTasks(userId)
      .then((count) => {
        if (active) setServerDone({ userId, count });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, loadedDone, tasks.length]);

  const doneCount = Math.max(
    loadedDone,
    serverDone?.userId === userId ? serverDone.count : 0,
  );

  return { tasks, doneCount, loading, fetching, error };
}
