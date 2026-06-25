# Gameplan HQ

A shared team workspace / project board for **merchantsbi.com**. Tasks, roadmap, agendas, an Agents
platform, and calendar/meeting integrations. Live at **merchantsbi-team.com** (also `gameplan-hq.vercel.app`).

## Architecture (no build step)
- **Frontend** — a single self-contained file: **`public/index.html`** (~380 KB of vanilla HTML/CSS/JS,
  no framework, no bundler). It talks to Firebase directly: **Firebase JS SDK 10.12.0 loaded from the
  gstatic CDN as ES modules** (`firebase-app` / `firebase-firestore` / `firebase-auth`).
- **Backend** — Vercel **serverless functions** in **`api/*.js`** (`claude.js`, `calendar.js`,
  `fireflies.js`, `github.js`, `transcribe.js`, `agent-run.js`). Each is an ESM `export default async
  function handler(req, res)` and enforces CORS via an `ALLOWED_ORIGINS` allowlist. Secrets come from
  env vars (`ANTHROPIC_API_KEY`, `FIREFLIES_API_KEY`, `GITHUB_APP_ID/PRIVATE_KEY`, …) — never hardcode.
- **Data** — Cloud Firestore, project **`gameplan-hq-5995b`**. Collections: `tasks`, `roadmap`,
  `agendas`, `areas`, `members`, `domains`, `phases`, `disciplines`, `agents`, `agentRuns`,
  `runnerControl`. `firestore.rules` is auth-gated: read+write only for verified Google accounts on the
  `@merchantsbi.com` domain (the SPA mirrors this in its `allowed()` gate).
- **Hosting** — Vercel. `vercel.json` rewrites `/api/*` to the functions and everything else to the SPA.

## Working in the SPA (`public/index.html`)
- It's **one big file** — don't reorganize it. To change something, find the relevant section
  (search for the feature/handler), edit in place, and **match the surrounding dense, terse style**
  (short names, semicolon-packed lines, minimal whitespace). Comments are sparse and high-value.
- Firestore access goes through small helpers — reuse them instead of calling the SDK directly:
  `col(name)`, `fbAdd(name,data)`, `fbUpdate(name,id,patch)`, `fbDelete(name,id)`, and the task-specific
  `setTask(id,patch)`. User feedback uses `banner(msg,"ok"|"err")`. The signed-in user is `identity`.
  Live data is via `onSnapshot` listeners (the UI re-renders on every change).
- After editing, **syntax-check** the embedded script — there's no test suite or build to catch errors.

## Data model notes
- `tasks` statuses: `["Not started","Working on it","Stuck","Done","Archived"]`; priorities:
  `["Critical","High","Medium","Low"]`. A task has `title, category, priority, status, assignees[],
  context, due, roadmapId, notes[], createdBy, trashed`, plus runner fields (`runRequested, runId,
  runStatus, runResult, runProgress, runCostUsd, runBranch, runGit, …`).

## Deploy & git — IMPORTANT
- **`master` is production.** Vercel auto-deploys on every push to `master`, so a push goes **live** to
  merchantsbi-team.com. Treat master with care.
- **If you are running under the task runner** (you'll be in a git worktree under a temp dir and the prompt
  will tell you not to touch git): do **NOT** run any git commands — the runner branches, commits, merges,
  and pushes for you. Just make the code changes.
- **Otherwise (interactive work):** when the user asks you to commit, commit **and push directly to
  `master`** (this is a shared repo; that's the agreed flow). Co-author commits with the configured trailer.

## Verifying changes
There's no automated test suite. Verify by reading the affected code and, where practical, exercising the
real flow (the app, an `api/` function, or the board). Don't claim something works without checking it.
