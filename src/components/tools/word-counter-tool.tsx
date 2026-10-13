"use client";

import { Input } from "antd";
import { useMemo, useState } from "react";
import { countText } from "@/lib/tools/word-counter";

function readingTime(minutes: number) {
  if (!minutes) return "0 phút";
  if (minutes < 1) return "< 1 phút";
  return `~${Math.round(minutes)} phút`;
}

export function WordCounterTool() {
  const [text, setText] = useState("");
  const counts = useMemo(() => countText(text), [text]);
  const format = (value: number) => value.toLocaleString("vi-VN");

  const stats = [
    { label: "Từ", value: format(counts.words) },
    { label: "Ký tự", value: format(counts.characters) },
    { label: "Ký tự (không khoảng trắng)", value: format(counts.charactersNoSpaces) },
    { label: "Câu", value: format(counts.sentences) },
    { label: "Đoạn", value: format(counts.paragraphs) },
    { label: "Dòng", value: format(counts.lines) },
    { label: "Thời gian đọc", value: readingTime(counts.readingMinutes) },
  ];

  return (
    <div className="tool-sheet word-counter">
      <div className="tool-stats" aria-live="polite">
        {stats.map((stat) => (
          <div key={stat.label} className="tool-stat">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <Input.TextArea
        className="tool-textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Dán hoặc gõ văn bản vào đây…"
        aria-label="Văn bản cần đếm"
      />
    </div>
  );
}
