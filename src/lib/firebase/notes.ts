import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { historyWrite } from "@/lib/firebase/history";
import type { NoteItem } from "@/lib/firebase/models";
import type { HistoryInput } from "@/lib/history";

// Mirrors firestore.rules. The rules can only bound the item count, so the
// per-item text limit below is enforced here.
export const noteLimits = { items: 100, itemText: 300 } as const;

/**
 * The whole "Ghi chú" checklist lives in one document. Keeping the lines in a
 * single list makes ticking (deleting) and undo position-exact and cheap.
 */
function checklistRef(userId: string) {
  return doc(getFirestoreDb(), "users", userId, "notes", "main");
}

function readItems(value: unknown): NoteItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry.id === "string" && typeof entry.text === "string"
      ? [{ id: entry.id, text: entry.text }]
      : [],
  );
}

export function newNoteItem(text = ""): NoteItem {
  return { id: crypto.randomUUID(), text };
}

/** Trims, drops blank lines and clamps to the limits the rules expect. */
function cleanItems(items: NoteItem[]) {
  return items
    .map((item) => ({ id: item.id, text: item.text.trim().slice(0, noteLimits.itemText) }))
    .filter((item) => item.text)
    .slice(0, noteLimits.items);
}

/**
 * Reads the stored list, applies `update` and writes it back in one
 * transaction, so concurrent edits from other devices are never lost. Creates
 * the document on first use (title/color/pinned are fixed by the rules' shape).
 * A `history` entry returned by `update` is logged in the same transaction.
 */
function updateChecklist<T>(
  userId: string,
  update: (
    items: NoteItem[],
  ) => { items: NoteItem[]; result: T; history?: HistoryInput } | null,
) {
  const ref = checklistRef(userId);
  return runTransaction(getFirestoreDb(), async (transaction: Transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists() ? readItems(snapshot.data().items) : [];
    const next = update(current);
    if (!next) return null;
    const items = cleanItems(next.items);
    if (snapshot.exists()) {
      transaction.update(ref, { items, updatedAt: serverTimestamp() });
    } else {
      transaction.set(ref, {
        title: "",
        color: "",
        pinned: false,
        items,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    if (next.history) {
      const entry = historyWrite(userId, next.history);
      transaction.set(entry.ref, entry.data);
    }
    return next.result;
  });
}

/**
 * Appends lines in entry order. Ids are made by the caller (`newNoteItem`) so
 * the UI can show the lines before the transaction lands. Resolves with how
 * many fit under the cap.
 */
export function addChecklistItems(userId: string, newItems: NoteItem[]) {
  return updateChecklist(userId, (items) => {
    const room = Math.max(noteLimits.items - items.length, 0);
    const added = cleanItems(newItems).slice(0, room);
    if (!added.length) return null;
    return {
      items: [...items, ...added],
      result: added.length,
      history: {
        action: "create",
        entity: "noteItem",
        entityId: added[0].id,
        title: added[0].text,
        before: null,
        after: { ...added[0] },
        count: added.length,
      },
    };
  });
}

/** Edits a line's text. Clearing it deletes the line, logged as a delete. */
export function updateChecklistItem(userId: string, itemId: string, text: string) {
  return updateChecklist(userId, (items) => {
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    const old = items[index];
    const nextText = text.trim().slice(0, noteLimits.itemText);
    if (nextText === old.text) return null;
    const history: HistoryInput = nextText
      ? {
          action: "update",
          entity: "noteItem",
          entityId: itemId,
          title: nextText,
          before: { id: itemId, text: old.text },
          after: { id: itemId, text: nextText },
        }
      : {
          action: "delete",
          entity: "noteItem",
          entityId: itemId,
          title: old.text,
          before: { id: itemId, text: old.text, index },
          after: null,
        };
    return {
      items: items.map((item) => (item.id === itemId ? { ...item, text } : item)),
      result: true,
      history,
    };
  });
}

/** Ticks a line off by deleting it. Resolves with it and its position, for undo. */
export function removeChecklistItem(userId: string, itemId: string) {
  return updateChecklist(userId, (items) => {
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    const item = items[index];
    return {
      items: items.filter((entry) => entry.id !== itemId),
      result: { item, index },
      history: {
        action: "delete",
        entity: "noteItem",
        entityId: itemId,
        title: item.text,
        before: { id: item.id, text: item.text, index },
        after: null,
      },
    };
  });
}

/** Undo for `removeChecklistItem`: puts the line back where it was. */
export function restoreChecklistItem(userId: string, item: NoteItem, index: number) {
  return updateChecklist(userId, (items) => {
    if (items.some((entry) => entry.id === item.id)) return null;
    const next = [...items];
    next.splice(Math.min(index, next.length), 0, item);
    return {
      items: next,
      result: true,
      history: {
        action: "restore",
        entity: "noteItem",
        entityId: item.id,
        title: item.text,
        before: null,
        after: { id: item.id, text: item.text },
      },
    };
  });
}

export function subscribeToChecklist(
  userId: string,
  onData: (items: NoteItem[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    checklistRef(userId),
    (snapshot) => onData(snapshot.exists() ? readItems(snapshot.data().items) : []),
    onError,
  );
}
