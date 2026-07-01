// Thin write helpers with the exact shape of the legacy fbAdd/fbUpdate/fbSet/fbDelete/setTask.
// Unlike the legacy versions these THROW instead of calling banner() — call sites toast on error.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
import { peek } from "./store";
import { nowTs } from "./constants";
import type { CollectionName, DocBase, Task } from "./types";

export async function fbAdd(name: CollectionName, data: WithFieldValue<Record<string, unknown>>): Promise<string> {
  return (await addDoc(collection(db, name), data)).id;
}

export async function fbUpdate(name: CollectionName, id: string, patch: UpdateData<Record<string, unknown>>): Promise<void> {
  await updateDoc(doc(db, name, id), patch);
}

export async function fbSet(name: CollectionName, id: string, data: WithFieldValue<Record<string, unknown>>, merge?: boolean): Promise<void> {
  await setDoc(doc(db, name, id), data, merge ? { merge: true } : {});
}

export async function fbDelete(name: CollectionName, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id));
}

// Mirrors legacy setTask(): stamp completedAt when a task first becomes Done (preserve the
// original time on re-saves); clear it when leaving Done.
export async function setTask(id: string, patch: Partial<Task> & Record<string, unknown>): Promise<void> {
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    if (patch.status === "Done") {
      const cur = peek<DocBase & { status?: string; completedAt?: string | null }>("tasks").find((t) => t.id === id);
      if (!cur || cur.status !== "Done" || !cur.completedAt) patch = { completedAt: nowTs(), ...patch };
    } else {
      patch = { completedAt: null, ...patch };
    }
  }
  await fbUpdate("tasks", id, patch as UpdateData<Record<string, unknown>>);
}
