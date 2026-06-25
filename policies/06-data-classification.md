# Data Classification & Handling Policy

**Policy Number:** SEC-006  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer  
**SOC 2 Criteria:** CC6.1, CC6.5, C1.1, C1.2

---

## 1. Purpose

Define how MerchantsBI classifies, handles, retains, and disposes of data to protect sensitive
information and meet contractual and regulatory obligations.

## 2. Scope

All data created, collected, processed, stored, or transmitted by MerchantsBI systems and personnel.

## 3. Data Classification Tiers

### Tier 1 — Restricted
Highly sensitive; disclosure would cause significant legal, financial, or reputational harm.

Examples:
- Customer credentials and authentication tokens.
- API keys, service account private keys (e.g., Firebase SA key, Anthropic API key).
- Personally Identifiable Information (PII) subject to contractual or legal obligations.
- Payment or financial data (if collected in the future).
- SOC 2 audit reports and vulnerability scan results.

Handling requirements:
- Stored only in approved systems (Vercel env vars, GCP Secret Manager, encrypted vault).
- Never transmitted over unencrypted channels.
- Access limited to named individuals with documented business need.
- Rotation: API keys at least annually; credentials on suspicion of compromise.
- Disposal: secure deletion / key revocation; written confirmation for third-party deletion.

### Tier 2 — Confidential
Sensitive business information; disclosure could harm MerchantsBI's competitive position.

Examples:
- Customer task/project data stored in Firestore.
- Employee personal data (name, email, HR records).
- Vendor contracts and pricing.
- Internal roadmaps, financial projections.
- Meeting transcripts (Fireflies).

Handling requirements:
- Stored in access-controlled systems.
- Shared only with employees and contractors with a need to know.
- Not shared externally without authorization.

### Tier 3 — Internal
General business information; not intended for public release but low-risk if disclosed.

Examples:
- Internal documentation, process guides.
- Meeting agendas and non-sensitive notes.
- General code comments and architecture diagrams.

Handling requirements:
- Stored in internal systems; not posted publicly without review.

### Tier 4 — Public
Information approved for unrestricted public distribution.

Examples:
- Marketing materials, the public website.
- Open-source code (if any is designated public).

## 4. Data Handling by System

| System | Tier | Notes |
|--------|------|-------|
| Firestore (`tasks`, `roadmap`, etc.) | Tier 2 | Auth-gated to `@merchantsbi.com` |
| Vercel environment variables | Tier 1 | API keys, secrets; no plaintext copies |
| GitHub repository | Tier 2–3 | No secrets in code; `.gitignore` enforced |
| Firebase Storage | Tier 2 | Auth-gated per `storage.rules` |
| Google Workspace (Drive, Gmail) | Tier 2–3 | Google-enforced encryption |
| Anthropic API (prompt content) | Tier 2 | Review Anthropic's data retention terms |

## 5. Retention & Disposal

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Customer task data (Firestore) | Duration of service + 1 year | Firestore delete + confirmation |
| Audit logs (Vercel, GCP) | 3 years | Automated expiry or manual deletion |
| Employee records | 7 years post-separation | Secure delete per HR policy |
| API keys / secrets | Until rotated | Key revocation; old value purged from env |
| Incident records | 3 years | Archive then delete |
| Contracts / DPAs | 7 years post-expiry | Secure document disposal |

Data past its retention period is deleted or anonymized within **30 days** of the retention
expiry.

## 6. Data Minimization

MerchantsBI collects only the data necessary to deliver its services. Unnecessary PII collection
is prohibited. New data fields in Firestore that may include PII require Security Officer review.

## 7. Data Transfers

- Customer data is not transferred to third parties except as required to deliver the service
  (e.g., Anthropic API for AI features) and only under a signed DPA.
- International data transfers comply with applicable privacy frameworks (e.g., EU SCCs where
  applicable).
