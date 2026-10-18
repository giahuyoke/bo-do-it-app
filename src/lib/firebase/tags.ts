import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { documentData, readDate } from "@/lib/firebase/document-data";
import { deleteLogged, saveLoggedSeries, type LoggedKind } from "@/lib/firebase/logged-writes";
import type { PlannerTag, PlannerTagInput } from "@/lib/firebase/models";

function tagsCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "tags");
}

function tagFromDocument(data: ReturnType<typeof documentData>): PlannerTag {
  return {
    id: data.id,
    name: String(data.name ?? ""),
    color: String(data.color ?? "#78c6a3"),
    createdAt: readDate(data.createdAt),
    updatedAt: readDate(data.updatedAt),
  };
}

// Items carry their own color now; tags are names only. The rules still
// require a color on each tag document, so new tags get this fixed one.
const storedTagColor = "#78c6a3";

function tagPayload(input: PlannerTagInput) {
  const name = input.name.trim();
  if (!name || name.length > 40) throw new Error("Tên tag cần từ 1 đến 40 ký tự.");
  return { name };
}

// Renaming writes only the name, so `color` is optional on the update side.
function tagKind(userId: string): LoggedKind<{ name: string; color?: string }> {
  return {
    entity: "tag",
    collection: tagsCollection(userId),
    readPayload: (data) => ({
      name: String(data.name ?? ""),
      color: String(data.color ?? storedTagColor),
    }),
    titleOf: (payload) => payload.name,
    missingMessage: "Tag này không còn tồn tại.",
  };
}

export async function createTag(userId: string, input: PlannerTagInput) {
  const [ref] = await saveLoggedSeries(userId, tagKind(userId), null, [
    { ...tagPayload(input), color: storedTagColor },
  ]);
  return ref;
}

export async function updateTag(
  userId: string,
  tagId: string,
  input: PlannerTagInput,
) {
  await saveLoggedSeries(userId, tagKind(userId), tagId, [tagPayload(input)]);
}

export function deleteTag(userId: string, tagId: string) {
  return deleteLogged(userId, tagKind(userId), tagId);
}

export function subscribeToTags(
  userId: string,
  onData: (tags: PlannerTag[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const tagsQuery = query(
    tagsCollection(userId),
    orderBy("createdAt", "asc"),
    limit(100),
  );

  return onSnapshot(
    tagsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => tagFromDocument(documentData(item))));
    },
    onError,
  );
}
