// Creates / updates / deletes a Google Calendar event (with a Google Meet link)
// for a Gameplan HQ agenda. Uses one Google account's OAuth refresh token — the
// account that consented becomes the meeting organizer, and Google mints a real
// meet.google.com link and emails the guests. No service-account key, no
// domain-wide delegation (so org policies that block SA keys don't apply).
//
// Required env vars (set in Vercel → Project → Settings → Environment Variables):
//   GOOGLE_CLIENT_ID      – OAuth client ID
//   GOOGLE_CLIENT_SECRET  – OAuth client secret
//   GOOGLE_REFRESH_TOKEN  – refresh token from scripts/get-google-refresh-token.mjs
// Optional:
//   MEET_TIMEZONE  – IANA tz for the events (default "America/New_York")
//   MEET_HOUR      – local start hour, 0–23 (default 10)
//   MEET_DURATION  – minutes (default 60)

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

const TZ = process.env.MEET_TIMEZONE || "America/New_York";
const START_HOUR = Number(process.env.MEET_HOUR || 10);
const DURATION_MIN = Number(process.env.MEET_DURATION || 60);

// Trade the long-lived refresh token for a short-lived access token.
async function getAccessToken() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_REFRESH_TOKEN;
  if (!id || !secret || !refresh) {
    const e = new Error("Google Calendar is not configured on the server.");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refresh,
      grant_type: "refresh_token"
    })
  });
  const data = await r.json();
  if (!r.ok) {
    const e = new Error(data.error_description || data.error || "token refresh failed");
    e.detail = data;
    throw e;
  }
  return data.access_token;
}

// Build start/end {dateTime,timeZone} from a YYYY-MM-DD date using the configured tz.
function window(date) {
  const d = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().slice(0, 10);
  const pad = n => String(n).padStart(2, "0");
  const start = `${d}T${pad(START_HOUR)}:00:00`;
  const endH = START_HOUR + Math.floor(DURATION_MIN / 60);
  const endM = DURATION_MIN % 60;
  const end = `${d}T${pad(endH)}:${pad(endM)}:00`;
  return {
    start: { dateTime: start, timeZone: TZ },
    end: { dateTime: end, timeZone: TZ }
  };
}

function meetLinkFrom(ev) {
  if (ev.hangoutLink) return ev.hangoutLink;
  const ep = ((ev.conferenceData || {}).entryPoints || []).find(p => p.entryPointType === "video");
  return ep ? ep.uri : "";
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // GET = diagnostic: reports which env vars are present (booleans only, never values).
  if (req.method === "GET") {
    return res.status(200).json({
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN),
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { action = "create", title, date, description, attendees, eventId } = req.body || {};
  const guests = (Array.isArray(attendees) ? attendees : [])
    .filter(e => typeof e === "string" && e.includes("@"))
    .map(email => ({ email }));

  try {
    const token = await getAccessToken();
    const cal = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    if (action === "delete") {
      if (!eventId) return res.status(400).json({ error: "eventId required" });
      const r = await fetch(`${cal}/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: "DELETE", headers: auth });
      if (!r.ok && r.status !== 410 && r.status !== 404) {
        return res.status(r.status).json({ error: await r.text() });
      }
      return res.status(200).json({ ok: true });
    }

    const { start, end } = window(date);
    const body = {
      summary: title || "Meeting",
      description: description || "",
      start,
      end,
      attendees: guests
    };

    if (action === "update") {
      if (!eventId) return res.status(400).json({ error: "eventId required" });
      const r = await fetch(`${cal}/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: "PATCH", headers: auth, body: JSON.stringify(body)
      });
      const ev = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: ev });
      return res.status(200).json({ meetLink: meetLinkFrom(ev), eventId: ev.id, htmlLink: ev.htmlLink });
    }

    // create — ask Google to attach a fresh Meet conference
    body.conferenceData = {
      createRequest: {
        requestId: `gph-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    };
    const r = await fetch(`${cal}?conferenceDataVersion=1&sendUpdates=all`, {
      method: "POST", headers: auth, body: JSON.stringify(body)
    });
    const ev = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: ev });
    res.status(200).json({ meetLink: meetLinkFrom(ev), eventId: ev.id, htmlLink: ev.htmlLink });
  } catch (e) {
    if (e.code === "NOT_CONFIGURED") {
      return res.status(501).json({ error: e.message, needsSetup: true });
    }
    res.status(500).json({ error: e.message, detail: e.detail });
  }
}
