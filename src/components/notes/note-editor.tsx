"use client";

import {
  CalendarOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
} from "@ant-design/icons";
import { App, Button, Checkbox, Drawer, Input, Popconfirm, Tooltip } from "antd";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { ItemColorButton } from "@/components/planner/form/item-color-button";
import { defaultNoteColor } from "@/components/notes/note-card";
import { firebaseErrorMessage } from "@/lib/firebase/errors";
import type { Note, NoteItem } from "@/lib/firebase/models";
import {
  deleteNote,
  newNoteItem,
  noteLimits,
  restoreNoteItem,
  updateNote,
} from "@/lib/firebase/notes";

const autosaveDelay = 600;

interface Draft {
  title: string;
  items: NoteItem[];
}

interface NoteEditorProps {
  userId: string;
  /** Mount with `key={note.id}`: the draft is seeded once from this note. */
  note: Note;
  onClose: () => void;
  onConvertItem: (item: NoteItem) => void;
}

/**
 * Edits a checklist. The local draft is the source of truth while open and is
 * autosaved; ticking a line deletes it (with undo), as there is no done state.
 */
export function NoteEditor({ userId, note, onClose, onConvertItem }: NoteEditorProps) {
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft>(() => ({
    title: note.title,
    // An empty checklist opens on a blank line, ready to type into.
    items: note.items.length ? note.items : [newNoteItem()],
  }));
  const latestDraft = useRef(draft);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const deleted = useRef(false);
  const mounted = useRef(true);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  // The line to focus once the list re-renders (a new or neighbouring line).
  const pendingFocus = useRef<string | null>(
    note.items.length ? null : draft.items[0]?.id ?? null,
  );

  const save = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!dirty.current || deleted.current) return;
    dirty.current = false;
    try {
      await updateNote(userId, note.id, latestDraft.current);
    } catch (error) {
      dirty.current = true;
      void message.error(firebaseErrorMessage(error, "Không thể lưu ghi chú."));
    }
  }, [message, note.id, userId]);

  // Flush pending edits when the editor goes away.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void save();
    };
  }, [save]);

  const focusLine = (id: string | null | undefined) => {
    const input = id ? inputs.current.get(id) : undefined;
    if (!input) return false;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    return true;
  };

  useEffect(() => {
    if (focusLine(pendingFocus.current)) pendingFocus.current = null;
  }, [draft.items]);

  // Every edit goes through here: update the draft, then save it either right
  // away (ticks, structural changes worth keeping) or after typing pauses.
  const change = (update: (current: Draft) => Draft, { now = false } = {}) => {
    const next = update(latestDraft.current);
    latestDraft.current = next;
    setDraft(next);
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (now) void save();
    else saveTimer.current = setTimeout(() => void save(), autosaveDelay);
  };

  const setItemText = (id: string, text: string) =>
    change((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, text } : item)),
    }));

  const insertAfter = (index: number, texts: string[]) => {
    const created = texts.map((text) => newNoteItem(text));
    change((current) => {
      const items = [...current.items];
      items.splice(index + 1, 0, ...created);
      return { ...current, items: items.slice(0, noteLimits.items) };
    });
    pendingFocus.current = created.at(-1)?.id ?? null;
  };

  const tickOff = (item: NoteItem, index: number) => {
    change(
      (current) => ({
        ...current,
        items: current.items.filter((entry) => entry.id !== item.id),
      }),
      { now: true },
    );
    if (!item.text.trim()) return;

    const key = `note-tick-${item.id}`;
    const undo = () => {
      message.destroy(key);
      if (mounted.current) {
        change(
          (current) => {
            if (current.items.some((entry) => entry.id === item.id)) return current;
            const items = [...current.items];
            items.splice(Math.min(index, items.length), 0, item);
            return { ...current, items };
          },
          { now: true },
        );
        return;
      }
      // The editor closed meanwhile: restore straight into the stored list.
      void restoreNoteItem(userId, note.id, item, index).catch((error: unknown) =>
        message.error(firebaseErrorMessage(error, "Không thể hoàn tác.")),
      );
    };
    void message.open({
      key,
      type: "success",
      duration: 5,
      content: (
        <span className="note-undo-message">
          Đã xong “{item.text}”
          <button type="button" onClick={undo}>
            Hoàn tác
          </button>
        </span>
      ),
    });
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLInputElement>, item: NoteItem, index: number) => {
    // Vietnamese IMEs compose with Enter/Backspace; leave those keystrokes alone.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (draft.items.length < noteLimits.items) insertAfter(index, [""]);
      return;
    }
    if (event.key === "Backspace" && !item.text && draft.items.length > 1) {
      event.preventDefault();
      const neighbour = draft.items[index - 1] ?? draft.items[index + 1];
      change((current) => ({
        ...current,
        items: current.items.filter((entry) => entry.id !== item.id),
      }));
      pendingFocus.current = neighbour?.id ?? null;
    }
  };

  // Pasting several lines (e.g. a copied list) makes one item per line.
  const onItemPaste = (event: ClipboardEvent<HTMLInputElement>, item: NoteItem, index: number) => {
    const lines = event.clipboardData
      .getData("text")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*•]|\[\s?[xX]?\])\s*/, "").trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    const room = noteLimits.items - draft.items.length;
    if (!item.text) {
      setItemText(item.id, lines[0]);
      insertAfter(index, lines.slice(1, room + 1));
    } else {
      insertAfter(index, lines.slice(0, room));
    }
  };

  const convert = async (item: NoteItem) => {
    await save();
    onClose();
    onConvertItem(item);
  };

  const remove = async () => {
    deleted.current = true;
    try {
      await deleteNote(userId, note.id);
      void message.success("Đã xóa ghi chú.");
      onClose();
    } catch (error) {
      deleted.current = false;
      void message.error(firebaseErrorMessage(error, "Không thể xóa ghi chú."));
    }
  };

  const setMeta = (patch: Pick<Note, "color"> | Pick<Note, "pinned">) =>
    void updateNote(userId, note.id, patch).catch((error: unknown) =>
      message.error(firebaseErrorMessage(error, "Không thể lưu ghi chú.")),
    );

  const full = draft.items.length >= noteLimits.items;

  return (
    <Drawer
      open
      size={520}
      className="planner-editor note-editor"
      title={null}
      onClose={() => {
        void save();
        onClose();
      }}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Popconfirm
            title="Xóa ghi chú này?"
            description="Toàn bộ checklist sẽ bị xóa."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove()}
          >
            <Button danger>Xóa ghi chú</Button>
          </Popconfirm>
          <Button
            type="primary"
            onClick={() => {
              void save();
              onClose();
            }}
          >
            Xong
          </Button>
        </div>
      }
    >
      <div className="note-editor-head">
        <Input
          variant="borderless"
          className="note-editor-title"
          placeholder="Tiêu đề checklist"
          maxLength={noteLimits.title}
          value={draft.title}
          onChange={(event) => {
            const title = event.target.value;
            change((current) => ({ ...current, title }));
          }}
          onPressEnter={() => focusLine(draft.items[0]?.id)}
        />
        <ItemColorButton
          value={note.color}
          fallbackColor={defaultNoteColor}
          onChange={(color) => setMeta({ color })}
        />
        <Tooltip title={note.pinned ? "Bỏ ghim" : "Ghim lên đầu"}>
          <Button
            size="large"
            className="note-editor-pin"
            aria-pressed={note.pinned}
            aria-label={note.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
            icon={note.pinned ? <PushpinFilled /> : <PushpinOutlined />}
            onClick={() => setMeta({ pinned: !note.pinned })}
          />
        </Tooltip>
      </div>

      <ul className="note-editor-items">
        {draft.items.map((item, index) => (
          <li key={item.id}>
            <Checkbox
              checked={false}
              aria-label={`Đánh dấu xong ${item.text || "mục trống"}`}
              onChange={() => tickOff(item, index)}
            />
            <Input
              variant="borderless"
              placeholder="Mục mới"
              maxLength={noteLimits.itemText}
              value={item.text}
              ref={(element) => {
                const input = element?.input;
                if (input) inputs.current.set(item.id, input);
                else inputs.current.delete(item.id);
              }}
              onChange={(event) => setItemText(item.id, event.target.value)}
              onKeyDown={(event) => onItemKeyDown(event, item, index)}
              onPaste={(event) => onItemPaste(event, item, index)}
            />
            {item.text.trim() ? (
              <Tooltip title="Chuyển thành nhiệm vụ">
                <Button
                  type="text"
                  size="small"
                  className="note-item-convert"
                  icon={<CalendarOutlined />}
                  aria-label={`Chuyển “${item.text}” thành nhiệm vụ`}
                  onClick={() => void convert(item)}
                />
              </Tooltip>
            ) : null}
          </li>
        ))}
      </ul>

      <Button
        type="link"
        className="note-editor-add"
        icon={<PlusOutlined />}
        disabled={full}
        onClick={() => insertAfter(draft.items.length - 1, [""])}
      >
        {full ? `Tối đa ${noteLimits.items} mục` : "Thêm mục"}
      </Button>
    </Drawer>
  );
}
