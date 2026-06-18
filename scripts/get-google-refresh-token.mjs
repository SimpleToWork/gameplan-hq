#!/usr/bin/env node
// One-time helper to obtain a Google OAuth refresh token for the Calendar API.
// Run it on your own machine, signed into the Google account that should own the
// meetings (e.g. ricky@merchantsbi.com).
//
//   node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
//
// It opens a Google consent screen, then prints a refresh token. Paste that token
// into Vercel as GOOGLE_REFRESH_TOKEN (and the same client id/secret as
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
import http from "node:http";
import { exec } from "node:child_process";

const CLIENT_ID = process.argv[2] || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.GOOGLE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Usage: node scripts/get-google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/calendar";
const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent"
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  if (!code) { res.writeHead(400); res.end("Waiting for Google redirect…"); return; }
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: "authorization_code"
      })
    });
    const data = await r.json();
    if (data.refresh_token) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Success — close this tab and return to the terminal.</h2>");
      console.log("\n✅ GOOGLE_REFRESH_TOKEN (paste this into Vercel):\n");
      console.log(data.refresh_token + "\n");
    } else {
      res.writeHead(500); res.end("No refresh token returned — see terminal.");
      console.error("\n❌ No refresh_token in response. Make sure the consent screen is configured and try again.\n", data);
    }
  } catch (e) {
    res.writeHead(500); res.end("Error: " + e.message);
    console.error(e);
  } finally {
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  }
});

server.listen(PORT, () => {
  console.log("\n1) If your browser didn't open, paste this URL into it (signed in as the meeting organizer):\n");
  console.log(authUrl + "\n");
  exec(`xdg-open "${authUrl}" 2>/dev/null || open "${authUrl}" 2>/dev/null`, () => {});
});
