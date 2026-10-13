// Timers are kept as timestamps rather than ticking counters, so they stay
// right across re-renders, hidden tabs and page reloads.

export interface StopwatchState {
  /** When the current run began; null while paused or reset. */
  startedAt: number | null;
  /** Time banked from earlier runs. */
  accumulated: number;
  /** Total elapsed time at each lap. */
  laps: number[];
}

export const initialStopwatch: StopwatchState = {
  startedAt: null,
  accumulated: 0,
  laps: [],
};

export function stopwatchElapsed(state: StopwatchState, now: number) {
  return state.accumulated + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

export function startStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.startedAt === null ? { ...state, startedAt: now } : state;
}

export function pauseStopwatch(state: StopwatchState, now: number): StopwatchState {
  if (state.startedAt === null) return state;
  return { ...state, startedAt: null, accumulated: stopwatchElapsed(state, now) };
}

export function lapStopwatch(state: StopwatchState, now: number): StopwatchState {
  return { ...state, laps: [...state.laps, stopwatchElapsed(state, now)] };
}

/** How long each lap took, from the running totals. */
export function lapSplits(laps: readonly number[]) {
  return laps.map((total, index) => total - (laps[index - 1] ?? 0));
}

export interface CountdownState {
  totalMs: number;
  /** When it reaches zero; null while paused or not started. */
  endsAt: number | null;
  /** Time left while paused or not started. */
  remainingMs: number;
}

export function createCountdown(totalMs: number): CountdownState {
  return { totalMs, endsAt: null, remainingMs: totalMs };
}

export function countdownRemaining(state: CountdownState, now: number) {
  if (state.endsAt === null) return state.remainingMs;
  return Math.min(state.totalMs, Math.max(0, state.endsAt - now));
}

export function startCountdown(state: CountdownState, now: number): CountdownState {
  if (state.endsAt !== null) return state;
  return { ...state, endsAt: now + state.remainingMs };
}

export function pauseCountdown(state: CountdownState, now: number): CountdownState {
  if (state.endsAt === null) return state;
  return { ...state, endsAt: null, remainingMs: countdownRemaining(state, now) };
}

/**
 * "mm:ss", or "h:mm:ss" past an hour. `centiseconds` appends ".cc" for the
 * stopwatch; `roundUp` keeps a countdown at 00:01 until it truly hits zero.
 */
export function formatDuration(
  ms: number,
  { centiseconds = false, roundUp = false } = {},
) {
  const safe = Math.max(0, ms);
  const totalSeconds = roundUp ? Math.ceil(safe / 1000) : Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  const clock = hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
  return centiseconds ? `${clock}.${pad(Math.floor((safe % 1000) / 10))}` : clock;
}
