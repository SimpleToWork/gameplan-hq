// Deployment status API — fetches Vercel project/deployment data and GitHub CI status.
// Vercel: uses VERCEL_TOKEN (Bearer) to call the Vercel REST API.
// GitHub: reuses GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY (existing App JWT) for workflow runs.
//
// POST body:
//   { op:"projects" }                              → { projects:[{id,name,framework,url,link,latestDeployments}] }
//   { op:"deployments", projectId, limit? }        → { deployments:[{...}] }
//   { op:"githubRuns", owner, repo, limit? }       → { runs:[{...}] }
import crypto from "node:crypto";

const ALLOWED_ORIGINS = [
  "https://www.merchantsbi-team.com",
  "https://merchantsbi-team.com",
  "https://gameplan-hq.vercel.app"
];

/* ---- Vercel helpers ---- */
async function vFetch(path, token){
  const r = await fetch("https://api.vercel.com"+path, {
    headers:{ Authorization:"Bearer "+token, "Content-Type":"application/json" }
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error("Vercel "+r.status+": "+(j.error&&j.error.message||JSON.stringify(j)));
  return j;
}

/* ---- GitHub App helpers (mirrors github.js) ---- */
function b64url(buf){ return Buffer.from(buf).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); }
function appJwt(){
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({ alg:"RS256", typ:"JWT" }));
  const payload = b64url(JSON.stringify({ iat:now-60, exp:now+540, iss:process.env.GITHUB_APP_ID }));
  const data = header+"."+payload;
  const key = (process.env.GITHUB_APP_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  const sig = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return data+"."+b64url(sig);
}
async function ghJson(url, headers){
  const r = await fetch(url, { headers:{ "User-Agent":"gameplan-hq","Accept":"application/vnd.github+json",...headers } });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error("GitHub "+r.status+": "+(j.message||JSON.stringify(j)));
  return j;
}
async function installToken(owner, repo){
  const jwt = appJwt();
  const inst = await ghJson(`https://api.github.com/repos/${owner}/${repo}/installation`, { Authorization:"Bearer "+jwt });
  const tok  = await ghJson(`https://api.github.com/app/installations/${inst.id}/access_tokens`, { Authorization:"Bearer "+jwt });
  return tok.token;
}

export default async function handler(req, res){
  const origin = req.headers.origin;
  if(ALLOWED_ORIGINS.includes(origin)){ res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Vary","Origin"); }
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({ error:"POST only" });

  const { op, projectId, limit, owner, repo } = req.body || {};

  try{
    /* ── Vercel: list all projects + their latest deployments ── */
    if(op==="projects"){
      const token = process.env.VERCEL_TOKEN;
      if(!token) return res.status(503).json({ error:"VERCEL_TOKEN not set" });

      // Paginate through all projects (up to 100; most teams have <20)
      let allProjects = [], cursor = null;
      do {
        const url = "/v9/projects?limit=100"+(cursor?"&until="+cursor:"");
        const data = await vFetch(url, token);
        allProjects = allProjects.concat(data.projects||[]);
        cursor = data.pagination && data.pagination.next ? data.pagination.next : null;
      } while(cursor && allProjects.length < 200);

      // For each project grab up to 5 latest deployments (any target)
      const projects = await Promise.all(allProjects.map(async p => {
        let deployments = [];
        try {
          const d = await vFetch(`/v6/deployments?projectId=${p.id}&limit=5&teamId=${p.accountId||""}`, token);
          deployments = (d.deployments||[]).map(dep=>({
            uid: dep.uid,
            url: dep.url ? "https://"+dep.url : null,
            state: dep.state,          // READY | ERROR | BUILDING | QUEUED | CANCELED
            target: dep.target||"preview",  // production | preview
            branch: dep.meta&&dep.meta.githubCommitRef || dep.gitBranch || null,
            sha: dep.meta&&dep.meta.githubCommitSha ? dep.meta.githubCommitSha.slice(0,7) : null,
            commitMsg: dep.meta&&dep.meta.githubCommitMessage || null,
            creator: dep.creator&&dep.creator.username || null,
            createdAt: dep.createdAt,
            readyAt: dep.readyAt||null,
            inspectUrl: dep.inspectUrl||null
          }));
        } catch(_){}
        // Resolve GitHub link
        const ghLink = p.link && p.link.type==="github" ? p.link : null;
        return {
          id: p.id,
          name: p.name,
          framework: p.framework||null,
          accountId: p.accountId||null,
          alias: p.alias&&p.alias[0] ? "https://"+p.alias[0].domain : null,
          github: ghLink ? { owner: ghLink.org||ghLink.repoOwner, repo: ghLink.repo, branch: ghLink.productionBranch||"main" } : null,
          deployments
        };
      }));

      return res.status(200).json({ projects });
    }

    /* ── Vercel: deployments for one project ── */
    if(op==="deployments"){
      const token = process.env.VERCEL_TOKEN;
      if(!token) return res.status(503).json({ error:"VERCEL_TOKEN not set" });
      if(!projectId) return res.status(400).json({ error:"projectId required" });
      const n = Math.min(parseInt(limit)||10, 50);
      const data = await vFetch(`/v6/deployments?projectId=${projectId}&limit=${n}`, token);
      const deployments = (data.deployments||[]).map(dep=>({
        uid: dep.uid,
        url: dep.url ? "https://"+dep.url : null,
        state: dep.state,
        target: dep.target||"preview",
        branch: dep.meta&&dep.meta.githubCommitRef || dep.gitBranch || null,
        sha: dep.meta&&dep.meta.githubCommitSha ? dep.meta.githubCommitSha.slice(0,7) : null,
        commitMsg: dep.meta&&dep.meta.githubCommitMessage || null,
        creator: dep.creator&&dep.creator.username || null,
        createdAt: dep.createdAt,
        readyAt: dep.readyAt||null,
        inspectUrl: dep.inspectUrl||null
      }));
      return res.status(200).json({ deployments });
    }

    /* ── GitHub: recent workflow runs for a repo ── */
    if(op==="githubRuns"){
      if(!process.env.GITHUB_APP_ID||!process.env.GITHUB_APP_PRIVATE_KEY)
        return res.status(503).json({ error:"GitHub App not configured" });
      if(!owner||!repo) return res.status(400).json({ error:"owner and repo required" });
      const n = Math.min(parseInt(limit)||10, 50);
      const token = await installToken(owner, repo);
      const data = await ghJson(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${n}`,
        { Authorization:"token "+token }
      );
      const runs = (data.workflow_runs||[]).map(r=>({
        id: r.id,
        name: r.name,
        workflow: r.path ? r.path.replace(".github/workflows/","") : null,
        status: r.status,       // queued | in_progress | completed
        conclusion: r.conclusion, // success | failure | cancelled | skipped | null
        branch: r.head_branch,
        sha: r.head_sha ? r.head_sha.slice(0,7) : null,
        commitMsg: r.head_commit&&r.head_commit.message ? r.head_commit.message.split("\n")[0] : null,
        url: r.html_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
      return res.status(200).json({ runs });
    }

    return res.status(400).json({ error:"unknown op (expected projects|deployments|githubRuns)" });
  } catch(e){
    return res.status(500).json({ error: e.message });
  }
}
