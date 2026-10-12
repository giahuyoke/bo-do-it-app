"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/firebase/models";
import { subscribeToTasks } from "@/lib/firebase/tasks";

export function useRealtimeTasks(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeToTasks(
      userId,
      (nextTasks) => {
        setTasks(nextTasks);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [userId]);

  return { tasks, loading, error };
}
