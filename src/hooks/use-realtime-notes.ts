"use client";

import { useEffect, useState } from "react";
import type { NoteItem } from "@/lib/firebase/models";
import { subscribeToChecklist } from "@/lib/firebase/notes";

export function useRealtimeChecklist(userId: string) {
  const [items, setItems] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeToChecklist(
      userId,
      (nextItems) => {
        setItems(nextItems);
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [userId]);

  return { error, items, loading };
}
