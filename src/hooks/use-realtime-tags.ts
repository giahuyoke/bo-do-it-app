"use client";

import { useEffect, useState } from "react";
import type { PlannerTag } from "@/lib/firebase/models";
import { subscribeToTags } from "@/lib/firebase/tags";

export function useRealtimeTags(userId: string) {
  const [tags, setTags] = useState<PlannerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeToTags(
      userId,
      (nextTags) => {
        setTags(nextTags);
        setLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setLoading(false);
      },
    );
  }, [userId]);

  return { error, loading, tags };
}
