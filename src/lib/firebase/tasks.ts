import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
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
    transaction.update(taskRef, {
      ...taskPayload({ ...task, completed, status: completed ? "done" : "todo" }),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function createTask(userId: string, input: TaskInput) {
  return addDoc(tasksCollection(userId), {
    ...taskPayload(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateTask(userId: string, taskId: string, input: TaskInput) {
  return updateDoc(doc(tasksCollection(userId), taskId), {
    ...taskPayload(input),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Saves one task per date range in a single batch: the first input updates
 * `existingId` when given, every other input becomes a new task. Turning an
 * event into a task passes the event as `replaces`, so the swap is atomic.
 */
export function saveTaskSeries(
  userId: string,
  existingId: string | null,
  inputs: TaskInput[],
  /** A plan of the other kind this one turns into; deleted in the same batch. */
  replaces?: DocumentReference,
) {
  const batch = writeBatch(getFirestoreDb());
  if (replaces) batch.delete(replaces);
  inputs.forEach((input, index) => {
    if (index === 0 && existingId) {
      batch.update(doc(tasksCollection(userId), existingId), {
        ...taskPayload(input),
        updatedAt: serverTimestamp(),
      });
      return;
    }
    batch.set(doc(tasksCollection(userId)), {
      ...taskPayload(input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return batch.commit();
}

export function taskRef(userId: string, taskId: string) {
  return doc(tasksCollection(userId), taskId);
}

export function deleteTask(userId: string, taskId: string) {
  return deleteDoc(doc(tasksCollection(userId), taskId));
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
