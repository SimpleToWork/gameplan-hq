// Reads/writes an Agent spec file in a GitHub repo for the Agents section (Phase 2 git sync).
// The agent spec is stored as Markdown with YAML frontmatter: structured fields in the frontmatter,
// the prose (summary, system prompt, inputs, outputs, notes) under fixed "##" headings in the body.
// Authenticates as a GitHub App (no third-party deps — the RS256 JWT is signed with Node's crypto).
//
// Required env vars (Vercel → Project → Settings → Environment Variables):
//   GITHUB_APP_ID          – the App's numeric ID
//   GITHUB_APP_PRIVATE_KEY – the App's PEM private key (paste with real newlines, or with literal "\n")
// The App must be installed on the org/repos with Contents: read & write permission.
//
// POST body:
//   { op:"read",  repoUrl, path }                       → { found, sha, spec, lastCommit }
//   { op:"write", repoUrl, path, spec, message? }        → { sha, commit }
import crypto from "node:crypto";

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

const GH_HEADERS = { "User-Agent": "gameplan-hq", "Accept": "application/vnd.github+json" };

function b64url(buf){ return Buffer.from(buf).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); }

// Build a short-lived (<10 min) RS256 JWT signed with the App private key — the App-level credential.
function appJwt(){
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({ alg:"RS256", typ:"JWT" }));
  const payload = b64url(JSON.stringify({ iat: now-60, exp: now+540, iss: process.env.GITHUB_APP_ID }));
  const data = header+"."+payload;
  const key = (process.env.GITHUB_APP_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  const sig = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return data+"."+b64url(sig);
}

async function ghJson(url, headers, method){
  const r = await fetch(url, { method: method||"GET", headers: { ...GH_HEADERS, ...headers } });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error("GitHub "+r.status+": "+(j.message||JSON.stringify(j)));
  return j;
}

// Exchange the App JWT for a repo-scoped installation token (the credential the Contents API accepts).
async function installToken(owner, repo, jwt){
  const inst = await ghJson(`https://api.github.com/repos/${owner}/${repo}/installation`, { Authorization:`Bearer ${jwt}` });
  const tok  = await ghJson(`https://api.github.com/app/installations/${inst.id}/access_tokens`, { Authorization:`Bearer ${jwt}` }, "POST");
  return tok.token;
}

