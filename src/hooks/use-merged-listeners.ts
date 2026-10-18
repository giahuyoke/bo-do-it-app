"use client";

import type { Unsubscribe } from "firebase/firestore";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

export type Listen<T> = (
  onData: (items: T[]) => void,
  onError: (error: Error) => void,
) => Unsubscribe;

interface Results<T> {
  scope: string;
  byKey: Record<string, T[]>;
  error: Error | null;
}

/**
 * Keeps one Firestore listener per key and merges what they return by id.
 * Keys are only ever added: a range loaded once stays live, so returning to
 * it costs no new reads. Everything resets when `scope` (the user) changes.
 */
export function useMergedListeners<T extends { id: string }>(
  scope: string,
  keys: readonly string[],
  listen: (key: string) => Listen<T>,
) {
  const [results, setResults] = useState<Results<T>>({ scope, byKey: {}, error: null });
  const active = useRef(new Map<string, Unsubscribe>());
  const keySignature = keys.join("|");

  const start = useEffectEvent((key: string) =>
    listen(key)(
      (items) =>
        setResults((current) =>
          current.scope === scope
            ? { ...current, byKey: { ...current.byKey, [key]: items } }
            : { scope, byKey: { [key]: items }, error: null },
        ),
      (error) =>
        setResults((current) =>
          current.scope === scope ? { ...current, error } : { scope, byKey: {}, error },
        ),
    ),
  );

  useEffect(() => {
    const listeners = new Map<string, Unsubscribe>();
    active.current = listeners;
    return () => listeners.forEach((unsubscribe) => unsubscribe());
  }, [scope]);

  useEffect(() => {
    if (!scope) return;
    const listeners = active.current;
    for (const key of keySignature.split("|")) {
      if (key && !listeners.has(key)) listeners.set(key, start(key));
    }
  }, [scope, keySignature]);

  const current = results.scope === scope ? results : { byKey: {}, error: null };

  const items = useMemo(() => {
    const byId = new Map<string, T>();
    Object.values(current.byKey).forEach((list) => list.forEach((item) => byId.set(item.id, item)));
    return [...byId.values()];
  }, [current.byKey]);

  const waiting = !current.error && keys.some((key) => !(key in current.byKey));
  return {
    items,
    // Nothing to show yet. Keys added later only set `fetching`, so the
    // calendar keeps what it has while a newly viewed month loads.
    loading: waiting && Object.keys(current.byKey).length === 0,
    fetching: waiting,
    error: current.error,
  };
}
