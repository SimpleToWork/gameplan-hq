"use client";
// Port of the legacy resolveIdentity()/memberByEmail(): bind the signed-in user to a roster
// member's NAME (the key all data uses). If unmatched, fall back to the user's OWN name — never
// another member — and flag it so the shell can warn about attribution.
import { useMemo } from "react";
import type { User } from "firebase/auth";
import { TEAM } from "./constants";
import { useCol } from "./store";
import type { Member } from "./types";

export interface Identity {
  identity: string;
  identityUnknown: boolean;
}

export function resolveIdentity(user: User | null, members: Pick<Member, "name" | "email">[]): Identity {
  if (!user) return { identity: TEAM[0].name, identityUnknown: false };
  const roster = members.length ? members : TEAM;
  const e = (user.email || "").toLowerCase();
  const m =
    roster.find((x) => x.email && x.email.toLowerCase() === e) ||
    TEAM.find((x) => x.email && x.email.toLowerCase() === e);
  if (m) return { identity: m.name, identityUnknown: false };
  return { identity: user.displayName || user.email || "You", identityUnknown: true };
}

export function useIdentity(user: User | null): Identity {
  const members = useCol<Member>("members");
  return useMemo(() => resolveIdentity(user, members), [user, members]);
}
