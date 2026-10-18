"use client";

import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { clearHistory, fetchHistoryPage } from "@/lib/firebase/history";
import { restoreFromHistory } from "@/lib/firebase/restore";
import type { HistoryEntry } from "@/lib/history";

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Không thể tải lịch sử.");
}

/**
 * Loads the history log a page at a time. It is fetched on open and after each
 * restore or clear rather than kept live, so no listener runs in the background.
 */
export function useHistory(userId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchHistoryPage(userId).then(
      (page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setCursor(page.cursor);
        setError(null);
        setLoading(false);
      },
      (nextError: unknown) => {
        if (cancelled) return;
        setError(asError(nextError));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const reload = () => {
    setLoading(true);
    setVersion((value) => value + 1);
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchHistoryPage(userId, cursor);
      setEntries((current) => [...current, ...page.entries]);
      setCursor(page.cursor);
    } catch (nextError) {
      setError(asError(nextError));
    } finally {
      setLoadingMore(false);
    }
  };

  /** Throws on failure so the page can say why. */
  const restore = async (entry: HistoryEntry) => {
    await restoreFromHistory(userId, entry);
    reload();
  };

  const clear = async () => {
    await clearHistory(userId);
    reload();
  };

  return { entries, loading, loadingMore, error, hasMore: cursor !== null, loadMore, reload, restore, clear };
}
