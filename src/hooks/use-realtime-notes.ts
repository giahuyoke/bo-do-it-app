"use client";

import { useEffect, useState } from "react";
import type { Note } from "@/lib/firebase/models";
import { subscribeToNotes } from "@/lib/firebase/notes";

export function useRealtimeNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeToNotes(
      userId,
      (nextNotes) => {
        setNotes(nextNotes);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [userId]);

  return { error, loading, notes };
}
