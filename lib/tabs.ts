// Single source of truth for the strangler cutover state on the Next side. The legacy mirror is
// the MIGRATED_TABS array in public/index.html — flip `migrated` here and add the tab id there in
// the SAME commit. AppShell renders migrated tabs as real routes and the rest as legacy jumps.
export interface Tab {
  id: string; // Next route: /<id>
  label: string;
  legacyId: string; // the legacy SPA's page id (note: Settings is "team")
  migrated: boolean;
}

export const TABS: Tab[] = [
  { id: "capture", label: "Capture", legacyId: "capture", migrated: false },
  { id: "tasks", label: "Tasks", legacyId: "tasks", migrated: false },
  { id: "roadmap", label: "Roadmap", legacyId: "roadmap", migrated: false },
  { id: "agendas", label: "Agendas", legacyId: "agendas", migrated: false },
  { id: "agents", label: "Agents", legacyId: "agents", migrated: false },
  { id: "deploy", label: "Deploy", legacyId: "deploy", migrated: false },
  { id: "branches", label: "Branches", legacyId: "branches", migrated: false },
  { id: "artifacts", label: "Artifacts", legacyId: "artifacts", migrated: false },
  { id: "settings", label: "Settings", legacyId: "team", migrated: false },
];
