"use client";

import { CheckSquareOutlined } from "@ant-design/icons";
import { App, Empty, Input, Skeleton } from "antd";
import { useMemo, useState } from "react";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditor } from "@/components/notes/note-editor";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { Note, NoteItem } from "@/lib/firebase/models";
import {
  createNote,
  newNoteRef,
  noteLimits,
  removeNoteItem,
  restoreNoteItem,
} from "@/lib/firebase/notes";

interface NotesPageProps {
  userId: string;
  notes: Note[];
  loading: boolean;
  error: Error | null;
  search: string;
  onConvertItem: (note: Note, item: NoteItem) => void;
}

function matches(note: Note, term: string) {
  return [note.title, ...note.items.map((item) => item.text)]
    .join(" ")
    .toLocaleLowerCase("vi")
    .includes(term);
}

export function NotesPage({
  userId,
  notes,
  loading,
  error,
  search,
  onConvertItem,
}: NotesPageProps) {
  const { message } = App.useApp();
  const [draftTitle, setDraftTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hiddenItemIds, setHiddenItemIds] = useState<ReadonlySet<string>>(new Set());

  const { pinned, others } = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    const visible = term ? notes.filter((note) => matches(note, term)) : notes;
    return {
      pinned: visible.filter((note) => note.pinned),
      others: visible.filter((note) => !note.pinned),
    };
  }, [notes, search]);

  // Unmounts the editor (and flushes its draft) if the note is deleted elsewhere.
  const editingNote = notes.find((note) => note.id === editingId);

  const setHidden = (id: string, hidden: boolean) =>
    setHiddenItemIds((current) => {
      const next = new Set(current);
      if (hidden) next.add(id);
      else next.delete(id);
      return next;
    });

  const create = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    const ref = newNoteRef(userId);
    setDraftTitle("");
    // Open on the id right away; the local snapshot shows the note instantly.
    setEditingId(ref.id);
    try {
      await createNote(userId, title, [], ref);
    } catch (createError) {
      setEditingId(null);
      setDraftTitle(title);
      void message.error(firebaseErrorMessage(createError, "Không thể tạo ghi chú."));
    }
  };

  const tickOff = async (note: Note, item: NoteItem) => {
    setHidden(item.id, true);
    try {
      const removed = await removeNoteItem(userId, note.id, item.id);
      if (!removed) return;
      const key = `note-tick-${item.id}`;
      void message.open({
        key,
        type: "success",
        duration: 5,
        content: (
          <span className="note-undo-message">
            Đã xong “{item.text}”
            <button
              type="button"
              onClick={() => {
                message.destroy(key);
                setHidden(item.id, false);
                void restoreNoteItem(userId, note.id, removed.item, removed.index).catch(
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

  const renderGrid = (list: Note[]) => (
    <div className="notes-grid">
      {list.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          hiddenItemIds={hiddenItemIds}
          onOpen={() => setEditingId(note.id)}
          onTick={(item) => void tickOff(note, item)}
        />
      ))}
    </div>
  );

  return (
    <section className="notes-page" aria-label="Ghi chú">
      <div className="notes-heading">
        <div>
          <span className="planner-eyebrow">GHI CHÚ</span>
          <h1>Checklist của bạn</h1>
          <p>Tick một mục là xong và gạch khỏi danh sách.</p>
        </div>
      </div>

      <Input
        size="large"
        className="notes-quick-add"
        prefix={<CheckSquareOutlined className="text-slate-400" />}
        placeholder="Tạo checklist mới, ví dụ: Đi chợ cuối tuần"
        maxLength={noteLimits.title}
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onPressEnter={(event) => {
          if (!event.nativeEvent.isComposing) void create();
        }}
        aria-label="Tiêu đề checklist mới, nhấn Enter để tạo"
      />

      {error ? (
        <p className="notes-error">{firebaseErrorMessage(error, "Không thể tải ghi chú.")}</p>
      ) : null}

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !pinned.length && !others.length ? (
        <Empty
          className="notes-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={search.trim() ? "Không có ghi chú phù hợp" : "Chưa có checklist nào"}
        />
      ) : (
        <>
          {pinned.length ? (
            <>
              <h2 className="notes-group-label">Đã ghim</h2>
              {renderGrid(pinned)}
            </>
          ) : null}
          {others.length ? (
            <>
              {pinned.length ? <h2 className="notes-group-label">Khác</h2> : null}
              {renderGrid(others)}
            </>
          ) : null}
        </>
      )}

      {editingNote ? (
        <NoteEditor
          key={editingNote.id}
          userId={userId}
          note={editingNote}
          onClose={() => setEditingId(null)}
          onConvertItem={(item) => onConvertItem(editingNote, item)}
        />
      ) : null}
    </section>
  );
}
