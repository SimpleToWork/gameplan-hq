# Incident Response Policy

**Policy Number:** SEC-002  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer  
**SOC 2 Criteria:** CC7.3, CC7.4, CC7.5

---

## 1. Purpose

Establish a repeatable process for detecting, containing, eradicating, recovering from, and learning
from security incidents to minimize harm to MerchantsBI, its customers, and partners.

## 2. Scope

All systems operated by or on behalf of MerchantsBI, including cloud infrastructure (Vercel, GCP/
Firebase), source-code repositories (GitHub), SaaS tools, and employee endpoints.

## 3. Incident Definition

A **security incident** is any event that:
- Results in unauthorized access to, disclosure of, or destruction of MerchantsBI data or systems.
- Threatens the confidentiality, integrity, or availability of production services.
- Constitutes a suspected or confirmed breach of any applicable law or contractual obligation.

Examples: credential compromise, data exfiltration, ransomware, unauthorized Firestore reads,
leaked API keys in public repositories, DDoS affecting merchantsbi-team.com.

## 4. Severity Levels

| Level | Description | Initial Response Target |
|-------|-------------|------------------------|
| P1 – Critical | Production data breach, service outage >30 min, ransomware | 1 hour |
| P2 – High | Suspected credential compromise, partial outage, potential data exposure | 4 hours |
| P3 – Medium | Unsuccessful attack attempt, minor policy violation, single-user issue | 24 hours |
| P4 – Low | Security query, informational alert, near-miss | 5 business days |

## 5. Incident Response Phases

### 5.1 Preparation
- Maintain an up-to-date contact list for the incident response team (IRT).
- Ensure on-call coverage and escalation paths are documented.
- Run tabletop exercises at least annually.

### 5.2 Detection & Reporting
- Any employee who suspects a security incident **must** report it immediately to
  `security@merchantsbi.com` or directly to the Security Officer.
- Vercel, Firebase, and GitHub alert integrations feed into the designated monitoring channel.
- Automated anomaly alerts (Vercel function errors, Firebase auth failures, GitHub secret scanning)
  are triaged within 4 hours.

### 5.3 Containment
- Isolate affected systems (disable compromised accounts, revoke keys, restrict Firestore rules).
- Preserve evidence before remediation (log exports, snapshots, screenshots).
- Notify affected users or customers if data exposure is confirmed or cannot be ruled out.

### 5.4 Eradication
- Identify and remove the root cause (patch vulnerability, rotate credentials, revert malicious
  commits).
- Verify no backdoors or persistent access remain.

### 5.5 Recovery
- Restore services from last known-good state (Vercel redeployment, Firestore point-in-time
  recovery if applicable).
- Monitor closely for 48 hours post-recovery.
- Obtain sign-off from the Security Officer before declaring the incident closed.

### 5.6 Post-Incident Review
- A written post-mortem is completed within **5 business days** for P1/P2 incidents.
- Root cause, timeline, impact, and corrective actions are documented.
- Lessons learned are shared with the team; action items are tracked in Gameplan HQ.

## 6. Communication

- **Internal:** Incident channel in the team communication tool; Security Officer owns updates.
- **External (customers/partners):** CEO and Security Officer jointly approve all external
  communications; initial notification within **72 hours** of confirmed breach affecting customer
  data (required by most data-protection frameworks).
- **Legal/regulatory:** Legal counsel notified immediately for P1 incidents.

## 7. Evidence Retention

Incident records (logs, tickets, post-mortems) are retained for a minimum of **3 years**.

## 8. Testing

The incident response plan is tested at least **annually** via tabletop exercise. Findings are
incorporated into plan updates.
