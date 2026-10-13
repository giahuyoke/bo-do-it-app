"use client";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Segmented, Select, Tooltip } from "antd";
import type { Dayjs } from "dayjs";
import type { ItemFilter } from "@/components/dashboard/dashboard-types";
import type { PlannerView } from "@/components/planner/planner-calendar";

interface CalendarToolbarProps {
  visibleDate: Dayjs;
  view: PlannerView;
  filter: ItemFilter;
  onChangeDate: (date: Dayjs) => void;
  onChangeView: (view: PlannerView) => void;
  onChangeFilter: (filter: ItemFilter) => void;
  onToday: () => void;
  /** Replaces the month/week pager when the list covers a fixed span. */
  fixedPeriod?: { label: string; detail: string };
}

function weekRange(date: Dayjs) {
  const start = date.startOf("week");
  return { start, end: start.add(6, "day") };
}

/** Week view names the days it shows; month and list views name the month. */
function periodLabel(date: Dayjs, view: PlannerView) {
  if (view !== "week") return date.format("MMMM");
  const { start, end } = weekRange(date);
  return start.isSame(end, "month")
    ? `${start.date()} – ${end.date()} ${end.format("MMMM")}`
    : `${start.format("D/M")} – ${end.format("D/M")}`;
}

function periodYear(date: Dayjs, view: PlannerView) {
  if (view !== "week") return date.format("YYYY");
  const { start, end } = weekRange(date);
  return start.isSame(end, "year")
    ? end.format("YYYY")
    : `${start.format("YYYY")} – ${end.format("YYYY")}`;
}

export function CalendarToolbar({
  visibleDate,
  view,
  filter,
  onChangeDate,
  onChangeView,
  onChangeFilter,
  onToday,
  fixedPeriod,
}: CalendarToolbarProps) {
  const navigationUnit = view === "week" ? "week" : "month";

  return (
    <div className="planner-calendar-toolbar">
      {fixedPeriod ? (
        <div className="planner-month-label">
          <strong>{fixedPeriod.label}</strong>
          <span>{fixedPeriod.detail}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Tooltip title={view === "week" ? "Tuần trước" : "Tháng trước"}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() =>
                onChangeDate(visibleDate.subtract(1, navigationUnit))
              }
            />
          </Tooltip>
          <div className="planner-month-label">
            <strong>{periodLabel(visibleDate, view)}</strong>
            <span>{periodYear(visibleDate, view)}</span>
          </div>
          <Tooltip title={view === "week" ? "Tuần sau" : "Tháng sau"}>
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => onChangeDate(visibleDate.add(1, navigationUnit))}
            />
          </Tooltip>
          <Button className="planner-today-button" onClick={onToday}>
            Hôm nay
          </Button>
        </div>
      )}

      <div className="planner-toolbar-controls">
        <Select<ItemFilter>
          value={filter}
          className="planner-filter"
          onChange={onChangeFilter}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "event", label: "Lịch trình" },
            { value: "task", label: "Nhiệm vụ" },
          ]}
        />
        <Segmented<PlannerView>
          value={view}
          onChange={onChangeView}
          options={[
            { value: "month", label: "Tháng" },
            { value: "week", label: "Tuần" },
            { value: "agenda", label: "Danh sách" },
          ]}
        />
      </div>
    </div>
  );
}
