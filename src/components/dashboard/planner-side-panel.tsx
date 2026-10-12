"use client";

import {
  BellOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Divider, Dropdown, Empty, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { PlannerItemType } from "@/components/dashboard/dashboard-types";
import { DayItem } from "@/components/dashboard/day-item";
import { ItemTitle } from "@/components/planner/item-title";
import { plannerItemDate, type PlannerItem } from "@/lib/planner";
import { formatLunarDate } from "@/lib/lunar-calendar";

const { Text, Title } = Typography;

interface PlannerSidePanelProps {
  selectedDate: Dayjs;
  selectedItems: PlannerItem[];
  upcomingItems: PlannerItem[];
  nextReminder?: PlannerItem;
  onAdd: (type: PlannerItemType) => void;
  onEdit: (item: PlannerItem) => void;
  onToggleTask: (item: PlannerItem, completed: boolean) => void;
  onViewAgenda: () => void;
}

export function PlannerSidePanel({
  selectedDate,
  selectedItems,
  upcomingItems,
  nextReminder,
  onAdd,
  onEdit,
  onToggleTask,
  onViewAgenda,
}: PlannerSidePanelProps) {
  return (
    <aside className="planner-right-panel">
      <section className="planner-panel-section planner-selected-day">
        <div className="planner-panel-heading">
          <div>
            <Text
              type="secondary"
              className="text-xs! uppercase tracking-wider"
            >
              {selectedDate.isSame(dayjs(), "day")
                ? "Hôm nay"
                : selectedDate.format("dddd")}
            </Text>
            <Title level={4} className="mb-0! mt-1! capitalize">
              {selectedDate.format("DD [tháng] M")}
            </Title>
            <Text type="secondary" className="text-xs!">
              {formatLunarDate(selectedDate.toDate(), true)}
            </Text>
          </div>
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
            menu={{
              items: [
                {
                  key: "event",
                  icon: <CalendarOutlined />,
                  label: "Thêm lịch trình",
                  onClick: () => onAdd("event"),
                },
                {
                  key: "task",
                  icon: <CheckSquareOutlined />,
                  label: "Thêm nhiệm vụ",
                  onClick: () => onAdd("task"),
                },
              ],
            }}
          >
            <Button
              className="planner-day-add-trigger"
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              aria-label="Thêm kế hoạch"
            />
          </Dropdown>
        </div>

        <div className="planner-day-add-actions" aria-label="Thêm kế hoạch cho ngày đã chọn">
          <button type="button" onClick={() => onAdd("task")}>
            <CheckSquareOutlined aria-hidden="true" />
            <span>Thêm nhiệm vụ</span>
          </button>
          <button type="button" onClick={() => onAdd("event")}>
            <CalendarOutlined aria-hidden="true" />
            <span>Thêm lịch trình</span>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <DayItem
                key={`${item.kind}-${item.data.id}`}
                item={item}
                onClick={() => onEdit(item)}
                onToggleTask={(completed) => onToggleTask(item, completed)}
              />
            ))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Ngày này đang trống"
            />
          )}
        </div>
      </section>

      {nextReminder ? (
        <section className="planner-reminder-card">
          <div className="planner-reminder-icon">
            <BellOutlined />
          </div>
          <div className="min-w-0 flex-1">
            <Text className="text-xs! font-semibold uppercase tracking-wider text-amber-700!">
              Nhắc hẹn gần nhất
            </Text>
            <div className="mt-1 truncate font-semibold text-slate-800">
              <ItemTitle title={nextReminder.data.title} completed={nextReminder.kind === "task" && nextReminder.data.status === "done"} />
            </div>
            <Text type="secondary" className="text-xs!">
              {dayjs(plannerItemDate(nextReminder)).format("DD/MM/YYYY")}
            </Text>
          </div>
        </section>
      ) : null}

      <Divider />

      <section className="planner-panel-section">
        <div className="planner-panel-heading">
          <Title level={5} className="mb-0!">
            Sắp tới
          </Title>
          <Button type="link" size="small" onClick={onViewAgenda}>
            Xem tất cả
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingItems.length ? (
            upcomingItems.map((item) => (
              <DayItem
                key={`${item.kind}-${item.data.id}`}
                item={item}
                onClick={() => onEdit(item)}
                onToggleTask={(completed) => onToggleTask(item, completed)}
              />
            ))
          ) : (
            <Text type="secondary" className="text-sm!">
              Chưa có kế hoạch sắp tới.
            </Text>
          )}
        </div>
      </section>
    </aside>
  );
}
