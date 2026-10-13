"use client";

import { ArrowLeftOutlined, PushpinFilled, PushpinOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { ComponentType } from "react";
import { DateCalcTool } from "@/components/tools/date-calc-tool";
import { LineToolsTool } from "@/components/tools/line-tools-tool";
import { RandomPickerTool } from "@/components/tools/random-picker-tool";
import { TimerTool } from "@/components/tools/timer-tool";
import { ToolIcon } from "@/components/tools/tool-icon";
import { WordCounterTool } from "@/components/tools/word-counter-tool";
import { toolInfo, tools, type ToolKey } from "@/lib/tools/registry";

const toolComponents: Record<ToolKey, ComponentType> = {
  timer: TimerTool,
  "date-calc": DateCalcTool,
  "random-picker": RandomPickerTool,
  "word-counter": WordCounterTool,
  "line-tools": LineToolsTool,
};

interface ToolsPageProps {
  activeTool: ToolKey | null;
  pinned: readonly ToolKey[];
  onOpenTool: (tool: ToolKey | null) => void;
  onTogglePin: (tool: ToolKey) => void;
}

function PinButton({
  tool,
  pinned,
  onToggle,
}: {
  tool: ToolKey;
  pinned: boolean;
  onToggle: (tool: ToolKey) => void;
}) {
  const label = pinned ? "Bỏ ghim khỏi sidebar" : "Ghim vào sidebar";
  return (
    <Tooltip title={label}>
      <button
        type="button"
        className={`tool-pin ${pinned ? "is-pinned" : ""}`}
        aria-pressed={pinned}
        aria-label={`${label}: ${toolInfo(tool).name}`}
        onClick={() => onToggle(tool)}
      >
        {pinned ? <PushpinFilled /> : <PushpinOutlined />}
      </button>
    </Tooltip>
  );
}

export function ToolsPage({ activeTool, pinned, onOpenTool, onTogglePin }: ToolsPageProps) {
  if (activeTool) {
    const tool = toolInfo(activeTool);
    const Tool = toolComponents[activeTool];
    return (
      <section className="tools-page" aria-label={tool.name}>
        <button type="button" className="tool-back" onClick={() => onOpenTool(null)}>
          <ArrowLeftOutlined /> Công cụ
        </button>
        <header className="tool-header">
          <span className="tool-icon">
            <ToolIcon tool={activeTool} />
          </span>
          <div>
            <h1>{tool.name}</h1>
            <p>{tool.description}</p>
          </div>
          <PinButton tool={activeTool} pinned={pinned.includes(activeTool)} onToggle={onTogglePin} />
        </header>
        <Tool />
      </section>
    );
  }

  return (
    <section className="tools-page" aria-label="Công cụ">
      <div className="notes-heading">
        <span className="planner-eyebrow">CÔNG CỤ</span>
        <h1>Tiện ích nhanh</h1>
        <p>Ghim công cụ hay dùng để mở nhanh từ sidebar.</p>
      </div>
      <ul className="tool-grid">
        {tools.map((tool) => (
          <li key={tool.key} className="tool-card">
            <span className="tool-icon">
              <ToolIcon tool={tool.key} />
            </span>
            <button type="button" className="tool-card-open" onClick={() => onOpenTool(tool.key)}>
              <strong>{tool.name}</strong>
            </button>
            <p>{tool.description}</p>
            <PinButton tool={tool.key} pinned={pinned.includes(tool.key)} onToggle={onTogglePin} />
          </li>
        ))}
      </ul>
    </section>
  );
}
