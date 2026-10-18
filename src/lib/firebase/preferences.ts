import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { normalizeRecentColors } from "@/lib/recent-colors";

// One small document per user, so recent colors follow the account across devices.
function colorsRef(userId: string) {
  return doc(getFirestoreDb(), "users", userId, "preferences", "colors");
}

export function saveRecentColors(userId: string, recent: string[]) {
  return setDoc(colorsRef(userId), {
    recent: normalizeRecentColors(recent),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToRecentColors(
  userId: string,
  onData: (recent: string[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    colorsRef(userId),
    (snapshot) => onData(normalizeRecentColors(snapshot.data()?.recent)),
    onError,
  );
}
