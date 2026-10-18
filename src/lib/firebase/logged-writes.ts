import {
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Transaction,
  type WriteBatch,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { historyWrite, payloadChanged, toSnapshot } from "@/lib/firebase/history";
import type { HistoryEntity } from "@/lib/history";

/** How one collection's documents are read, titled and logged. */
export interface LoggedKind<P extends DocumentData> {
  entity: HistoryEntity;
  collection: CollectionReference;
  /** Reads a stored document into the shape the writer stores, normalizing older ones. */
  readPayload: (data: DocumentData & { id: string }) => P;
  titleOf: (payload: P) => string;
  /** Shown when the document to change or delete is already gone. */
  missingMessage: string;
}

type Write =
  | { op: "set"; ref: DocumentReference; data: DocumentData }
  | { op: "update"; ref: DocumentReference; data: DocumentData }
  | { op: "delete"; ref: DocumentReference };

function applyToBatch(batch: WriteBatch, writes: Write[]) {
  for (const write of writes) {
    if (write.op === "set") batch.set(write.ref, write.data);
    else if (write.op === "update") batch.update(write.ref, write.data);
    else batch.delete(write.ref);
  }
}

function applyToTransaction(transaction: Transaction, writes: Write[]) {
  for (const write of writes) {
    if (write.op === "set") transaction.set(write.ref, write.data);
    else if (write.op === "update") transaction.update(write.ref, write.data);
    else transaction.delete(write.ref);
  }
}

async function readPayload<P extends DocumentData>(
  transaction: Transaction,
  kind: LoggedKind<P>,
  ref: DocumentReference,
) {
  const snapshot = await transaction.get(ref);
  if (!snapshot.exists()) throw new Error(kind.missingMessage);
  return kind.readPayload({ ...snapshot.data(), id: snapshot.id });
}

/**
 * Saves one document per payload, logged in the same commit. The first
 * payload updates `existingId` when given; the rest are created and logged as
 * one entry. `replaces` (a plan of the other kind) is deleted and the save is
 * logged as a conversion. Plain creates use a batch so they still queue
 * offline; anything that must read the old document uses a transaction.
 * Resolves with the created documents, in payload order.
 */
export async function saveLoggedSeries<P extends DocumentData>(
  userId: string,
  kind: LoggedKind<P>,
  existingId: string | null,
  payloads: P[],
  replaces?: DocumentReference,
): Promise<DocumentReference[]> {
  const existingRef = existingId ? doc(kind.collection, existingId) : null;
  const createdPayloads = existingRef ? payloads.slice(1) : payloads;
  const createdRefs = createdPayloads.map(() => doc(kind.collection));

  const writes = (before: P | null, replaced: DocumentData | null): Write[] => {
    const list: Write[] = [];
    if (replaces) list.push({ op: "delete", ref: replaces });
    if (existingRef && before && payloads[0]) {
      const after = payloads[0];
      list.push({ op: "update", ref: existingRef, data: { ...after, updatedAt: serverTimestamp() } });
      if (payloadChanged(before, after)) {
        list.push({
          op: "set",
          ...historyWrite(userId, {
            action: "update",
            entity: kind.entity,
            entityId: existingRef.id,
            title: kind.titleOf(after),
            before,
            after,
          }),
        });
      }
    }
    createdRefs.forEach((ref, index) =>
      list.push({
        op: "set",
        ref,
        data: { ...createdPayloads[index], createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      }),
    );
    if (createdRefs.length) {
      list.push({
        op: "set",
        ...historyWrite(userId, {
          action: replaces ? "convert" : "create",
          entity: kind.entity,
          entityId: createdRefs[0].id,
          title: kind.titleOf(createdPayloads[0]),
          before: replaced ? toSnapshot(replaced) : null,
          after: createdPayloads[0],
          count: createdRefs.length,
        }),
      });
    }
    return list;
  };

  if (!existingRef && !replaces) {
    const batch = writeBatch(getFirestoreDb());
    applyToBatch(batch, writes(null, null));
    await batch.commit();
    return createdRefs;
  }

  await runTransaction(getFirestoreDb(), async (transaction) => {
    const before = existingRef ? await readPayload(transaction, kind, existingRef) : null;
    const replaced = replaces ? await transaction.get(replaces) : null;
    applyToTransaction(transaction, writes(before, replaced?.exists() ? replaced.data() : null));
  });
  return createdRefs;
}

/** Deletes a document and logs its last contents, so it can be restored. */
export function deleteLogged<P extends DocumentData>(
  userId: string,
  kind: LoggedKind<P>,
  id: string,
) {
  const ref = doc(kind.collection, id);
  return runTransaction(getFirestoreDb(), async (transaction) => {
    const before = await readPayload(transaction, kind, ref);
    transaction.delete(ref);
    const entry = historyWrite(userId, {
      action: "delete",
      entity: kind.entity,
      entityId: id,
      title: kind.titleOf(before),
      before,
      after: null,
    });
    transaction.set(entry.ref, entry.data);
  });
}
