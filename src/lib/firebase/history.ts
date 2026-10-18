import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { readDate } from "@/lib/firebase/document-data";
import {
  diffFields,
  historyCutoff,
  historyExpiry,
  historyTitle,
  type HistoryAction,
  type HistoryEntity,
  type HistoryEntry,
  type HistoryInput,
  type HistorySnapshot,
} from "@/lib/history";

export const historyPageSize = 50;

function historyCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "history");
}

function plainValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, plainValue(entry)]),
    );
  }
  return value;
}

/**
 * A stored document's fields without its bookkeeping timestamps, with nested
 * Timestamps turned into Dates so snapshots compare and format as plain values.
 */
export function toSnapshot(data: DocumentData): HistorySnapshot {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
      .map(([key, value]) => [key, plainValue(value)]),
  );
}

/** True when two payloads differ in a field the history view shows. */
export function payloadChanged(before: DocumentData, after: DocumentData) {
  return diffFields(toSnapshot(before), toSnapshot(after)).length > 0;
}

/**
 * The entry to write alongside a change. Callers `set` it in the same batch or
 * transaction as the change itself, so both land or neither does.
 */
export function historyWrite(
  userId: string,
  input: HistoryInput,
): { ref: DocumentReference; data: DocumentData } {
  return {
    ref: doc(historyCollection(userId)),
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      title: historyTitle(input.title),
      before: input.before,
      after: input.after,
      count: input.count ?? 1,
      at: serverTimestamp(),
      expiresAt: Timestamp.fromDate(historyExpiry(new Date())),
    },
  };
}

function historyFromDocument(snapshot: QueryDocumentSnapshot<DocumentData>): HistoryEntry {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    action: data.action as HistoryAction,
    entity: data.entity as HistoryEntity,
    entityId: String(data.entityId ?? ""),
    title: String(data.title ?? ""),
    before: data.before ? toSnapshot(data.before) : null,
    after: data.after ? toSnapshot(data.after) : null,
    count: typeof data.count === "number" ? data.count : 1,
    at: readDate(data.at) ?? new Date(),
  };
}

export interface HistoryPage {
  entries: HistoryEntry[];
  /** Where the next page starts, or null once everything is loaded. */
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * One page of entries, newest first. TTL can lag by about a day, so entries
 * past the 30-day window are filtered out here rather than trusted to be gone.
 */
export async function fetchHistoryPage(
  userId: string,
  after: QueryDocumentSnapshot<DocumentData> | null = null,
): Promise<HistoryPage> {
  const constraints: QueryConstraint[] = [
    where("at", ">=", Timestamp.fromDate(historyCutoff(new Date()))),
    orderBy("at", "desc"),
    ...(after ? [startAfter(after)] : []),
    limit(historyPageSize),
  ];
  const snapshot = await getDocs(query(historyCollection(userId), ...constraints));
  return {
    entries: snapshot.docs.map(historyFromDocument),
    cursor: snapshot.docs.length === historyPageSize ? snapshot.docs.at(-1) ?? null : null,
  };
}

/** Deletes every entry, 100 at a time (the rules' list limit). */
export async function clearHistory(userId: string) {
  const nextBatch = () => getDocs(query(historyCollection(userId), limit(100)));
  let snapshot = await nextBatch();
  while (!snapshot.empty) {
    const batch = writeBatch(getFirestoreDb());
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    snapshot = await nextBatch();
  }
}
