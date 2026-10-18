"use client";

import { EllipsisOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Dropdown, Segmented, Skeleton, Switch } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { HistoryEntryRow } from "@/components/history/history-entry-row";
import { useHistory } from "@/hooks/use-history";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import {
  filterEntries,
  groupByDay,
  historyRetentionDays,
  isRestorable,
  type HistoryEntry,
  type HistoryFilter,
} from "@/lib/history";

const filterOptions: Array<{ value: HistoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "event", label: "Sự kiện" },
  { value: "task", label: "Nhiệm vụ" },
  { value: "tag", label: "Tag" },
  { value: "noteItem", label: "Ghi chú" },
];

interface HistoryPageProps {
  userId: string;
  /** `historyItemKey`s of every item loaded now, to tell which deleted ones are still gone. */
  existingKeys: ReadonlySet<string>;
}

export function HistoryPage({ userId, existingKeys }: HistoryPageProps) {
  const { message, modal } = App.useApp();
  const history = useHistory(userId);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const days = useMemo(
    () => groupByDay(filterEntries(history.entries, filter, deletedOnly), dayjs()),
    [history.entries, filter, deletedOnly],
  );

  const restore = async (entry: HistoryEntry) => {
    setRestoringId(entry.id);
    try {
      await history.restore(entry);
      void message.success(`Đã khôi phục “${entry.title}”.`);
    } catch (error) {
      void message.error(firebaseErrorMessage(error, "Không thể khôi phục."));
    } finally {
      setRestoringId(null);
    }
  };

  const confirmClear = () =>
    modal.confirm({
      title: "Xóa toàn bộ nhật ký?",
      content: "Mục đã xóa sẽ không còn khôi phục được từ trang này.",
      okText: "Xóa nhật ký",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await history.clear();
          void message.success("Đã xóa nhật ký.");
        } catch (error) {
          void message.error(firebaseErrorMessage(error, "Không thể xóa nhật ký."));
        }
      },
    });

  return (
    <section className="history-page" aria-label="Lịch sử">
      <div className="history-heading">
        <div className="notes-heading">
          <span className="planner-eyebrow">LỊCH SỬ</span>
          <h1>Nhật ký thay đổi</h1>
          <p>Mọi thay đổi trong {historyRetentionDays} ngày qua. Mục đã xóa có thể khôi phục.</p>
        </div>
        <div className="history-actions">
          <Button
            icon={<ReloadOutlined />}
            aria-label="Làm mới"
            loading={history.loading}
            onClick={history.reload}
          />
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "clear", danger: true, label: "Xóa nhật ký", disabled: !history.entries.length },
              ],
              onClick: confirmClear,
            }}
          >
            <Button icon={<EllipsisOutlined />} aria-label="Thao tác khác" />
          </Dropdown>
        </div>
      </div>

      <div className="history-filters">
        <Segmented
          options={filterOptions}
          value={filter}
          onChange={(value) => setFilter(value as HistoryFilter)}
        />
        <label className="history-deleted-only">
          <Switch size="small" checked={deletedOnly} onChange={(checked) => setDeletedOnly(checked)} />
          Chỉ mục đã xóa
        </label>
      </div>

      {history.error ? (
        <Alert
          type="error"
          showIcon
          title="Không thể tải lịch sử"
          description={firebaseErrorMessage(history.error, "Vui lòng thử lại.")}
        />
      ) : null}

      {history.loading && !history.entries.length ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : days.length ? (
        days.map((day) => (
          <section key={day.key} className="history-day" aria-label={day.label}>
            <h2>{day.label}</h2>
            <ul>
              {day.entries.map((entry) => (
                <HistoryEntryRow
                  key={entry.id}
                  entry={entry}
                  restorable={isRestorable(entry, existingKeys)}
                  restoring={restoringId === entry.id}
                  onRestore={(item) => void restore(item)}
                />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState
          art={history.entries.length ? "search" : "tea"}
          title={
            history.entries.length
              ? "Không có thay đổi nào khớp bộ lọc."
              : `Chưa có thay đổi nào trong ${historyRetentionDays} ngày qua.`
          }
        />
      )}

      {history.hasMore ? (
        <Button className="history-more" loading={history.loadingMore} onClick={() => void history.loadMore()}>
          Tải thêm
        </Button>
      ) : null}
    </section>
  );
}
