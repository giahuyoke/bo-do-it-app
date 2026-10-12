import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  // getAuth already persists sessions. Avoid async work before opening the popup
  // so the browser can associate it with the user's click.
  return signInWithPopup(auth, googleProvider);
}

export function signOutCurrentUser(): Promise<void> {
  return signOut(getFirebaseAuth());
}