function parseRepo(url){
  const m = String(url||"").replace(/\.git$/,"").match(/github\.com[/:]([^/]+)\/([^/?#]+)/);
  if(!m) throw new Error("repoUrl must be a github.com repository URL");
  return { owner: m[1], repo: m[2] };
}

const q = s => JSON.stringify(s==null ? "" : String(s));   // JSON string == valid double-quoted YAML scalar

// Spec object → Markdown+frontmatter. Frontmatter holds single-line scalars (+ tools as a JSON/YAML flow array);
// long prose goes in the body under fixed headings so the file reads well in GitHub and round-trips deterministically.
function serializeSpec(s){
  const fm = [
    "name: "+q(s.name), "type: "+q(s.type||"other"), "status: "+q(s.status||"draft"), "model: "+q(s.model||""),
    "repoUrl: "+q(s.repoUrl||""), "repoPath: "+q(s.repoPath||""),
    "createdBy: "+q(s.createdBy||""), "createdAt: "+q(s.createdAt||""), "updatedAt: "+q(s.updatedAt||""),
    "tools: "+JSON.stringify(Array.isArray(s.tools)?s.tools:[])
  ].join("\n");
  const body = [
    "# "+(s.name||"Untitled agent"), "", (s.summary||""),
    "", "## System prompt", "", (s.systemPrompt||""),
    "", "## Inputs", "", (s.inputs||""),
    "", "## Outputs", "", (s.outputs||""),
    "", "## Notes", "", (s.notes||"")
  ].join("\n");
  return "---\n"+fm+"\n---\n\n"+body+"\n";
}

// Markdown+frontmatter → spec object. Frontmatter values are JSON-parsed when they look like JSON (our writer
// always emits JSON-quoted scalars); the body is split on "##" headings back into the prose fields.
function parseSpec(text){
  const fm = {}; let body = text;
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if(m){
    body = m[2];
    m[1].split("\n").forEach(line=>{
      const i = line.indexOf(":"); if(i<0) return;
      const k = line.slice(0,i).trim(); if(!k) return;
      let v = line.slice(i+1).trim();
      if(v.startsWith('"')||v.startsWith("[")||v.startsWith("{")){ try{ v = JSON.parse(v); }catch(e){} }
      fm[k] = v;
    });
  }
  const sec = {}; let cur = "summary", buf = [];
  const flush = () => { sec[cur] = buf.join("\n").trim(); buf = []; };
  body.split("\n").forEach(ln=>{
    const h2 = ln.match(/^##\s+(.*)/);
    if(h2){ flush(); const t = h2[1].trim().toLowerCase(); cur = t==="system prompt" ? "systemPrompt" : t; }
    else if(/^#\s+/.test(ln)){ /* title line — skip */ }
    else buf.push(ln);
  });
  flush();
  return {
    name: fm.name||"", type: fm.type||"other", status: fm.status||"draft", model: fm.model||"",
    repoUrl: fm.repoUrl||"", repoPath: fm.repoPath||"",
    createdBy: fm.createdBy||"", createdAt: fm.createdAt||"", updatedAt: fm.updatedAt||"",
    tools: Array.isArray(fm.tools) ? fm.tools : [],
    summary: sec.summary||"", systemPrompt: sec.systemPrompt||"", inputs: sec.inputs||"", outputs: sec.outputs||"", notes: sec.notes||""
  };
}

export default async function handler(req, res){
  const origin = req.headers.origin;
  if(ALLOWED_ORIGINS.includes(origin)){ res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary","Origin"); }
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({ error:"POST only" });

  if(!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY)
    return res.status(503).json({ error:"GitHub App not configured — set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY" });

  const { op, repoUrl, path, spec, message } = req.body || {};
  if(!path) return res.status(400).json({ error:"path required" });

  try{
    const { owner, repo } = parseRepo(repoUrl);
    const token = await installToken(owner, repo, appJwt());
    const auth = { Authorization:`token ${token}` };
    // Encode each path segment but keep the slashes that separate them.
    const apiPath = String(path).split("/").map(encodeURIComponent).join("/");
    const contents = `https://api.github.com/repos/${owner}/${repo}/contents/${apiPath}`;

    if(op==="read"){
      const r = await fetch(contents, { headers:{ ...GH_HEADERS, ...auth } });
      if(r.status===404) return res.status(200).json({ found:false });
      if(!r.ok) return res.status(r.status).json({ error: await r.text() });
      const j = await r.json();
      const parsed = parseSpec(Buffer.from(j.content||"", "base64").toString("utf8"));
      let lastCommit = null;
      try{
        const cs = await ghJson(`https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`, auth);
        if(cs[0]) lastCommit = { sha: cs[0].sha, date: cs[0].commit.author.date, url: cs[0].html_url };
      }catch(e){ /* commit history is best-effort */ }
      return res.status(200).json({ found:true, sha:j.sha, spec:parsed, lastCommit });
    }

    if(op==="write"){
      if(!spec) return res.status(400).json({ error:"spec required" });
      // Look up the current sha so we update in place; absence (404) means create.
      let sha = null;
      const ex = await fetch(contents, { headers:{ ...GH_HEADERS, ...auth } });
      if(ex.ok) sha = (await ex.json()).sha;
      const body = {
        message: message || `Update agent: ${spec.name||path}`,
        content: Buffer.from(serializeSpec(spec), "utf8").toString("base64")
      };
      if(sha) body.sha = sha;
      const w = await fetch(contents, { method:"PUT", headers:{ ...GH_HEADERS, ...auth, "Content-Type":"application/json" }, body: JSON.stringify(body) });
      if(!w.ok) return res.status(w.status).json({ error: await w.text() });
      const wj = await w.json();
      return res.status(200).json({
        sha: wj.content && wj.content.sha,
        commit: wj.commit && { sha: wj.commit.sha, url: wj.commit.html_url, date: wj.commit.author && wj.commit.author.date }
      });
    }

    return res.status(400).json({ error:"unknown op (expected read|write)" });
  }catch(e){
    return res.status(500).json({ error: e.message });
  }
}
