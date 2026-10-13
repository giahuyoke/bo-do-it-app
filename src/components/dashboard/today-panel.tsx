"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Skeleton } from "antd";
import type { Dayjs } from "dayjs";
import { DayItem } from "@/components/dashboard/day-item";
import { EmptyState } from "@/components/empty-state";
import type { PlannerItem } from "@/lib/planner";
import { todaySections } from "@/lib/today";

interface TodayPanelProps {
  items: PlannerItem[];
  today: Dayjs;
  search: string;
  loading: boolean;
  onAdd: () => void;
  onEdit: (item: PlannerItem) => void;
  onToggleTask: (item: PlannerItem, completed: boolean) => void;
}

export function TodayPanel({ items, today, search, loading, onAdd, onEdit, onToggleTask }: TodayPanelProps) {
  const { pending, completed, events } = todaySections(items, today, search);
  const taskCount = pending.length + completed.length;
  const empty = !taskCount && !events.length;
  const groups = [
    { id: "pending", title: "Cần làm hôm nay", items: pending },
    { id: "events", title: "Lịch trình hôm nay", items: events },
    { id: "completed", title: "Đã hoàn thành", items: completed },
  ];

  return (
    <section className="today-page" aria-labelledby="today-title">
      <header className="today-heading">
        <div>
          <span className="planner-eyebrow">{today.format("dddd, DD [tháng] M [năm] YYYY")}</span>
          <h1 id="today-title">Hôm nay</h1>
          <p>Từng việc nhỏ, một ngày trọn vẹn.</p>
        </div>
        <button type="button" className="today-add-button" onClick={onAdd}>
          <PlusOutlined aria-hidden="true" />
          <span>Thêm công việc</span>
        </button>
      </header>
      {loading ? <div className="today-body"><Skeleton active paragraph={{ rows: 5 }} /></div> : (
        <div className="today-body">
          {taskCount > 0 ? (
            <div className="today-progress">
              <span>{completed.length}/{taskCount} công việc đã hoàn thành{search.trim() ? " trong kết quả tìm kiếm" : ""}</span>
              <progress value={completed.length} max={taskCount} aria-label="Tiến độ công việc hôm nay" />
            </div>
          ) : null}
          {empty ? (
            search.trim() ? (
              <EmptyState art="search" title="Không tìm thấy việc phù hợp"
                description={<>Hôm nay không có kế hoạch nào khớp với “{search.trim()}”.</>} />
            ) : (
              <EmptyState art="tea" title="Hôm nay thảnh thơi"
                description="Chưa có kế hoạch nào. Pha một tách trà, rồi thêm việc đầu tiên khi bạn sẵn sàng." />
            )
          ) : groups.map((group) => group.items.length ? (
            <section key={group.id} className="today-group" aria-labelledby={`today-${group.id}`}>
              <h2 id={`today-${group.id}`}>{group.title}<span>{group.items.length}</span></h2>
              <ul>
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.data.id}`}>
                    <DayItem item={item} onClick={() => onEdit(item)} onToggleTask={(done) => onToggleTask(item, done)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null)}
        </div>
      )}
    </section>
  );
}
