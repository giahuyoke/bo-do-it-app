import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { historyWrite } from "@/lib/firebase/history";
import { restoreChecklistItem } from "@/lib/firebase/notes";
import type { HistoryEntry } from "@/lib/history";

const collections = { task: "tasks", event: "events", tag: "tags" } as const;
const alreadyRestored = "Mục này đã được khôi phục.";

/**
 * Puts a deleted item back under its old id, so a tag reconnects with the
 * plans still pointing at it. The rules require a fresh `createdAt`, so the
 * restored item counts as new in creation order.
 */
export async function restoreFromHistory(userId: string, entry: HistoryEntry) {
  const before = entry.before;
  if (entry.action !== "delete" || !before) {
    throw new Error("Mục này không thể khôi phục.");
  }

  if (entry.entity === "noteItem") {
    // Logs its own "restore" entry, like the undo on the notes page.
    const restored = await restoreChecklistItem(
      userId,
      { id: entry.entityId, text: String(before.text ?? entry.title) },
      typeof before.index === "number" ? before.index : 0,
    );
    if (!restored) throw new Error(alreadyRestored);
    return;
  }

  const db = getFirestoreDb();
  const ref = doc(db, "users", userId, collections[entry.entity], entry.entityId);
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(ref)).exists()) throw new Error(alreadyRestored);
    transaction.set(ref, { ...before, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const log = historyWrite(userId, {
      action: "restore",
      entity: entry.entity,
      entityId: entry.entityId,
      title: entry.title,
      before: null,
      after: before,
    });
    transaction.set(log.ref, log.data);
  });
}
