"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { ItemTitle } from "@/components/planner/item-title";
import {
  plannerItemColor,
  plannerItemSchedule,
  type PlannerItem,
} from "@/lib/planner";

interface DayItemProps {
  item: PlannerItem;
  onClick: () => void;
  onToggleTask: (completed: boolean) => void;
}

export function DayItem({ item, onClick, onToggleTask }: DayItemProps) {
  const color = plannerItemColor(item);
  const done = item.kind === "task" && item.data.status === "done";
  const meta = [plannerItemSchedule(item), item.data.tagName]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="day-item">
      <span className="day-item-accent" style={{ backgroundColor: color }} />
      <button type="button" className="day-item-main" onClick={onClick}>
        <ItemTitle title={item.data.title} completed={done} className="day-item-title block truncate font-medium text-slate-800" />
        {meta ? (
          <div className="mt-1 truncate text-xs text-slate-600">{meta}</div>
        ) : null}
      </button>
      <span className={`item-kind-icon ${item.kind}`}>
        {item.kind === "event" ? (
          <CalendarOutlined />
        ) : (
          <button
            type="button"
            className="day-item-toggle"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTask(!done);
            }}
          >
            {done ? <CheckCircleFilled /> : <CheckCircleOutlined />}
          </button>
        )}
      </span>
    </div>
  );
}
