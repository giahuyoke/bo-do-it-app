"use client";

import { Checkbox, DatePicker, InputNumber, Segmented, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { useState } from "react";
import {
  addToDate,
  addWorkingDays,
  dateDifference,
  type DateUnit,
} from "@/lib/tools/date-calc";

const dateFormat = "DD/MM/YYYY";

/** "Thứ Sáu, 23/10/2026" */
function longDate(date: Dayjs) {
  const weekday = date
    .locale("vi")
    .format("dddd")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("vi"));
  return `${weekday}, ${date.format(dateFormat)}`;
}

const units: Array<{ value: DateUnit; label: string }> = [
  { value: "day", label: "ngày" },
  { value: "week", label: "tuần" },
  { value: "month", label: "tháng" },
  { value: "year", label: "năm" },
];

function AddDates() {
  const [base, setBase] = useState<Dayjs>(() => dayjs());
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState(7);
  const [unit, setUnit] = useState<DateUnit>("day");
  const [workingOnly, setWorkingOnly] = useState(false);
  const [includeSaturday, setIncludeSaturday] = useState(false);

  const counted = unit === "day" && workingOnly;
  const result = counted
    ? addWorkingDays(base, sign * amount, includeSaturday)
    : addToDate(base, sign * amount, unit);

  return (
    <div className="date-calc-grid">
      <div className="tool-fields">
        <label className="tool-field">
          <span>Ngày gốc</span>
          <DatePicker
            value={base}
            format={dateFormat}
            allowClear={false}
            onChange={(value) => value && setBase(value)}
          />
        </label>
        <div className="tool-field">
          <span>Phép tính</span>
          <div className="date-calc-amount">
            <Segmented
              value={sign}
              onChange={(value) => setSign(value as 1 | -1)}
              options={[
                { label: "Cộng", value: 1 },
                { label: "Trừ", value: -1 },
              ]}
            />
            <InputNumber
              min={0}
              max={100_000}
              precision={0}
              value={amount}
              onChange={(value) => setAmount(value ?? 0)}
              aria-label="Số lượng"
            />
            <Select
              value={unit}
              onChange={setUnit}
              options={units}
              aria-label="Đơn vị"
              className="date-calc-unit"
            />
          </div>
        </div>
        {unit === "day" ? (
          <Checkbox checked={workingOnly} onChange={(event) => setWorkingOnly(event.target.checked)}>
            Chỉ tính ngày làm việc
          </Checkbox>
        ) : null}
        {counted ? (
          <Checkbox
            checked={includeSaturday}
            onChange={(event) => setIncludeSaturday(event.target.checked)}
          >
            Tính thứ 7 là ngày làm việc
          </Checkbox>
        ) : null}
      </div>
      <div className="tool-result" aria-live="polite">
        <span className="tool-result-label">Kết quả</span>
        <strong className="tool-result-value">{longDate(result)}</strong>
        <span className="tool-result-hint">
          {result.startOf("day").isSame(dayjs().startOf("day"))
            ? "Hôm nay"
            : `${Math.abs(result.startOf("day").diff(dayjs().startOf("day"), "day"))} ngày ${
                result.isAfter(dayjs()) ? "nữa" : "trước"
              } so với hôm nay`}
        </span>
      </div>
    </div>
  );
}

function DateGap() {
  const [from, setFrom] = useState<Dayjs>(() => dayjs());
  const [to, setTo] = useState<Dayjs>(() => dayjs().add(30, "day"));
  const [includeEnd, setIncludeEnd] = useState(false);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const gap = dateDifference(from, to, { includeEnd, includeSaturday });

  const stats = [
    { label: "Tổng số ngày", value: `${gap.days} ngày` },
    {
      label: "Quy ra tuần",
      value: gap.weekRemainder ? `${gap.weeks} tuần ${gap.weekRemainder} ngày` : `${gap.weeks} tuần`,
    },
    {
      label: "Quy ra tháng",
      value: !gap.months
        ? "< 1 tháng"
        : gap.monthRemainder
          ? `${gap.months} tháng ${gap.monthRemainder} ngày`
          : `${gap.months} tháng`,
    },
    {
      label: includeSaturday ? "Ngày làm việc (T2–T7)" : "Ngày làm việc (T2–T6)",
      value: `${gap.workingDays} ngày`,
    },
  ];

  return (
    <div className="date-calc-grid">
      <div className="tool-fields">
        <label className="tool-field">
          <span>Từ ngày</span>
          <DatePicker value={from} format={dateFormat} allowClear={false} onChange={(value) => value && setFrom(value)} />
        </label>
        <label className="tool-field">
          <span>Đến ngày</span>
          <DatePicker value={to} format={dateFormat} allowClear={false} onChange={(value) => value && setTo(value)} />
        </label>
        <Checkbox checked={includeEnd} onChange={(event) => setIncludeEnd(event.target.checked)}>
          Tính cả ngày cuối
        </Checkbox>
        <Checkbox checked={includeSaturday} onChange={(event) => setIncludeSaturday(event.target.checked)}>
          Tính thứ 7 là ngày làm việc
        </Checkbox>
      </div>
      <div className="tool-result" aria-live="polite">
        <div className="tool-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="tool-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        {gap.direction === "backward" ? (
          <span className="tool-result-hint">“Đến ngày” nằm trước “Từ ngày”, kết quả tính theo chiều ngược lại.</span>
        ) : null}
      </div>
    </div>
  );
}

export function DateCalcTool() {
  const [mode, setMode] = useState<"add" | "gap">("add");
  return (
    <div className="tool-sheet">
      <Segmented
        block
        size="large"
        value={mode}
        onChange={(value) => setMode(value as typeof mode)}
        options={[
          { label: "Cộng / trừ ngày", value: "add" },
          { label: "Khoảng cách", value: "gap" },
        ]}
      />
      {mode === "add" ? <AddDates /> : <DateGap />}
    </div>
  );
}
