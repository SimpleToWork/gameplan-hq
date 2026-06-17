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
