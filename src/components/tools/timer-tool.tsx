"use client";

import { Button, DatePicker, InputNumber, Progress, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { setTimerState, useTimerStore } from "@/hooks/use-timer-store";
import {
  countdownRemaining,
  createCountdown,
  formatDuration,
  initialStopwatch,
  lapSplits,
  lapStopwatch,
  pauseCountdown,
  pauseStopwatch,
  startCountdown,
  startStopwatch,
  stopwatchElapsed,
} from "@/lib/tools/timer";

/**
 * The time, refreshed every `interval` ms while `active`. Paused timers don't
 * read it, and a stale first value is clamped in the timer maths.
 */
function useNow(active: boolean, interval: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [active, interval]);
  return now;
}

function Stopwatch() {
  const { stopwatch } = useTimerStore();
  const running = stopwatch.startedAt !== null;
  const now = useNow(running, 37);
  const elapsed = stopwatchElapsed(stopwatch, now);
  const splits = lapSplits(stopwatch.laps);
  const update = (change: typeof startStopwatch) =>
    setTimerState((state) => ({ ...state, stopwatch: change(state.stopwatch, Date.now()) }));

  return (
    <div className="timer-panel">
      <output className="timer-display" aria-live="off">
        {formatDuration(elapsed, { centiseconds: true })}
      </output>
      <div className="timer-actions">
        {running ? (
          <Button size="large" onClick={() => update(pauseStopwatch)}>
            Tạm dừng
          </Button>
        ) : (
          <Button size="large" type="primary" onClick={() => update(startStopwatch)}>
            {elapsed ? "Tiếp tục" : "Bắt đầu"}
          </Button>
        )}
        <Button size="large" disabled={!running} onClick={() => update(lapStopwatch)}>
          Vòng
        </Button>
        <Button
          size="large"
          disabled={!elapsed}
          onClick={() => setTimerState((state) => ({ ...state, stopwatch: initialStopwatch }))}
        >
          Đặt lại
        </Button>
      </div>
      {stopwatch.laps.length ? (
        <table className="timer-laps">
          <thead>
            <tr>
              <th scope="col">Vòng</th>
              <th scope="col">Thời gian vòng</th>
              <th scope="col">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {stopwatch.laps
              .map((total, index) => ({ total, index }))
              .reverse()
              .map(({ total, index }) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{formatDuration(splits[index], { centiseconds: true })}</td>
                  <td>{formatDuration(total, { centiseconds: true })}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

const presets = [5, 10, 15, 25];

/** Asks once, on the first start, so the alarm can reach a hidden tab. */
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => undefined);
  }
}

function Countdown() {
  const { countdown, countdownLabel } = useTimerStore();
  const running = countdown.endsAt !== null;
  const now = useNow(running, 200);
  const remaining = countdownRemaining(countdown, now);
  const finished = !running && countdown.totalMs > 0 && remaining === 0;
  const idle = !running && (countdown.totalMs === 0 || finished);

  const [setup, setSetup] = useState<"duration" | "deadline">("duration");
  const [duration, setDuration] = useState({ hours: 0, minutes: 25, seconds: 0 });
  const [deadline, setDeadline] = useState<Dayjs | null>(null);

  const durationMs =
    ((duration.hours ?? 0) * 3600 + (duration.minutes ?? 0) * 60 + (duration.seconds ?? 0)) * 1000;
  const deadlinePassed = deadline !== null && !deadline.isAfter(dayjs());
  const canStart = setup === "duration" ? durationMs > 0 : deadline !== null && !deadlinePassed;

  const begin = (totalMs: number, label: string) => {
    requestNotificationPermission();
    setTimerState((state) => ({
      ...state,
      countdown: startCountdown(createCountdown(totalMs), Date.now()),
      countdownLabel: label,
    }));
  };

  const start = () => {
    if (setup === "duration") {
      begin(durationMs, `Đếm ngược ${formatDuration(durationMs)}`);
    } else if (deadline) {
      begin(deadline.diff(dayjs()), `Đến ${deadline.format("HH:mm · DD/MM/YYYY")}`);
    }
  };

  if (idle) {
    return (
      <div className="timer-panel">
        {finished ? (
          <p className="timer-finished" role="status">
            ⏰ Hết giờ! <span>{countdownLabel}</span>
          </p>
        ) : null}
        <Segmented
          value={setup}
          onChange={(value) => setSetup(value as typeof setup)}
          options={[
            { label: "Khoảng thời gian", value: "duration" },
            { label: "Đến mốc", value: "deadline" },
          ]}
        />
        {setup === "duration" ? (
          <>
            <div className="timer-presets">
              {presets.map((minutes) => (
                <Button
                  key={minutes}
                  type={durationMs === minutes * 60_000 ? "primary" : "default"}
                  onClick={() => setDuration({ hours: 0, minutes, seconds: 0 })}
                >
                  {minutes} phút
                </Button>
              ))}
            </div>
            <div className="timer-duration-fields">
              {(
                [
                  ["hours", "giờ", 99],
                  ["minutes", "phút", 59],
                  ["seconds", "giây", 59],
                ] as const
              ).map(([field, label, max]) => (
                <label key={field}>
                  <InputNumber
                    min={0}
                    max={max}
                    precision={0}
                    value={duration[field]}
                    onChange={(value) =>
                      setDuration((current) => ({ ...current, [field]: value ?? 0 }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="timer-deadline">
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="HH:mm · DD/MM/YYYY"
              placeholder="Chọn ngày giờ"
              value={deadline}
              onChange={setDeadline}
              status={deadlinePassed ? "error" : undefined}
            />
            {deadlinePassed ? (
              <span className="tool-field-error">Mốc này đã qua, hãy chọn thời điểm sau bây giờ.</span>
            ) : null}
          </div>
        )}
        <div className="timer-actions">
          <Button size="large" type="primary" disabled={!canStart} onClick={start}>
            Bắt đầu
          </Button>
          {finished ? (
            <Button
              size="large"
              onClick={() =>
                setTimerState((state) => ({ ...state, countdown: createCountdown(0), countdownLabel: "" }))
              }
            >
              Đóng
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const percent = countdown.totalMs ? (remaining / countdown.totalMs) * 100 : 0;
  return (
    <div className="timer-panel">
      <output className="timer-display" aria-live="off">
        {formatDuration(remaining, { roundUp: true })}
      </output>
      {countdownLabel ? <p className="timer-label">{countdownLabel}</p> : null}
      <Progress percent={percent} showInfo={false} className="timer-progress" />
      <div className="timer-actions">
        {running ? (
          <Button
            size="large"
            onClick={() =>
              setTimerState((state) => ({ ...state, countdown: pauseCountdown(state.countdown, Date.now()) }))
            }
          >
            Tạm dừng
          </Button>
        ) : (
          <Button
            size="large"
            type="primary"
            onClick={() =>
              setTimerState((state) => ({ ...state, countdown: startCountdown(state.countdown, Date.now()) }))
            }
          >
            Tiếp tục
          </Button>
        )}
        <Button
          size="large"
          onClick={() =>
            setTimerState((state) => ({ ...state, countdown: createCountdown(0), countdownLabel: "" }))
          }
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );
}

export function TimerTool() {
  const { mode } = useTimerStore();
  return (
    <div className="tool-sheet timer-tool">
      <Segmented
        block
        size="large"
        value={mode}
        onChange={(value) => setTimerState((state) => ({ ...state, mode: value as typeof mode }))}
        options={[
          { label: "Bấm giờ", value: "stopwatch" },
          { label: "Đếm ngược", value: "countdown" },
        ]}
      />
      {mode === "stopwatch" ? <Stopwatch /> : <Countdown />}
    </div>
  );
}
