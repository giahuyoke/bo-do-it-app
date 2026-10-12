import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

export function readDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return value instanceof Date ? value : null;
}

export function documentData(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DocumentData & { id: string } {
  return { id: snapshot.id, ...snapshot.data() };
}
