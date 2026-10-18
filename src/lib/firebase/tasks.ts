import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
import { historyWrite } from "@/lib/firebase/history";
import { deleteLogged, saveLoggedSeries, type LoggedKind } from "@/lib/firebase/logged-writes";
import type { Task, TaskInput } from "@/lib/firebase/models";

function tasksCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "tasks");
}

function taskFromDocument(data: ReturnType<typeof documentData>): Task {
  return {
    id: data.id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    deadline: readDate(data.deadline),
    endAt: readDate(data.endAt),
    priority: data.priority,
    status: data.status,
    tagId: typeof data.tagId === "string" ? data.tagId : null,
    tagName: String(data.tagName ?? ""),
    tagColor: String(data.tagColor ?? ""),
    reminderMinutes:
      typeof data.reminderMinutes === "number" ? data.reminderMinutes : null,
    createdAt: readDate(data.createdAt),
    updatedAt: readDate(data.updatedAt),
  };
}

function taskPayload(input: TaskInput) {
  const startAt = input.deadline ?? null;
  const completed = input.completed ?? input.status === "done";
  return {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    deadline: startAt ? Timestamp.fromDate(startAt) : null,
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    priority: input.priority ?? "medium",
    status: completed ? "done" : (input.status ?? "todo"),
    tagId: input.tagId ?? null,
    tagName: input.tagName?.trim() ?? "",
    tagColor: input.tagColor ?? "",
    reminderMinutes: input.reminderMinutes ?? null,
  };
}

function taskKind(userId: string): LoggedKind<ReturnType<typeof taskPayload>> {
  return {
    entity: "task",
    collection: tasksCollection(userId),
    // Older tasks predate tags, endAt and reminders; normalize them like an update would.
    readPayload: (data) => taskPayload(taskFromDocument(data)),
    titleOf: (payload) => payload.title,
    missingMessage: "Công việc này không còn tồn tại.",
  };
}

export function setTaskCompleted(
  userId: string,
  taskId: string,
  completed: boolean,
) {
  const taskRef = doc(tasksCollection(userId), taskId);
  return runTransaction(getFirestoreDb(), async (transaction) => {
    const snapshot = await transaction.get(taskRef);
    if (!snapshot.exists()) throw new Error("Công việc này không còn tồn tại.");
    const task = taskFromDocument({ ...snapshot.data(), id: snapshot.id });
    // Older tasks predate tags, endAt and reminders. Normalize them on update.
    const payload = taskPayload({ ...task, completed, status: completed ? "done" : "todo" });
    transaction.update(taskRef, { ...payload, updatedAt: serverTimestamp() });
    if ((task.status === "done") !== completed) {
      // `after` carries the task so the history view can show which day it is on.
      const entry = historyWrite(userId, {
        action: completed ? "complete" : "reopen",
        entity: "task",
        entityId: taskId,
        title: task.title,
        before: null,
        after: payload,
      });
      transaction.set(entry.ref, entry.data);
    }
  });
}

export async function createTask(userId: string, input: TaskInput) {
  const [ref] = await saveLoggedSeries(userId, taskKind(userId), null, [taskPayload(input)]);
  return ref;
}

export async function updateTask(userId: string, taskId: string, input: TaskInput) {
  await saveLoggedSeries(userId, taskKind(userId), taskId, [taskPayload(input)]);
}

/**
 * Saves one task per date range in a single commit: the first input updates
 * `existingId` when given, every other input becomes a new task. Turning an
 * event into a task passes the event as `replaces`, so the swap is atomic.
 */
export async function saveTaskSeries(
  userId: string,
  existingId: string | null,
  inputs: TaskInput[],
  /** A plan of the other kind this one turns into; deleted in the same commit. */
  replaces?: DocumentReference,
) {
  await saveLoggedSeries(userId, taskKind(userId), existingId, inputs.map((input) => taskPayload(input)), replaces);
}

export function taskRef(userId: string, taskId: string) {
  return doc(tasksCollection(userId), taskId);
}

export function deleteTask(userId: string, taskId: string) {
  return deleteLogged(userId, taskKind(userId), taskId);
}

export function subscribeToTasks(
  userId: string,
  onData: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const tasksQuery = query(
    tasksCollection(userId),
    orderBy("createdAt", "desc"),
    limit(200),
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => taskFromDocument(documentData(item))));
    },
    onError,
  );
}
