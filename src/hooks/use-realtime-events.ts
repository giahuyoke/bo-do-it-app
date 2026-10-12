"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "@/lib/firebase/models";
import { subscribeToEvents } from "@/lib/firebase/events";

export function useRealtimeEvents(userId: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeToEvents(
      userId,
      (nextEvents) => {
        setEvents(nextEvents);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [userId]);

  return { events, loading, error };
}
