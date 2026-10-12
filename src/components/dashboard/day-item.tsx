"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  plannerItemColor,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";

function formatItemTime(item: PlannerItem) {
  const date = plannerItemDate(item);
  if (!date) return "Chưa đặt ngày";
  const endAt = item.data.endAt;
  return endAt
    ? `${dayjs(date).format("HH:mm")} – ${dayjs(endAt).format("HH:mm")}`
    : dayjs(date).format("HH:mm");
}

interface DayItemProps {
  item: PlannerItem;
  onClick: () => void;
  onToggleTask: (completed: boolean) => void;
}

export function DayItem({ item, onClick, onToggleTask }: DayItemProps) {
  const color = plannerItemColor(item);
  const done = item.kind === "task" && item.data.status === "done";

  return (
    <button type="button" className="day-item" onClick={onClick}>
      <span className="day-item-accent" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1 text-left">
        <div
          className={`truncate font-medium text-slate-800 ${
            done ? "line-through text-slate-600" : ""
          }`}
        >
          {item.data.title}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <span>{formatItemTime(item)}</span>
          {item.data.tagName ? <span>· {item.data.tagName}</span> : null}
        </div>
      </div>
      <span className={`item-kind-icon ${item.kind}`}>
        {item.kind === "event" ? (
          <CalendarOutlined />
        ) : (
          <span
            role="checkbox"
            tabIndex={0}
            aria-checked={done}
            aria-label={done ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTask(!done);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onToggleTask(!done);
              }
            }}
          >
            {done ? <CheckCircleFilled /> : <CheckCircleOutlined />}
          </span>
        )}
      </span>
    </button>
  );
}
