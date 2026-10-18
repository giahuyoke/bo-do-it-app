import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseConfig } from "@/lib/firebase/config";

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firestoreDb: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  }

  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  firebaseAuth ??= getAuth(getFirebaseApp());
  return firebaseAuth;
}

function initializeBrowserFirestore(app: FirebaseApp) {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Already initialized: hot reload re-runs this module but keeps the app.
    return getFirestore(app);
  }
}

/**
 * In the browser, Firestore keeps an IndexedDB copy shared by every open tab:
 * listeners paint from it at once, and a listener reopened within 30 minutes
 * is only billed for documents that changed. Without IndexedDB (server
 * render, some private windows) the SDK falls back to its memory cache.
 */
export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    const app = getFirebaseApp();
    firestoreDb =
      typeof window === "undefined"
        ? getFirestore(app)
        : initializeBrowserFirestore(app);
  }
  return firestoreDb;
}
