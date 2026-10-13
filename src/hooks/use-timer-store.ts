"use client";

import { useSyncExternalStore } from "react";
import {
  createCountdown,
  initialStopwatch,
  type CountdownState,
  type StopwatchState,
} from "@/lib/tools/timer";

export interface TimerStoreState {
  mode: "stopwatch" | "countdown";
  stopwatch: StopwatchState;
  countdown: CountdownState;
  /** Shown under the countdown, e.g. "Đến 17:30 · 13/10". */
  countdownLabel: string;
}

const storageKey = "bo-do-it:timer";

const initialState: TimerStoreState = {
  mode: "stopwatch",
  stopwatch: initialStopwatch,
  countdown: createCountdown(0),
  countdownLabel: "",
};

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const finiteOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Reads what was stored, falling back field by field on anything odd. */
function load(): TimerStoreState {
  let stored: Partial<TimerStoreState> | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  } catch {
    stored = null;
  }
  if (!stored || typeof stored !== "object") return initialState;
  const stopwatch = stored.stopwatch ?? initialStopwatch;
  const countdown = stored.countdown ?? initialState.countdown;
  return {
    mode: stored.mode === "countdown" ? "countdown" : "stopwatch",
    stopwatch: {
      startedAt: finiteOrNull(stopwatch.startedAt),
      accumulated: finite(stopwatch.accumulated, 0),
      laps: Array.isArray(stopwatch.laps)
        ? stopwatch.laps.filter((lap): lap is number => Number.isFinite(lap))
        : [],
    },
    countdown: {
      totalMs: finite(countdown.totalMs, 0),
      endsAt: finiteOrNull(countdown.endsAt),
      remainingMs: finite(countdown.remainingMs, 0),
    },
    countdownLabel: typeof stored.countdownLabel === "string" ? stored.countdownLabel : "",
  };
}

let current: TimerStoreState | null = null;
const listeners = new Set<() => void>();

function getSnapshot() {
  current ??= load();
  return current;
}

export function setTimerState(update: (state: TimerStoreState) => TimerStoreState) {
  current = update(getSnapshot());
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // Storage blocked: the timer still works until the page is closed.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    current = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Stopwatch and countdown state, shared by the timer tool and its alarm. */
export function useTimerStore() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}
