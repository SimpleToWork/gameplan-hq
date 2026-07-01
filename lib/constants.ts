// Shared vocabulary mirrored from the legacy SPA (public/index.html). Values must stay in sync
// with the legacy script until the last tab ports — these are data-model constants, not UI copy.

export const STATUSES = ["Not started", "Working on it", "Stuck", "Done", "Archived"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const HORIZONS = ["Now", "Next", "Later"] as const;

export const ST_COLOR: Record<Status, [string, string]> = {
  "Not started": ["#eeeeec", "#646b78"],
  "Working on it": ["#fdeecf", "#a86a08"],
  Stuck: ["#fcecec", "#a32d2d"],
  Done: ["#e9f7ee", "#1d6b45"],
  Archived: ["#eceef1", "#6a7280"],
};

export const PRI_COLOR: Record<Priority, [string, string]> = {
  Critical: ["#fbe6e6", "#8a2020"],
  High: ["#fcecec", "#a32d2d"],
  Medium: ["#faf0db", "#7a5108"],
  Low: ["#e9f1fb", "#1f5790"],
};

// A task is "open" (shows on the working board) when it's neither Done nor Archived.
export const isTaskOpen = (t: { status?: string }) => t.status !== "Done" && t.status !== "Archived";

// Roster seed — the live roster is the Firestore `members` collection; this only matters for a
// fresh/offline DB and as the email→member fallback mapping (see lib/identity.ts).
export const TEAM = [
  { name: "Ricky Schweky", color: "#7F77DD", email: "ricky@merchantsbi.com" },
  { name: "Joe Harari", color: "#378ADD", email: "joe@merchantsbi.com" },
  { name: "Gabe Lesser", color: "#1D9E75", email: "gabe@merchantsbi.com" },
  { name: "yoni", color: "#BA7517", email: "yoni@merchantsbi.com" },
  { name: "Nathan Mosseri", color: "#D4537E", email: "nathan@merchantsbi.com" },
  { name: "Harel Baruchi", color: "#D85A30", email: "harel@merchantsbi.com" },
] as const;

// App color variants — each app/product gets a distinct accent color (see ThemeProvider).
export const APP_VARIANTS: Record<string, { label: string; color: string; soft: string; logoFilter: string }> = {
  gameplan: { label: "MerchantsBI", color: "#4646c8", soft: "#ecebfb", logoFilter: "grayscale(1) sepia(1) hue-rotate(210deg) saturate(2)" },
  crm: { label: "CRM", color: "#1D9E75", soft: "#e0f5ee", logoFilter: "grayscale(1) sepia(1) hue-rotate(131deg) saturate(2) brightness(.85)" },
  analytics: { label: "Analytics", color: "#C9A227", soft: "#faf0db", logoFilter: "grayscale(1) sepia(1) hue-rotate(13deg) saturate(2) brightness(.95)" },
  portal: { label: "Portal", color: "#D4537E", soft: "#fce8ef", logoFilter: "grayscale(1) sepia(1) hue-rotate(309deg) saturate(1.8)" },
};

export const initials = (n: string | undefined): string => {
  const p = (n || "").trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[1][0] : (n || "?").slice(0, 2)).toUpperCase();
};

export const today = () => new Date().toISOString().slice(0, 10);
export const nowTs = () => new Date().toISOString();
