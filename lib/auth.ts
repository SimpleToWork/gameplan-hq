import { GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";

// Only Google accounts on this Workspace domain may sign in. firestore.rules enforces the same
// predicate server-side (isTeam()); this client check is UX, not security.
export const ALLOWED_DOMAIN = "merchantsbi.com";

export function allowed(user: User | null): boolean {
  if (!user || !user.email) return false;
  if (!ALLOWED_DOMAIN) return true;
  return user.email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
}

export async function doSignIn(): Promise<void> {
  const provider = new GoogleAuthProvider();
  if (ALLOWED_DOMAIN) provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
  await signInWithPopup(auth, provider);
}

export function doSignOut(): Promise<void> {
  return signOut(auth);
}
