import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { historyCutoff } from "@/lib/history";

export const maxDuration = 60;

const batchSize = 500;
// Stop before the platform kills the function; the next run picks up the rest.
const timeBudgetMs = 50_000;

/**
 * Deletes every user's history entries older than the 30-day window. Vercel
 * Cron calls it weekly with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getAdminDb();
  const cutoff = Timestamp.fromDate(historyCutoff(new Date()));
  const oldEntries = db
    .collectionGroup("history")
    .where("at", "<", cutoff)
    .limit(batchSize);

  const startedAt = Date.now();
  let deleted = 0;
  let done = false;
  while (Date.now() - startedAt < timeBudgetMs) {
    const snapshot = await oldEntries.get();
    if (snapshot.empty) {
      done = true;
      break;
    }
    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    deleted += snapshot.size;
  }

  return Response.json({ deleted, done, cutoff: cutoff.toDate().toISOString() });
}
