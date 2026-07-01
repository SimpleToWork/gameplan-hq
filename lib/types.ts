import type { Priority, Status } from "./constants";

// The 14 live collections mirrored by the legacy SPA's subscribeAll().
export const COLLECTIONS = [
  "tasks",
  "roadmap",
  "agendas",
  "areas",
  "members",
  "domains",
  "phases",
  "disciplines",
  "agents",
  "agentRuns",
  "repoNames",
  "featureBranches",
  "runnerControl",
  "artifacts",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

// Every doc read through lib/store.ts carries its Firestore id.
export interface DocBase {
  id: string;
  [key: string]: unknown;
}

// Types are hardened per tab as it ports (per the migration plan) — start skeletal, keep the
// index signature so un-modeled legacy fields stay reachable without `any`.
export interface TaskNote {
  text: string;
  by: string;
  at: string;
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
  by: string;
  at: string;
}

export interface Task extends DocBase {
  title?: string;
  category?: string;
  priority?: Priority;
  status?: Status;
  assignees?: string[];
  context?: string;
  due?: string;
  roadmapId?: string | null;
  notes?: TaskNote[];
  attachments?: Attachment[];
  createdBy?: string;
  createdAt?: string;
  completedAt?: string | null;
  trashed?: boolean;
  // Runner fields (board-as-queue): written by .local/runner.mjs, rendered by the run panel.
  runRequested?: boolean;
  runId?: string;
  runStatus?: string;
  runResult?: string;
  runProgress?: unknown[];
  runCostUsd?: number;
  runBranch?: string;
  runGit?: string;
}

export interface Member extends DocBase {
  name: string;
  color?: string;
  email?: string;
  disciplines?: string[];
}

export interface FeatureBranch extends DocBase {
  name?: string;
  repo?: string;
  status?: string;
}
