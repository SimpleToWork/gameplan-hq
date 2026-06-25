#!/usr/bin/env node
// Deploy Firestore security rules via the Firebase Rules REST API.
// Uses the service-account key at .local/firestore-sa.json — the same one used for
// board data access, but it additionally needs the Firebase Rules Admin IAM role.
//
// One-time IAM setup (run as a GCP owner/admin):
//
//   gcloud projects add-iam-policy-binding gameplan-hq-5995b \
//     --member="serviceAccount:<SA_EMAIL>" \
//     --role="roles/firebaserulesadmin"
//
// Then run:  node scripts/deploy-rules.mjs

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'gameplan-hq-5995b';
const SA_PATH = resolve(__dirname, '../.local/firestore-sa.json');
const RULES_PATH = resolve(__dirname, '../firestore.rules');

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase'
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${sig}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  let sa;
  try {
    sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  } catch {
    console.error('❌  .local/firestore-sa.json not found.');
    console.error('    See README › Firestore rules deployment for setup instructions.');
    process.exit(1);
  }

  const rules = readFileSync(RULES_PATH, 'utf8');
  console.log(`Deploying ${RULES_PATH} → project ${PROJECT} …`);

  const token = await getAccessToken(sa);
  const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Step 1 — create a new ruleset version
  const rsRes = await fetch(`${base}/rulesets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rules }] } })
  });
  const rs = await rsRes.json();
  if (!rs.name) {
    if (rs.error?.status === 'PERMISSION_DENIED') {
      console.error('❌  Permission denied. The service account lacks Firebase Rules Admin.');
      console.error('    Grant it (run as a GCP owner/admin):');
      console.error(`\n    gcloud projects add-iam-policy-binding ${PROJECT} \\`);
      console.error(`      --member="serviceAccount:${sa.client_email}" \\`);
      console.error(`      --role="roles/firebaserulesadmin"\n`);
      console.error('    Then re-run this script.');
    } else {
      console.error('❌  Failed to create ruleset:', JSON.stringify(rs.error ?? rs, null, 2));
    }
    process.exit(1);
  }
  console.log('✓  Ruleset created:', rs.name);

  // Step 2 — point the cloud.firestore release at the new ruleset
  const relRes = await fetch(`${base}/releases/cloud.firestore`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      release: {
        name: `projects/${PROJECT}/releases/cloud.firestore`,
        rulesetName: rs.name
      }
    })
  });
  const rel = await relRes.json();
  if (!rel.rulesetName) {
    console.error('❌  Failed to update release:', JSON.stringify(rel.error ?? rel, null, 2));
    process.exit(1);
  }
  console.log('✓  Release updated. Active ruleset:', rel.rulesetName);
  console.log('   Rules are live.');
}

main().catch(e => { console.error(e); process.exit(1); });
