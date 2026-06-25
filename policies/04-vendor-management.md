# Vendor & Third-Party Management Policy

**Policy Number:** SEC-004  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer / CEO  
**SOC 2 Criteria:** CC9.1, CC9.2

---

## 1. Purpose

Ensure that third-party vendors and service providers who access, process, store, or transmit
MerchantsBI data meet acceptable security standards to protect customer and company information.

## 2. Scope

All vendors, cloud service providers, SaaS platforms, contractors, and other third parties that:
- Process or store MerchantsBI or customer data, or
- Have access to production systems or networks.

## 3. Current Critical Vendors

| Vendor | Purpose | Data Processed | SOC 2 / Certifications |
|--------|---------|----------------|------------------------|
| Google Cloud / Firebase | Firestore database, Auth, Storage | Customer task data, user identities | SOC 2 Type 2, ISO 27001 |
| Vercel | Hosting, serverless functions, CI/CD | Request logs, env vars | SOC 2 Type 2 |
| GitHub (Microsoft) | Source code, CI/CD | Source code, secrets (env) | SOC 2 Type 2, ISO 27001 |
| Anthropic | AI API (Claude) | Task/prompt content | SOC 2 Type 2 (in progress) |
| Fireflies.ai | Meeting transcription | Meeting audio/transcripts | SOC 2 Type 2 |
| Google Workspace | Email, identity provider, calendar | Employee data, email | SOC 2 Type 2, ISO 27001 |

## 4. Vendor Onboarding

Before engaging a new vendor that will process MerchantsBI data:

1. **Security Assessment** — Security Officer reviews the vendor's:
   - Available compliance certifications (SOC 2, ISO 27001, etc.).
   - Privacy policy and data processing agreement (DPA).
   - Breach notification commitments.
   - Sub-processor list.
2. **Risk Classification**
   - **Critical:** Processes production data or has system access → requires SOC 2 report or
     equivalent, signed DPA, and annual review.
   - **Standard:** Limited data exposure → security questionnaire sufficient.
   - **Low:** No data access (e.g., project-management tools with no customer data) → basic
     review.
3. **Contractual Controls** — DPA or security addendum executed before vendor goes live.
4. **Approval** — Security Officer (and CEO for Critical vendors) approves in writing.

## 5. Ongoing Vendor Monitoring

- **Annual review** of all Critical vendors: re-check SOC 2 report validity, review security
  advisories, confirm DPA is current.
- **Event-triggered review** for any vendor-reported breach, major product change, or acquisition.
- Vendor security incident notifications are tracked in Gameplan HQ under the Compliance area.

## 6. Vendor Offboarding

When a vendor relationship ends:
- Revoke all access and API credentials within **48 hours**.
- Request data deletion confirmation in writing for Critical vendors.
- Document the offboarding in the vendor register.

## 7. Vendor Register

A vendor register is maintained (currently in the Gameplan HQ board under Admin/Compliance) with:
- Vendor name, category, data processed, contract/DPA status, last review date, owner.

The register is reviewed quarterly.

## 8. Sub-Processors

For vendors that engage sub-processors with access to MerchantsBI data, the sub-processor list is
reviewed at onboarding and upon material changes. Notification of new sub-processors is required
from Critical vendors.
