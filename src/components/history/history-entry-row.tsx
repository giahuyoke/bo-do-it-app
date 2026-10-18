"use client";

import {
  CheckOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  RollbackOutlined,
  SwapOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import {
  colorFields,
  describeEntry,
  diffFields,
  type HistoryAction,
  type HistoryEntry,
} from "@/lib/history";

const actionIcons: Record<HistoryAction, ReactNode> = {
  create: <PlusOutlined />,
  update: <EditOutlined />,
  delete: <DeleteOutlined />,
  complete: <CheckOutlined />,
  reopen: <UndoOutlined />,
  convert: <SwapOutlined />,
  restore: <RollbackOutlined />,
};

function ChangeValue({ field, value }: { field: string; value: string }) {
  if (!colorFields.has(field) || !value.startsWith("#")) return <>{value}</>;
  return (
    <span className="history-color">
      <span className="history-swatch" style={{ background: value }} aria-hidden="true" />
      {value}
    </span>
  );
}

interface HistoryEntryRowProps {
  entry: HistoryEntry;
  restorable: boolean;
  restoring: boolean;
  onRestore: (entry: HistoryEntry) => void;
}

export function HistoryEntryRow({ entry, restorable, restoring, onRestore }: HistoryEntryRowProps) {
  const [open, setOpen] = useState(false);
  const changes =
    entry.action === "update" || entry.action === "convert"
      ? diffFields(entry.before, entry.after)
      : [];

  const summary = (
    <>
      <span className={`history-icon is-${entry.action}`} aria-hidden="true">
        {actionIcons[entry.action]}
      </span>
      <span className="history-text">{describeEntry(entry)}</span>
      <time dateTime={entry.at.toISOString()}>{dayjs(entry.at).format("HH:mm")}</time>
    </>
  );

  return (
    <li className="history-entry">
      <div className="history-entry-main">
        {changes.length ? (
          <button
            type="button"
            className="history-entry-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {summary}
            <DownOutlined className="history-chevron" aria-hidden="true" />
          </button>
        ) : (
          <div className="history-entry-toggle">{summary}</div>
        )}
        {restorable ? (
          <Button
            size="small"
            icon={<RollbackOutlined />}
            loading={restoring}
            onClick={() => onRestore(entry)}
          >
            Khôi phục
          </Button>
        ) : null}
      </div>
      {open && changes.length ? (
        <dl className="history-changes">
          {changes.map((change) => (
            <div key={change.field}>
              <dt>{change.label}</dt>
              <dd>
                <ChangeValue field={change.field} value={change.from} />
                {" → "}
                <ChangeValue field={change.field} value={change.to} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}
