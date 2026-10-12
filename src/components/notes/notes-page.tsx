"use client";

import { CalendarOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Empty, Input, Skeleton, Tooltip } from "antd";
import { useMemo, useState, type ClipboardEvent } from "react";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { NoteItem } from "@/lib/firebase/models";
import {
  addChecklistItems,
  newNoteItem,
  noteLimits,
  removeChecklistItem,
  restoreChecklistItem,
  updateChecklistItem,
} from "@/lib/firebase/notes";

interface NotesPageProps {
  userId: string;
  items: NoteItem[];
  loading: boolean;
  error: Error | null;
  search: string;
  onConvertItem: (item: NoteItem) => void;
}

/** Splits pasted text into lines, dropping bullets like "-", "•" or "[ ]". */
function pastedLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\[\s?[xX]?\])\s*/, "").trim())
    .filter(Boolean);
}

export function NotesPage({
  userId,
  items,
  loading,
  error,
  search,
  onConvertItem,
}: NotesPageProps) {
  const { message } = App.useApp();
  const [draft, setDraft] = useState("");
  // Optimistic state: transactions don't update the snapshot until they land.
  const [pending, setPending] = useState<NoteItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});

  const visible = useMemo(() => {
    const stored = new Set(items.map((item) => item.id));
    const all = [
      ...items,
      ...pending.filter((item) => !stored.has(item.id)),
    ].filter((item) => !hiddenIds.has(item.id));
    const term = search.trim().toLocaleLowerCase("vi");
    return term
      ? all.filter((item) => item.text.toLocaleLowerCase("vi").includes(term))
      : all;
  }, [hiddenIds, items, pending, search]);

  const total = items.length + pending.filter((p) => !items.some((i) => i.id === p.id)).length;
  const full = total >= noteLimits.items;

  const setHidden = (id: string, hidden: boolean) =>
    setHiddenIds((current) => {
      const next = new Set(current);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });

  const add = async (texts: string[]) => {
    const added = texts
      .map((text) => text.trim())
      .filter(Boolean)
      .slice(0, Math.max(noteLimits.items - total, 0))
      .map((text) => newNoteItem(text));
    if (!added.length) {
      if (full) void message.warning(`Checklist tối đa ${noteLimits.items} mục.`);
      return;
    }
    // Pending lines stay until the snapshot carries them (the list dedupes by
    // id), so they never blink out between the commit and the snapshot.
    setPending((current) => [
      ...current.filter((item) => !items.some((stored) => stored.id === item.id)),
      ...added,
    ]);
    try {
      await addChecklistItems(userId, added);
    } catch (addError) {
      const ids = new Set(added.map((item) => item.id));
      setPending((current) => current.filter((item) => !ids.has(item.id)));
      void message.error(firebaseErrorMessage(addError, "Không thể thêm vào checklist."));
    }
  };

  const submitDraft = () => {
    const text = draft;
    setDraft("");
    void add([text]);
  };

  const onDraftPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const lines = pastedLines(event.clipboardData.getData("text"));
    if (lines.length < 2) return;
    event.preventDefault();
    setDraft("");
    void add(lines);
  };

  const tickOff = async (item: NoteItem) => {
    setHidden(item.id, true);
    try {
      const removed = await removeChecklistItem(userId, item.id);
      if (!removed) return;
      const key = `note-tick-${item.id}`;
      void message.open({
        key,
        type: "success",
        duration: 5,
        content: (
          <span className="note-undo-message">
            Đã xong “{removed.item.text}”
            <button
              type="button"
              onClick={() => {
                message.destroy(key);
                setHidden(item.id, false);
                void restoreChecklistItem(userId, removed.item, removed.index).catch(
                  (undoError: unknown) =>
                    message.error(firebaseErrorMessage(undoError, "Không thể hoàn tác.")),
                );
              }}
            >
              Hoàn tác
            </button>
          </span>
        ),
      });
    } catch (tickError) {
      setHidden(item.id, false);
      void message.error(firebaseErrorMessage(tickError, "Không thể cập nhật checklist."));
    }
  };

  const commitEdit = async (item: NoteItem) => {
    const text = edits[item.id];
    if (text === undefined) return;
    const clear = () =>
      setEdits((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    // Clearing a line's text is treated as ticking it off.
    if (!text.trim()) {
      clear();
      void tickOff(item);
      return;
    }
    if (text.trim() === item.text) {
      clear();
      return;
    }
    try {
      await updateChecklistItem(userId, item.id, text);
    } catch (editError) {
      void message.error(firebaseErrorMessage(editError, "Không thể lưu thay đổi."));
    } finally {
      clear();
    }
  };

  return (
    <section className="notes-page" aria-label="Ghi chú">
      <div className="notes-heading">
        <span className="planner-eyebrow">GHI CHÚ</span>
        <h1>Checklist của bạn</h1>
        <p>Enter để thêm · tick là xong và gạch khỏi danh sách.</p>
      </div>

      <div className="notes-sheet">
        <Input
          size="large"
          variant="borderless"
          className="notes-quick-add"
          prefix={<PlusOutlined />}
          placeholder={full ? `Đã đủ ${noteLimits.items} mục` : "Thêm việc cần nhớ…"}
          disabled={full}
          maxLength={noteLimits.itemText}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={onDraftPaste}
          onPressEnter={(event) => {
            // Vietnamese IMEs confirm a syllable with Enter; don't submit then.
            if (!event.nativeEvent.isComposing) submitDraft();
          }}
          aria-label="Thêm mục vào checklist, nhấn Enter để thêm"
        />

        {error ? (
          <p className="notes-error">{firebaseErrorMessage(error, "Không thể tải checklist.")}</p>
        ) : null}

        {loading ? (
          <div className="p-4">
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        ) : visible.length ? (
          <ul className="notes-list">
            {visible.map((item) => {
              const isPending = !items.some((stored) => stored.id === item.id);
              return (
                <li key={item.id} className={isPending ? "is-pending" : ""}>
                  <Checkbox
                    checked={false}
                    disabled={isPending}
                    aria-label={`Đánh dấu xong ${item.text}`}
                    onChange={() => void tickOff(item)}
                  />
                  <Input
                    variant="borderless"
                    maxLength={noteLimits.itemText}
                    readOnly={isPending}
                    value={edits[item.id] ?? item.text}
                    onChange={(event) =>
                      setEdits((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    onBlur={() => void commitEdit(item)}
                    onPressEnter={(event) => {
                      if (!event.nativeEvent.isComposing) event.currentTarget.blur();
                    }}
                    aria-label={`Sửa ${item.text}`}
                  />
                  {!isPending ? (
                    <Tooltip title="Chuyển thành nhiệm vụ">
                      <Button
                        type="text"
                        size="small"
                        className="note-item-convert"
                        icon={<CalendarOutlined />}
                        aria-label={`Chuyển “${item.text}” thành nhiệm vụ`}
                        onClick={() => onConvertItem(item)}
                      />
                    </Tooltip>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty
            className="notes-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={search.trim() ? "Không có mục phù hợp" : "Chưa có gì cần nhớ"}
          />
        )}
      </div>
    </section>
  );
}
