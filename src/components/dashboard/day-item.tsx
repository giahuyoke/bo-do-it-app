"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { ItemTitle } from "@/components/planner/item-title";
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
    <div className="day-item">
      <span className="day-item-accent" style={{ backgroundColor: color }} />
      <button type="button" className="day-item-main" onClick={onClick}>
        <ItemTitle title={item.data.title} completed={done} className="day-item-title block truncate font-medium text-slate-800" />
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <span>{formatItemTime(item)}</span>
          {item.data.tagName ? <span>· {item.data.tagName}</span> : null}
        </div>
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
