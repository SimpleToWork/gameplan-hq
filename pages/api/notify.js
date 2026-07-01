// Proxy ntfy.sh push notifications so the board can alert the user's phone when a runner task completes.
// Topic names are validated here; no auth token required for public ntfy.sh topics.
const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

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

  const { topic, title, message, priority } = req.body || {};
  if (!topic || typeof topic !== "string" || !/^[\w-]{1,64}$/.test(topic)) {
    return res.status(400).json({ error: "Invalid topic — must be 1–64 alphanumeric/hyphen characters" });
  }

  try {
    const r = await fetch("https://ntfy.sh/" + topic, {
      method: "POST",
      headers: {
        "Title": String(title || "Gameplan HQ").slice(0, 250),
        "Priority": ["min","low","default","high","max"].includes(priority) ? priority : "default",
        "Content-Type": "text/plain",
      },
      body: String(message || "Runner task complete").slice(0, 4096),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return res.status(502).json({ error: "ntfy.sh returned " + r.status + (body ? ": " + body.slice(0, 200) : "") });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
