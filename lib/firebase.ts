import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Same hardcoded config as the legacy SPA (public/index.html) — a Firebase web config is public by
// design, and keeping it byte-identical means both apps hit the same project AND share auth
// persistence (same origin + same appId → one sign-in covers legacy and migrated tabs).
const firebaseConfig = {
  apiKey: "AIzaSyB5jEex4BnweP97q2aWS17mgui_1660i6g",
  authDomain: "gameplan-hq-5995b.firebaseapp.com",
  projectId: "gameplan-hq-5995b",
  storageBucket: "gameplan-hq-5995b.firebasestorage.app",
  messagingSenderId: "22122025983",
  appId: "1:22122025983:web:d609d2ded52116771c8dca",
  measurementId: "G-GQ1S8KJE12",
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
