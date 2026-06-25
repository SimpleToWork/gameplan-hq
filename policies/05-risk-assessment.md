# Risk Assessment Policy

**Policy Number:** SEC-005  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer / CEO  
**SOC 2 Criteria:** CC3.1, CC3.2, CC3.3, CC3.4

---

## 1. Purpose

Ensure MerchantsBI systematically identifies, evaluates, and mitigates information security risks
to protect the confidentiality, integrity, and availability of its systems and data.

## 2. Scope

All systems, processes, vendors, and personnel involved in creating, processing, storing, or
transmitting MerchantsBI or customer data.

## 3. Risk Assessment Cadence

| Trigger | Assessment Type |
|---------|----------------|
| Annual (calendar year) | Full enterprise risk assessment |
| New product or major feature launch | Targeted threat model |
| New Critical vendor onboarded | Vendor risk assessment |
| Security incident (P1/P2) | Post-incident risk review |
| Material infrastructure change | Change-scoped risk review |

## 4. Risk Assessment Process

### 4.1 Asset Inventory
Identify in-scope assets: data stores (Firestore collections), services (Vercel functions, APIs),
repositories, endpoints, and third-party integrations.

### 4.2 Threat Identification
For each asset, identify plausible threats (unauthorized access, data exfiltration, service
disruption, supply-chain compromise, insider threat, etc.) using threat-modeling techniques
(e.g., STRIDE).

### 4.3 Vulnerability Identification
- Review known vulnerabilities in dependencies (npm audit, GitHub Dependabot alerts).
- Review Firestore security rules and IAM configurations.
- Review findings from any penetration tests.
- Review open security incidents and near-misses.

### 4.4 Likelihood & Impact Scoring

| Score | Likelihood | Impact |
|-------|-----------|--------|
| 1 | Rare (unlikely in 3 years) | Minimal (no data exposure, trivial disruption) |
| 2 | Unlikely (possible in 3 years) | Minor (limited scope, no customer data) |
| 3 | Possible (could occur annually) | Moderate (limited customer data or outage <4h) |
| 4 | Likely (expected annually) | Significant (customer data breach or extended outage) |
| 5 | Almost certain | Critical (major breach, regulatory action, reputational damage) |

**Risk Score = Likelihood × Impact.** Risks ≥ 12 are Critical; 6–11 High; 3–5 Medium; 1–2 Low.

### 4.5 Risk Treatment
For each identified risk, select a treatment:
- **Mitigate** — implement controls to reduce likelihood or impact.
- **Accept** — document acceptance with business justification (only for Low/Medium risks).
- **Transfer** — shift risk via insurance or contractual controls.
- **Avoid** — discontinue the activity that creates the risk.

Treatment decisions are approved by the Security Officer. Critical risks require CEO approval.

### 4.6 Risk Register
All risks are documented in the Risk Register (maintained in Gameplan HQ / Admin / Compliance)
with: asset, threat, likelihood, impact, score, treatment, owner, due date, status.

## 5. Risk Register Review

- Reviewed and updated at least **annually**.
- Reviewed after any P1/P2 incident.
- Open risk items are tracked as Gameplan HQ tasks with owners and due dates.

## 6. Pen Testing

MerchantsBI will conduct or commission a penetration test of production systems at least
**annually** (aligned with the SOC 2 Type 1 → Type 2 roadmap). Findings are fed into the risk
register and remediated per severity SLAs (Critical: 7 days; High: 30 days; Medium: 90 days).
