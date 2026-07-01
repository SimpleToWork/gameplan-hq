"use client";
// Live-data layer replacing the legacy DB global + subscribeAll(): one shared onSnapshot listener
// per collection per browser tab, attached lazily on first use and kept alive for the session
// (mirrors legacy's always-on listeners; data volume is workspace-scale). Unchanged docs keep
// their object identity across snapshots (docChanges), so React.memo consumers skip re-rendering —
// this replaces the legacy liveStreamOnly/updateRunPanel in-place-patch machinery entirely.
import { useSyncExternalStore } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { CollectionName, DocBase } from "./types";

type Entry = {
  docs: DocBase[];
  byId: Map<string, DocBase>;
  listeners: Set<() => void>;
  unsub: () => void;
};

const cache = new Map<CollectionName, Entry>();
const EMPTY: DocBase[] = [];

function attach(name: CollectionName): Entry {
  let e = cache.get(name);
  if (e) return e;
  const entry: Entry = { docs: EMPTY, byId: new Map(), listeners: new Set(), unsub: () => {} };
  cache.set(name, entry);
  entry.unsub = onSnapshot(
    collection(db, name),
    (snap) => {
      for (const ch of snap.docChanges()) {
        if (ch.type === "removed") entry.byId.delete(ch.doc.id);
        else entry.byId.set(ch.doc.id, { id: ch.doc.id, ...ch.doc.data() });
      }
      entry.docs = snap.docs.map((d) => entry.byId.get(d.id)!);
      entry.listeners.forEach((fn) => fn());
    },
    (err) => console.error("onSnapshot(" + name + ") failed", err)
  );
  return entry;
}

/** Live array of all docs in a collection. Stable identity per doc across snapshots. */
export function useCol<T extends DocBase>(name: CollectionName): T[] {
  return useSyncExternalStore(
    (cb) => {
      const e = attach(name);
      e.listeners.add(cb);
      return () => {
        e.listeners.delete(cb); // keep-alive: the Firestore listener stays attached
      };
    },
    () => (cache.get(name)?.docs ?? EMPTY) as T[],
    () => EMPTY as T[]
  );
}

/** Live single doc — subscribe run panels etc. to one doc so list views don't re-render per write. */
export function useDoc<T extends DocBase>(name: CollectionName, id: string | null | undefined): T | undefined {
  return useSyncExternalStore(
    (cb) => {
      const e = attach(name);
      e.listeners.add(cb);
      return () => {
        e.listeners.delete(cb);
      };
    },
    () => (id ? (cache.get(name)?.byId.get(id) as T | undefined) : undefined),
    () => undefined
  );
}

/** Non-reactive read of the current cache (for write helpers like setTask). */
export function peek<T extends DocBase>(name: CollectionName): T[] {
  return (cache.get(name)?.docs ?? EMPTY) as T[];
}

/** Header ↻ Sync: tear down and re-attach every live listener without flashing empty UI. */
export function resyncAll(): void {
  const old = new Map(cache);
  cache.clear();
  for (const [name, e] of old) {
    e.unsub();
    const fresh = attach(name);
    fresh.docs = e.docs; // keep current data on screen until the fresh snapshot lands
    fresh.byId = new Map(e.byId);
    for (const l of e.listeners) fresh.listeners.add(l);
    fresh.listeners.forEach((fn) => fn());
  }
}

/** Sign-out: drop all listeners and cached data (rules would reject them anyway). */
export function teardownAll(): void {
  for (const [, e] of cache) {
    e.unsub();
    const listeners = e.listeners;
    e.docs = EMPTY;
    e.byId = new Map();
    listeners.forEach((fn) => fn());
  }
  cache.clear();
}
