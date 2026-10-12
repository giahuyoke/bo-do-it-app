import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
import type { Note, NoteItem, NotePatch } from "@/lib/firebase/models";

// Mirrors firestore.rules. The rules can only bound the item count, so the
// per-item limits below are enforced here.
export const noteLimits = { title: 200, items: 100, itemText: 300 } as const;

function notesCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "notes");
}

function readItems(value: unknown): NoteItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry.id === "string" && typeof entry.text === "string"
      ? [{ id: entry.id, text: entry.text }]
      : [],
  );
}

function noteFromDocument(data: ReturnType<typeof documentData>): Note {
  return {
    id: data.id,
    title: String(data.title ?? ""),
    color: String(data.color ?? ""),
    pinned: data.pinned === true,
    items: readItems(data.items),
    createdAt: readDate(data.createdAt),
    updatedAt: readDate(data.updatedAt),
  };
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

function notePatchPayload(patch: NotePatch) {
  return {
    ...(patch.title !== undefined && { title: patch.title.trim().slice(0, noteLimits.title) }),
    ...(patch.color !== undefined && { color: patch.color }),
    ...(patch.pinned !== undefined && { pinned: patch.pinned }),
    ...(patch.items !== undefined && { items: cleanItems(patch.items) }),
  };
}

/** A reference for a note not saved yet, so the UI can open it right away. */
export function newNoteRef(userId: string) {
  return doc(notesCollection(userId));
}

export async function createNote(
  userId: string,
  title: string,
  items: NoteItem[] = [],
  ref: DocumentReference = newNoteRef(userId),
) {
  await setDoc(ref, {
    title: title.trim().slice(0, noteLimits.title),
    color: "",
    pinned: false,
    items: cleanItems(items),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export function updateNote(userId: string, noteId: string, patch: NotePatch) {
  return updateDoc(doc(notesCollection(userId), noteId), {
    ...notePatchPayload(patch),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Ticks an item off by deleting it. Runs as a transaction against the stored
 * list, so a tick never overwrites edits made elsewhere in the meantime.
 * Resolves with the item and its position, for undo.
 */
export function removeNoteItem(userId: string, noteId: string, itemId: string) {
  const noteRef = doc(notesCollection(userId), noteId);
  return runTransaction(getFirestoreDb(), async (transaction) => {
    const snapshot = await transaction.get(noteRef);
    if (!snapshot.exists()) throw new Error("Ghi chú này không còn tồn tại.");
    const items = readItems(snapshot.data().items);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    transaction.update(noteRef, {
      items: items.filter((item) => item.id !== itemId),
      updatedAt: serverTimestamp(),
    });
    return { item: items[index], index };
  });
}

/** Undo for `removeNoteItem`: puts the item back near where it was. */
export function restoreNoteItem(
  userId: string,
  noteId: string,
  item: NoteItem,
  index: number,
) {
  const noteRef = doc(notesCollection(userId), noteId);
  return runTransaction(getFirestoreDb(), async (transaction) => {
    const snapshot = await transaction.get(noteRef);
    if (!snapshot.exists()) throw new Error("Ghi chú này không còn tồn tại.");
    const items = readItems(snapshot.data().items);
    if (items.some((entry) => entry.id === item.id)) return;
    const next = [...items];
    next.splice(Math.min(index, next.length), 0, item);
    transaction.update(noteRef, {
      items: cleanItems(next),
      updatedAt: serverTimestamp(),
    });
  });
}

export function deleteNote(userId: string, noteId: string) {
  return deleteDoc(doc(notesCollection(userId), noteId));
}

export function subscribeToNotes(
  userId: string,
  onData: (notes: Note[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const notesQuery = query(
    notesCollection(userId),
    orderBy("createdAt", "desc"),
    limit(200),
  );

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => noteFromDocument(documentData(item))));
    },
    onError,
  );
}
