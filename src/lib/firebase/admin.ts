import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firestore with admin rights, for server-only jobs. Reads the service account
 * JSON from FIREBASE_SERVICE_ACCOUNT; never import this from client code.
 */
export function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }
  return getFirestore();
}
