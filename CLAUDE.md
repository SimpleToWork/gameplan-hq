# Gameplan HQ

A shared team workspace / project board for **merchantsbi.com**. Tasks, roadmap, agendas, an Agents
platform, and calendar/meeting integrations. Live at **merchantsbi-team.com** (also `gameplan-hq.vercel.app`).

## ⚠️ MID-MIGRATION: legacy single-file SPA → Next.js (strangler, tab-by-tab)

The app is being migrated incrementally to **Next.js (App Router) + TypeScript**. Both worlds run in
production at once:

- **Migrated tabs** (Next routes in `app/<tab>/page.tsx`): **none yet** ← update this list at each cutover.
- **Everything else** still lives in the legacy SPA `public/index.html`, served at `/` via the
  `afterFiles` rewrite in `next.config.ts`. Do **not** add `app/page.tsx` until the final cutover.

**Where a change goes — decide FIRST, never do both:**
- Feature/fix on a **migrated** tab → `app/<tab>/` + `lib/` + `components/` (TypeScript, React).
- Feature/fix on an **un-migrated** tab → `public/index.html`, exactly as before.
- **Never** re-implement a migrated tab's feature in `index.html`, and never edit both sides for one change.

**Cutover ritual** (one commit): flip the tab's `migrated: true` in `lib/tabs.ts` **and** add its legacy
page id to `MIGRATED_TABS` in `public/index.html` (Settings' legacy id is `"team"`, route mapped via
`MIGRATED_ROUTE`). The tab's legacy render code is deleted in a **separate cleanup PR** after the
cutover has soaked. Migration branches use the `next/*` prefix (they get Vercel preview deploys).

## Architecture
- **Next.js app** — `app/` (App Router, TypeScript, strict). Shared infra in `lib/`:
  `firebase.ts` (init, same hardcoded public config as legacy), `auth.ts` (`allowed()` domain gate),
  `store.ts` (**`useCol<T>(name)` / `useDoc<T>(name,id)`** — shared onSnapshot listener cache; use these,
  never raw SDK reads), `db.ts` (`fbAdd/fbUpdate/fbSet/fbDelete/setTask` write helpers), `types.ts`
  (collection doc types — harden as tabs port), `tabs.ts` (cutover registry), `identity.ts`,
  `constants.ts`. Shell in `components/` (`AppShell`, `AuthGate`) + `app/providers.tsx`
  (`useAuth`, `useToast` — `toast(msg,"ok"|"err")` replaces the legacy `banner()`).
- **Styling** — `app/globals.css` is the legacy `<style>` block ported verbatim; reuse its class
  vocabulary. The copy inside `public/index.html` is **frozen** — style changes land in globals.css.
- **Legacy SPA** — `public/index.html` (~7k lines vanilla JS, Firebase SDK 10.12 from gstatic CDN).
  When editing it: find the relevant section, edit in place, **match the dense terse style**, reuse its
  helpers (`fbAdd/fbUpdate/fbDelete/setTask`, `banner()`, `identity`), and **syntax-check the embedded
  module script** after editing.
- **Backend** — Vercel functions in **`pages/api/*.js`** (claude, calendar, fireflies, github,
  transcribe, agent-run, deploy, notify). Plain `(req, res)` handlers, CORS via `ALLOWED_ORIGINS`
  allowlist, secrets from env vars (`ANTHROPIC_API_KEY`, `FIREFLIES_API_KEY`,
  `GITHUB_APP_ID/PRIVATE_KEY`, …) — never hardcode.
- **Data** — Cloud Firestore, project **`gameplan-hq-5995b`**. Collections: `tasks`, `roadmap`,
  `agendas`, `areas`, `members`, `domains`, `phases`, `disciplines`, `agents`, `agentRuns`,
  `repoNames`, `featureBranches`, `runnerControl`, `artifacts`. `firestore.rules` is auth-gated:
  read+write only for verified Google accounts on `@merchantsbi.com` (mirrored client-side by `allowed()`).
- **Hosting** — Vercel, framework preset **nextjs** (declared in `vercel.json`). Routing is owned by
  Next; `vercel.json` keeps only the framework field and the `ignoreCommand` (builds on `master` and
  `next/*` branches only).

## Data model notes
- `tasks` statuses: `["Not started","Working on it","Stuck","Done","Archived"]`; priorities:
  `["Critical","High","Medium","Low"]`. A task has `title, category, priority, status, assignees[],
  context, due, roadmapId, notes[], createdBy, trashed`, plus runner fields (`runRequested, runId,
  runStatus, runResult, runProgress, runCostUsd, runBranch, runGit, …`). Typed in `lib/types.ts`.

## Deploy & git — IMPORTANT
- **`master` is production.** Vercel auto-deploys on every push to `master`, so a push goes **live** to
  merchantsbi-team.com. Treat master with care.
- **If you are running under the task runner** (you'll be in a git worktree under a temp dir and the prompt
  will tell you not to touch git): do **NOT** run any git commands — the runner branches, commits, merges,
  and pushes for you. Just make the code changes.
- **Otherwise (interactive work):** when the user asks you to commit, commit **and push directly to
  `master`** (this is a shared repo; that's the agreed flow). Co-author commits with the configured trailer.
  Exception: migration work goes on a `next/*` branch first for a preview deploy, then merges to master.

## Verifying changes
- Next side: `npm run typecheck` and `npm run build` must pass; `npm test` runs vitest (pure logic in
  `lib/`) plus the legacy `node --test` suite. CI (`.github/workflows/ci.yml`) runs all three.
- Legacy side: there's no test suite — syntax-check the embedded script and exercise the real flow
  (the app, a `pages/api/` function, or the board). Don't claim something works without checking it.
