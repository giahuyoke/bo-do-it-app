"use client";

import { PushpinFilled } from "@ant-design/icons";
import { Checkbox } from "antd";
import type { Note, NoteItem } from "@/lib/firebase/models";

/** Lines shown on a card; the rest are counted, and the editor shows all. */
const previewLimit = 5;

export const defaultNoteColor = "#e9bd4e";

interface NoteCardProps {
  note: Note;
  /** Items ticked off here but not yet confirmed gone by the server. */
  hiddenItemIds: ReadonlySet<string>;
  onOpen: () => void;
  onTick: (item: NoteItem) => void;
}

export function NoteCard({ note, hiddenItemIds, onOpen, onTick }: NoteCardProps) {
  const items = note.items.filter((item) => !hiddenItemIds.has(item.id));
  const color = note.color || defaultNoteColor;

  return (
    <article
      className={`note-card ${items.length ? "" : "is-empty"}`}
      style={{ borderTopColor: color, backgroundColor: `${color}12` }}
    >
      <button type="button" className="note-card-head" onClick={onOpen}>
        <span className="note-card-title">{note.title || "Không tiêu đề"}</span>
        {note.pinned ? <PushpinFilled className="note-card-pin" aria-label="Đã ghim" /> : null}
        <span className="note-card-count">{items.length}</span>
      </button>

      {items.length ? (
        <ul className="note-card-items">
          {items.slice(0, previewLimit).map((item) => (
            <li key={item.id}>
              <Checkbox checked={false} onChange={() => onTick(item)}>
                {item.text}
              </Checkbox>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="button" className="note-card-foot" onClick={onOpen}>
        {items.length > previewLimit
          ? `+${items.length - previewLimit} mục nữa`
          : items.length
            ? "Mở để sửa"
            : note.items.length
              ? "Đang cập nhật…"
              : "Xong hết rồi · thêm mục mới"}
      </button>
    </article>
  );
}
