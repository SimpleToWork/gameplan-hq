// Transcribes a short audio clip (recorded in the browser with MediaRecorder) to text, for the
// Capture voice-to-text button. Uses Groq's OpenAI-compatible Whisper endpoint — the lowest-cost
// hosted speech-to-text (~$0.02–0.04 per hour of audio) with a free tier.
//
// Required env var (Vercel → Project → Settings → Environment Variables):
//   GROQ_API_KEY        – from console.groq.com (free to create)
// Optional:
//   GROQ_STT_MODEL      – default "whisper-large-v3-turbo" (robust, multilingual, ~$0.04/hr).
//                         Set to "distil-whisper-large-v3-en" for the cheapest English-only (~$0.02/hr).

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

const MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

// pages/api default bodyParser cap is 1 MB — too small for base64 audio clips. 4.5 MB is Vercel's
// hard request-body limit, so this restores the pre-Next effective ceiling.
export const config = { api: { bodyParser: { sizeLimit: "4.5mb" } } };

// Map an audio mime type to a filename extension Groq accepts (it keys off the extension).
function extFor(mime) {
  const m = (mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  return "webm";
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
  // GET = diagnostic: is the key present? (boolean only, never the value)
  if (req.method === "GET") {
    return res.status(200).json({ configured: !!process.env.GROQ_API_KEY, model: MODEL });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(501).json({ error: "Transcription isn't configured on the server (GROQ_API_KEY missing).", needsSetup: true });

  const { audio, mime } = req.body || {};
  if (!audio || typeof audio !== "string") return res.status(400).json({ error: "audio (base64) required" });

  try {
    const buf = Buffer.from(audio, "base64");
    if (!buf.length) return res.status(400).json({ error: "empty audio" });
    // Node 18+ on Vercel provides global FormData/Blob/fetch.
    const form = new FormData();
    form.append("file", new Blob([buf], { type: mime || "audio/webm" }), "audio." + extFor(mime));
    form.append("model", MODEL);
    form.append("response_format", "json");
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` }, // let fetch set the multipart Content-Type/boundary
      body: form
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: (data.error && data.error.message) || data.error || "transcription failed" });
    return res.status(200).json({ text: data.text || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
