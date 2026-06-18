# Gameplan HQ

Team task-management app for **MerchantsBI**. Single-page vanilla-HTML front end, Firebase
Firestore for shared realtime storage, a Vercel serverless proxy for Claude API calls, and
static hosting on Vercel with a custom domain.

## Architecture

```
Browser (public/index.html)
   │  ├─ Firestore SDK ───────────► Firebase (tasks, roadmap, agendas, areas)
   │  └─ fetch("/api/claude") ────► Vercel function (api/claude.js) ──► Anthropic API
```

- **No build step.** The front end is a single vanilla HTML file — no React, no bundler, no
  client-side npm deps. Keep it that way.
- The API key never reaches the browser. The browser calls the co-located serverless function
  at `/api/claude`, which holds `ANTHROPIC_API_KEY` server-side.
- The "Ask Claude" button on task cards does **not** call the API — it generates a copy-paste
  prompt for claude.ai. Only Capture, Roadmap, and Agenda planning hit the proxy.

## Project structure

```
gameplan-hq/
├── public/index.html   ← the main app
├── api/claude.js       ← serverless Anthropic proxy
├── vercel.json         ← routing config
├── package.json        ← minimal, for Vercel
├── .env.example        ← required env vars
├── .gitignore
└── README.md
```

## Configuration

Two values in the `<script>` at the top of `public/index.html`:

1. `firebaseConfig` — from Firebase console → Project Settings → Your apps → Web app.
2. `AI_ENDPOINT` — set to `"/api/claude"` (relative path; proxy is co-located).

Environment variable (set in Vercel → Settings → Environment Variables):

- `ANTHROPIC_API_KEY` — your Anthropic API key.

## Google Meet / Calendar integration (optional)

Each agenda can auto-create a real Google Calendar event with a Google Meet link and invite
the attendees. This runs in `api/calendar.js` using a **service account with domain-wide
delegation** — the service account impersonates a real Workspace user (the meeting organizer)
so Google mints a genuine `meet.google.com` link and emails the guests. Until the env vars
below are set, the app works normally and agenda cards show a "Generate Meet link" button that
reports it isn't configured yet.

**One-time Google setup (Workspace admin required):**

1. **Google Cloud Console** → create/pick a project → **APIs & Services → Enable APIs** →
   enable the **Google Calendar API**.
2. **IAM & Admin → Service Accounts** → create one → **Keys → Add key → JSON**. Download it.
   Note the service account's `client_email` and its numeric **Unique ID** (client ID).
3. **Admin console** (admin.google.com, super-admin) → **Security → Access and data control →
   API controls → Domain-wide delegation → Add new**. Paste the service account's client ID and
   authorize this scope: `https://www.googleapis.com/auth/calendar`.
4. Pick a real mailbox in the domain to organize the meetings (e.g. `ricky@merchantsbi.com`).

**Vercel env vars** (Settings → Environment Variables):

- `GOOGLE_SA_EMAIL` — the service account address (`…@….iam.gserviceaccount.com`).
- `GOOGLE_SA_PRIVATE_KEY` — the `private_key` value from the JSON key. Paste it whole; the
  literal `\n` sequences are fine (the function unescapes them).
- `GOOGLE_IMPERSONATE_EMAIL` — the organizer mailbox from step 4.
- *(optional)* `MEET_TIMEZONE` (default `America/New_York`), `MEET_HOUR` (default `10`),
  `MEET_DURATION` minutes (default `60`).

Attendee invites use each team member's **email**, set on the Team page (it degrades to a
Meet link with no guests if emails are missing).

## Local data model

- Firestore collections: `tasks`, `roadmap`, `agendas`, `areas`. They auto-create on first
  write — no manual setup.
- Team (hardcoded in the `TEAM` array): Ricky Schweky, Joe Harari, Gabe Lesser, yoni,
  Nathan Mosseri, Harel Baruchi.
- Disciplines: AI, Dev-Ops, Front-End, UI/UX, ETL, Back-End, Sales, Operations, Admin.

## Deploy

1. Push to GitHub (`gameplan-hq`, private).
2. Import the repo in Vercel.
3. Set `ANTHROPIC_API_KEY` in Vercel env vars.
4. Deploy, then add the custom domain under Settings → Domains.

## Post-deploy hardening

- Tighten CORS in `api/claude.js` to the real domain instead of `*`.
- Replace Firestore test-mode rules with authenticated-only rules (test mode expires 30 days
  after creation). See `firestore.rules.example`.
