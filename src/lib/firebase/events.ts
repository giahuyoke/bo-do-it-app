import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
import { deleteLogged, saveLoggedSeries, type LoggedKind } from "@/lib/firebase/logged-writes";
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

function eventKind(userId: string): LoggedKind<ReturnType<typeof eventPayload>> {
  return {
    entity: "event",
    collection: eventsCollection(userId),
    readPayload: (data) => eventPayload(eventFromDocument(data)),
    titleOf: (payload) => payload.title,
    missingMessage: "Sự kiện này không còn tồn tại.",
  };
}

export async function createEvent(userId: string, input: EventInput) {
  const [ref] = await saveLoggedSeries(userId, eventKind(userId), null, [eventPayload(input)]);
  return ref;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  input: EventInput,
) {
  await saveLoggedSeries(userId, eventKind(userId), eventId, [eventPayload(input)]);
}

/** Event twin of `saveTaskSeries`: first input may update, the rest create. */
export async function saveEventSeries(
  userId: string,
  existingId: string | null,
  inputs: EventInput[],
  /** A plan of the other kind this one turns into; deleted in the same commit. */
  replaces?: DocumentReference,
) {
  await saveLoggedSeries(userId, eventKind(userId), existingId, inputs.map((input) => eventPayload(input)), replaces);
}

export function eventRef(userId: string, eventId: string) {
  return doc(eventsCollection(userId), eventId);
}

export function deleteEvent(userId: string, eventId: string) {
  return deleteLogged(userId, eventKind(userId), eventId);
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
