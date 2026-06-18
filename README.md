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
the attendees. This runs in `api/calendar.js` using **one Google account's OAuth refresh
token** — the account that consents becomes the meeting organizer, and Google mints a genuine
`meet.google.com` link and emails the guests. No service-account key and no domain-wide
delegation, so org policies that block service-account keys don't apply. Until the env vars
below are set, the app works normally and agenda cards show a "Generate Meet link" button that
reports it isn't configured yet.

**One-time setup (no admin role needed beyond your own account):**

1. **Google Cloud Console** → create/pick a project → **APIs & Services → Library** → enable
   the **Google Calendar API**.
2. **APIs & Services → OAuth consent screen** → User type **Internal** → fill the app name and
   your support email → save. (Internal = no Google verification needed.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → application type
   **Desktop app** → create. Copy the **Client ID** and **Client secret**.
4. Get a refresh token — run locally, signed in as the meeting organizer:
   ```
   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
   ```
   It opens a consent screen; approve it, and the terminal prints `GOOGLE_REFRESH_TOKEN`.

**Vercel env vars** (Settings → Environment Variables, then redeploy):

- `GOOGLE_CLIENT_ID` — from step 3.
- `GOOGLE_CLIENT_SECRET` — from step 3.
- `GOOGLE_REFRESH_TOKEN` — from step 4.
- *(optional)* `MEET_TIMEZONE` (default `America/New_York`), `MEET_HOUR` (default `10`),
  `MEET_DURATION` minutes (default `60`).

Attendee invites use each team member's **email**, set on the Team page (it degrades to a
Meet link with no guests if emails are missing).

### Meeting notes → action steps

Agendas can pull the **Gemini "Take notes for me"** Doc after a meeting and turn it into
proposed tasks. After the meeting (with Gemini note-taking on), open the agenda and click
**Pull meeting notes** → the server reads the notes Doc attached to the calendar event and
stores it; **Suggest action steps** then sends the notes to Claude, which proposes tasks you
review and create (linked back to the agenda's roadmap items).

Reading the notes Doc needs an extra scope (`documents.readonly`), which the
`scripts/get-google-refresh-token.mjs` helper now requests. **Re-run that script and update
`GOOGLE_REFRESH_TOKEN` in Vercel** so the token includes Docs read access. (If you set this up
before the notes feature, the old token won't have the scope and Pull will report a scope
error.)

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
