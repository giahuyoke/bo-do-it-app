"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Calendar, Empty, Typography } from "antd";
import type { CalendarProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { useMemo, type MouseEvent } from "react";
import {
  compareByCreation,
  comparePlannerItems,
  plannerItemColor,
  plannerItemCoversDay,
  plannerItemDate,
  plannerItemOverlaps,
  plannerItemSchedule,
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
  onAddItem: (date: Dayjs) => void;
  /** "month" limits the list view to the visible month; "all" lists everything. */
  agendaScope: "month" | "all";
}

/** Double-clicking empty space in a day adds to it; chips keep their own clicks. */
function addOnDoubleClick(date: Dayjs, onAdd: (date: Dayjs) => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest(".planner-chip, .planner-cell-add")) return;
    onAdd(date);
  };
}

function AddDayButton({ date, onAdd }: { date: Dayjs; onAdd: (date: Dayjs) => void }) {
  return (
    <button
      type="button"
      className="planner-cell-add"
      aria-label={`Thêm kế hoạch ngày ${date.format("DD/MM/YYYY")}`}
      title="Thêm kế hoạch"
      onClick={(event) => {
        event.stopPropagation();
        onAdd(date);
      }}
    >
      <PlusOutlined />
    </button>
  );
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
      {!compact ? <span className="planner-chip-time">{plannerItemSchedule(item)}</span> : null}
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
  onAddItem,
  agendaScope,
}: PlannerCalendarProps) {
  const datedItems = useMemo(
    () => items.filter((item) => plannerItemDate(item)).sort(comparePlannerItems),
    [items],
  );

  const itemsForDate = (date: Dayjs) =>
    datedItems
      .filter((item) => plannerItemCoversDay(item, date))
      .sort(compareByCreation);

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
              onDoubleClick={addOnDoubleClick(date, onAddItem)}
            >
              <AddDayButton date={date} onAdd={onAddItem} />
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
    const agendaItems =
      agendaScope === "month"
        ? datedItems.filter((item) =>
            plannerItemOverlaps(
              item,
              visibleDate.startOf("month"),
              visibleDate.endOf("month"),
            ),
          )
        : datedItems;

    if (!agendaItems.length) {
      return (
        <div className="flex min-h-96 items-center justify-center">
          <Empty
            description={
              agendaScope === "month"
                ? `Không có kế hoạch nào trong ${visibleDate.format("MMMM")}`
                : "Không có kế hoạch nào"
            }
          />
        </div>
      );
    }

    return (
      <div className="planner-agenda">
        {agendaItems.map((item) => {
          const date = dayjs(plannerItemDate(item));
          const color = plannerItemColor(item);
          const schedule = plannerItemSchedule(item);
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
                {schedule || item.data.tagName ? (
                  <Text type="secondary" className="mt-1 block text-xs!">
                    {schedule ? (
                      <>
                        <ClockCircleOutlined className="mr-1" /> {schedule}
                      </>
                    ) : null}
                    {schedule && item.data.tagName ? " · " : ""}
                    {item.data.tagName}
                  </Text>
                ) : null}
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
        onDoubleClick={addOnDoubleClick(date, onAddItem)}
      >
        <AddDayButton date={date} onAdd={onAddItem} />
        <div className="planner-date-number-row">
          <span className={isToday ? "planner-today-number" : ""}>
            {date.date()}
          </span>
          <span className="planner-lunar-date" title="Âm lịch">
            {formatLunarDate(date.toDate(), date.date() === 1)}
          </span>
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
          {/* Narrow cells fit two chips; CSS swaps in this counter on mobile. */}
          {dayItems.length > 2 ? (
            <span className="planner-more-compact">+{dayItems.length - 2}</span>
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
