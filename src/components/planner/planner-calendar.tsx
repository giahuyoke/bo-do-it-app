"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Calendar, Empty, Typography } from "antd";
import type { CalendarProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { useMemo } from "react";
import {
  plannerItemColor,
  plannerItemDate,
  type PlannerItem,
} from "@/lib/planner";
import { formatLunarDate } from "@/lib/lunar-calendar";
import { ItemTitle } from "@/components/planner/item-title";

dayjs.locale("vi");

const { Text } = Typography;

export type PlannerView = "month" | "week" | "agenda";

interface PlannerCalendarProps {
  items: PlannerItem[];
  view: PlannerView;
  selectedDate: Dayjs;
  visibleDate: Dayjs;
  onSelectDate: (date: Dayjs) => void;
  onVisibleDateChange: (date: Dayjs) => void;
  onEditItem: (item: PlannerItem) => void;
  onToggleTask: (item: PlannerItem, completed: boolean) => void;
}

function itemTime(item: PlannerItem) {
  const date = plannerItemDate(item);
  if (!date) return "Chưa đặt ngày";
  const endAt = item.data.endAt;
  return endAt
    ? `${dayjs(date).format("HH:mm")}–${dayjs(endAt).format("HH:mm")}`
    : dayjs(date).format("HH:mm");
}

function PlannerChip({
  item,
  compact = false,
  onClick,
  onToggleTask,
}: {
  item: PlannerItem;
  compact?: boolean;
  onClick: () => void;
  onToggleTask: (completed: boolean) => void;
}) {
  const color = plannerItemColor(item);
  const isDone = item.kind === "task" && item.data.status === "done";

  return (
    <button
      type="button"
      className={`planner-chip ${item.kind} ${isDone ? "is-done" : ""}`}
      style={{
        backgroundColor: `${color}26`,
        borderLeftColor: color,
        color: "#334155",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={item.data.title}
    >
      {item.kind === "task" ? (
        <span
          className="planner-chip-check"
          role="checkbox"
          tabIndex={0}
          aria-checked={isDone}
          aria-label={isDone ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleTask(!isDone);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onToggleTask(!isDone);
            }
          }}
        >
          {isDone ? (
            <CheckCircleFilled style={{ color }} />
          ) : (
            <CheckCircleOutlined style={{ color }} />
          )}
        </span>
      ) : (
        <span className="planner-chip-dot" style={{ backgroundColor: color }} />
      )}
      {!compact ? <span className="planner-chip-time">{itemTime(item)}</span> : null}
      <ItemTitle title={item.data.title} completed={isDone} className="truncate" />
    </button>
  );
}

export function PlannerCalendar({
  items,
  view,
  selectedDate,
  visibleDate,
  onSelectDate,
  onVisibleDateChange,
  onEditItem,
  onToggleTask,
}: PlannerCalendarProps) {
  const datedItems = useMemo(
    () =>
      items
        .filter((item) => plannerItemDate(item))
        .sort(
          (left, right) =>
            plannerItemDate(left)!.getTime() - plannerItemDate(right)!.getTime(),
        ),
    [items],
  );

  const itemsForDate = (date: Dayjs) =>
    datedItems.filter((item) => dayjs(plannerItemDate(item)).isSame(date, "day"));

  if (view === "week") {
    const weekStart = visibleDate.startOf("week");
    const days = Array.from({ length: 7 }, (_, index) => weekStart.add(index, "day"));

    return (
      <div className="planner-week-grid">
        {days.map((date) => {
          const dayItems = itemsForDate(date);
          const isSelected = date.isSame(selectedDate, "day");
          return (
            <div
              key={date.format("YYYY-MM-DD")}
              className={`planner-week-day ${isSelected ? "is-selected" : ""} ${date.isBefore(dayjs(), "day") ? "is-past" : ""}`}
            >
              <button type="button" className="planner-week-select" onClick={() => onSelectDate(date)} aria-label={`Chọn ngày ${date.format("DD/MM/YYYY")}`}>
              <span className="planner-week-label">{date.format("ddd")}</span>
              <span className="planner-week-number">{date.format("DD")}</span>
              </button>
              <div className="mt-4 space-y-2">
                {dayItems.length ? (
                  dayItems.map((item) => (
                    <PlannerChip
                      key={`${item.kind}-${item.data.id}`}
                      item={item}
                      compact
                      onClick={() => onEditItem(item)}
                      onToggleTask={(completed) => onToggleTask(item, completed)}
                    />
                  ))
                ) : (
                  <span className="planner-week-empty">Trống</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (view === "agenda") {
    const agendaItems = datedItems;

    if (!agendaItems.length) {
      return (
        <div className="flex min-h-96 items-center justify-center">
          <Empty description="Chưa có kế hoạch sắp tới" />
        </div>
      );
    }

    return (
      <div className="planner-agenda">
        {agendaItems.map((item) => {
          const date = dayjs(plannerItemDate(item));
          const color = plannerItemColor(item);
          return (
            <button
              type="button"
              key={`${item.kind}-${item.data.id}`}
              className="planner-agenda-item"
              onClick={() => onEditItem(item)}
            >
              <div className="planner-agenda-date">
                <span>{date.format("ddd")}</span>
                <strong>{date.format("DD")}</strong>
              </div>
              <span className="planner-agenda-line" style={{ backgroundColor: color }} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  {item.kind === "task" ? (
                    <span
                      className="planner-agenda-check"
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={item.data.status === "done"}
                      aria-label={item.data.status === "done" ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleTask(item, item.data.status !== "done");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleTask(item, item.data.status !== "done");
                        }
                      }}
                    >
                      {item.data.status === "done" ? (
                        <CheckCircleFilled style={{ color }} />
                      ) : (
                        <CheckCircleOutlined style={{ color }} />
                      )}
                    </span>
                  ) : <CalendarOutlined style={{ color }} />}
                  <ItemTitle title={item.data.title} completed={item.kind === "task" && item.data.status === "done"} className="truncate font-semibold text-slate-800" />
                </div>
                <Text type="secondary" className="mt-1 block text-xs!">
                  <ClockCircleOutlined className="mr-1" /> {itemTime(item)}
                  {item.data.tagName ? ` · ${item.data.tagName}` : ""}
                </Text>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  const fullCellRender: CalendarProps<Dayjs>["fullCellRender"] = (date) => {
    const dayItems = itemsForDate(date);
    const isCurrentMonth = date.month() === visibleDate.month();
    const isSelected = date.isSame(selectedDate, "day");
    const isToday = date.isSame(dayjs(), "day");
    const isPast = date.isBefore(dayjs(), "day");

    return (
      <div
        className={`planner-date-cell ${!isCurrentMonth ? "is-muted" : ""} ${
          isSelected ? "is-selected" : ""
        } ${isPast ? "is-past" : ""} ${isToday ? "is-today" : ""}`}
      >
        <div className="planner-date-number-row">
          <span className={isToday ? "planner-today-number" : ""}>
            {date.date()}
          </span>
          <span className="planner-lunar-date">
            {formatLunarDate(date.toDate(), date.date() === 1)}
          </span>
          {dayItems.length ? <span className="planner-day-count">{dayItems.length}</span> : null}
        </div>
        <div className="planner-cell-items">
          {dayItems.slice(0, 3).map((item) => (
            <PlannerChip
              key={`${item.kind}-${item.data.id}`}
              item={item}
              compact
              onClick={() => onEditItem(item)}
              onToggleTask={(completed) => onToggleTask(item, completed)}
            />
          ))}
          {dayItems.length > 3 ? (
            <span className="planner-more">+{dayItems.length - 3} mục khác</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Calendar
      value={visibleDate}
      fullscreen
      headerRender={() => null}
      fullCellRender={fullCellRender}
      onSelect={(date) => onSelectDate(date)}
      onPanelChange={(date) => onVisibleDateChange(date)}
    />
  );
}
