"use client";

import { App } from "antd";
import { useEffect } from "react";
import { setTimerState, useTimerStore } from "@/hooks/use-timer-store";

const finishedTitle = "⏰ Hết giờ!";

/** Three short beeps through Web Audio, so no sound file is needed. */
function beep() {
  try {
    const context = new AudioContext();
    for (let i = 0; i < 3; i += 1) {
      const start = context.currentTime + i * 0.35;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    }
    window.setTimeout(() => void context.close(), 1_500);
  } catch {
    // No audio available: the on-screen notice still shows.
  }
}

const markFinished = () =>
  setTimerState((state) => ({
    ...state,
    countdown: { ...state.countdown, endsAt: null, remainingMs: 0 },
  }));

/**
 * Lives in the dashboard rather than the timer tool, so a countdown still
 * rings while another section is open.
 */
export function CountdownAlarm() {
  const { notification } = App.useApp();
  const { countdown, countdownLabel } = useTimerStore();
  const endsAt = countdown.endsAt;

  useEffect(() => {
    if (endsAt === null) return;
    // A countdown that ran out while the page was closed ends quietly.
    if (endsAt <= Date.now()) {
      markFinished();
      return;
    }
    const timeout = window.setTimeout(() => {
      markFinished();
      beep();
      notification.warning({
        title: "Hết giờ!",
        description: countdownLabel || "Bộ đếm ngược đã về 0.",
        duration: 0,
      });
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Hết giờ!", { body: countdownLabel || "Bộ đếm ngược đã về 0." });
        } catch {
          // Some browsers only allow notifications from a service worker.
        }
      }
      const title = document.title;
      document.title = finishedTitle;
      const restore = () => {
        if (document.title === finishedTitle) document.title = title;
      };
      if (document.hasFocus()) window.setTimeout(restore, 10_000);
      else window.addEventListener("focus", restore, { once: true });
    }, endsAt - Date.now());
    return () => window.clearTimeout(timeout);
  }, [countdownLabel, endsAt, notification]);

  return null;
}
