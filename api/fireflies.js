// Pulls a meeting transcript from Fireflies.ai for a Gameplan HQ agenda and returns text to drop into the
// agenda's notes (which then feed the "Suggest action steps" extractor). Matches the agenda by date + title.
//
// Required env var (Vercel → Project → Settings → Environment Variables):
//   FIREFLIES_API_KEY – personal key from Fireflies → Integrations → Fireflies API → Get API Key
// Optional:
//   MEET_TIMEZONE – IANA tz used to bucket transcripts by calendar day (default "America/New_York")

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];
const TZ = process.env.MEET_TIMEZONE || "America/New_York";
const FF_API = "https://api.fireflies.ai/graphql";

// YYYY-MM-DD for a ms timestamp, in the configured timezone (en-CA renders ISO-style).
function dayString(ms) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ms)); }
  catch (e) { return new Date(ms).toISOString().slice(0, 10); }
}

async function ffQuery(key, query, variables) {
  const r = await fetch(FF_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query, variables })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.errors) {
    const msg = (data.errors && data.errors[0] && data.errors[0].message) || ("Fireflies API error " + r.status);
    const e = new Error(msg); e.status = r.status; e.detail = data; throw e;
  }
  return data.data;
}

// Token-overlap score between two titles (0..1), case-insensitive — how much of `a` appears in `b`.
function titleScore(a, b) {
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const A = norm(a), B = new Set(norm(b));
  if (!A.length) return 0;
  return A.filter(w => B.has(w)).length / A.length;
}

// Notes text from a transcript: prefer the AI summary (credit-limited on free), else the raw sentences.
function transcriptToText(t) {
  const s = t.summary || {};
  const parts = [];
  if (s.overview) parts.push(String(s.overview).trim());
  if (Array.isArray(s.action_items) && s.action_items.length) parts.push("Action items:\n" + s.action_items.map(x => "• " + x).join("\n"));
  else if (typeof s.action_items === "string" && s.action_items.trim()) parts.push("Action items:\n" + s.action_items.trim());
  if (parts.length) return parts.join("\n\n");
  const sent = t.sentences || [];
  if (sent.length) return sent.map(x => (x.speaker_name ? x.speaker_name + ": " : "") + (x.text || "")).join("\n").trim();
  return "";
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) { res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary", "Origin"); }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.FIREFLIES_API_KEY;
  // GET = diagnostic: reports whether the key is present (boolean only, never the value).
  if (req.method === "GET") return res.status(200).json({ configured: !!key, FIREFLIES_API_KEY: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!key) return res.status(501).json({ error: "Fireflies is not configured on the server.", needsSetup: true });

  const { title = "", date = "" } = req.body || {};
  try {
    // 1) List recent transcripts; narrow to the agenda's day, then rank by title similarity.
    const list = await ffQuery(key,
      "query($limit:Int){ transcripts(limit:$limit){ id title date transcript_url } }", { limit: 50 });
    const all = (list && list.transcripts) || [];
    const sameDay = date ? all.filter(t => dayString(Number(t.date)) === date) : all;
    if (!sameDay.length) {
      return res.status(200).json({ found: false, message: "No Fireflies transcript found for " + (date || "recent meetings") + " yet. Transcripts appear a few minutes after a call ends." });
    }
    const ranked = sameDay.map(t => ({ t, score: titleScore(title, t.title) })).sort((a, b) => b.score - a.score);
    // Ambiguous: several meetings that day and none clearly matches the title — let the user disambiguate.
    if (sameDay.length > 1 && ranked[0].score < 0.5) {
      return res.status(200).json({
        found: false, ambiguous: true,
        candidates: sameDay.map(t => ({ id: t.id, title: t.title })),
        message: sameDay.length + " Fireflies meetings on " + date + " and none clearly matches \"" + title + "\". Rename to match, or pick it manually in Fireflies."
      });
    }
    const best = ranked[0].t;
    // 2) Fetch the chosen transcript's summary + sentences.
    const det = await ffQuery(key,
      "query($id:String!){ transcript(id:$id){ id title transcript_url summary{ overview action_items } sentences{ speaker_name text } } }", { id: best.id });
    const tr = (det && det.transcript) || best;
    const notes = transcriptToText(tr);
    if (!notes) return res.status(200).json({ found: false, message: "Matched \"" + (tr.title || best.title) + "\" but it has no summary or transcript text yet." });
    return res.status(200).json({ found: true, notes, transcriptUrl: tr.transcript_url || best.transcript_url || "", title: tr.title || best.title });
  } catch (e) {
    const auth = e.status === 401 || e.status === 403;
    return res.status(auth ? 401 : 500).json({ error: e.message, detail: e.detail, ...(auth ? { authError: true } : {}) });
  }
}
