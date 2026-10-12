import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
import type { CalendarEvent, EventInput } from "@/lib/firebase/models";

function eventsCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "events");
}

function eventFromDocument(
  data: ReturnType<typeof documentData>,
): CalendarEvent {
  const startAt = readDate(data.startAt);
  const endAt = readDate(data.endAt);

  if (!startAt) {
    throw new Error(`Sự kiện ${data.id} thiếu thời gian hợp lệ.`);
  }

  return {
    id: data.id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    location: String(data.location ?? ""),
    startAt,
    endAt,
    tagId: typeof data.tagId === "string" ? data.tagId : null,
    tagName: String(data.tagName ?? ""),
    tagColor: String(data.tagColor ?? ""),
    reminderMinutes:
      typeof data.reminderMinutes === "number" ? data.reminderMinutes : null,
    createdAt: readDate(data.createdAt),
    updatedAt: readDate(data.updatedAt),
  };
}

function eventPayload(input: EventInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    location: input.location?.trim() ?? "",
    startAt: Timestamp.fromDate(input.startAt),
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    tagId: input.tagId ?? null,
    tagName: input.tagName?.trim() ?? "",
    tagColor: input.tagColor ?? "",
    reminderMinutes: input.reminderMinutes ?? null,
  };
}

export async function createEvent(userId: string, input: EventInput) {
  return addDoc(eventsCollection(userId), {
    ...eventPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateEvent(
  userId: string,
  eventId: string,
  input: EventInput,
) {
  return updateDoc(doc(eventsCollection(userId), eventId), {
    ...eventPayload(input),
    updatedAt: serverTimestamp(),
  });
}

export function deleteEvent(userId: string, eventId: string) {
  return deleteDoc(doc(eventsCollection(userId), eventId));
}

export function subscribeToEvents(
  userId: string,
  onData: (events: CalendarEvent[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const eventsQuery = query(
    eventsCollection(userId),
    orderBy("startAt", "asc"),
    limit(200),
  );

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      try {
        onData(snapshot.docs.map((item) => eventFromDocument(documentData(item))));
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Dữ liệu không hợp lệ."));
      }
    },
    onError,
  );
}
