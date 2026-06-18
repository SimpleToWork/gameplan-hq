// Creates / updates / deletes a Google Calendar event (with a Google Meet link)
// for a Gameplan HQ agenda. Uses a Google Cloud service account with domain-wide
// delegation: the service account impersonates a real Workspace user (the meeting
// organizer) so Google mints a genuine meet.google.com link and emails the guests.
//
// Required env vars (set in Vercel → Project → Settings → Environment Variables):
//   GOOGLE_SA_EMAIL          – service-account address (…@….iam.gserviceaccount.com)
//   GOOGLE_SA_PRIVATE_KEY    – the SA private key (PEM). Paste it whole; literal "\n"
//                              sequences are fine, they're unescaped below.
//   GOOGLE_IMPERSONATE_EMAIL – a real Workspace mailbox to organize the meetings,
//                              e.g. ricky@merchantsbi.com
// Optional:
//   MEET_TIMEZONE  – IANA tz for the events (default "America/New_York")
//   MEET_HOUR      – local start hour, 0–23 (default 10)
//   MEET_DURATION  – minutes (default 60)
import crypto from "crypto";

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

const TZ = process.env.MEET_TIMEZONE || "America/New_York";
const START_HOUR = Number(process.env.MEET_HOUR || 10);
const DURATION_MIN = Number(process.env.MEET_DURATION || 60);

const b64url = buf =>
  Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

// Mint a short-lived Google access token via the JWT-bearer (service account) grant.
async function getAccessToken() {
  const email = process.env.GOOGLE_SA_EMAIL;
  const key = (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const sub = process.env.GOOGLE_IMPERSONATE_EMAIL;
  if (!email || !key || !sub) {
    const e = new Error("Google Calendar is not configured on the server.");
    e.code = "NOT_CONFIGURED";
    throw e;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: email,
    sub,                                   // impersonate the organizer (domain-wide delegation)
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(key));
  const assertion = `${header}.${claim}.${sig}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const data = await r.json();
  if (!r.ok) {
    const e = new Error(data.error_description || data.error || "token request failed");
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
