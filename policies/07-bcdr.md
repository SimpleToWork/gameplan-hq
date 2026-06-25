# Business Continuity & Disaster Recovery Policy

**Policy Number:** SEC-007  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Engineering Lead / Security Officer  
**SOC 2 Criteria:** A1.1, A1.2, A1.3

---

## 1. Purpose

Ensure MerchantsBI can sustain critical business operations and recover production services
following a disruptive event (infrastructure failure, data loss, cyberattack, natural disaster).

## 2. Scope

Production systems: Gameplan HQ SPA (merchantsbi-team.com), Vercel serverless functions, Firebase
Firestore/Auth/Storage, GitHub source code.

## 3. Recovery Objectives

| Service | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---------|-------------------------------|-------------------------------|
| Gameplan HQ web app | 2 hours | 0 (stateless; redeploy from git) |
| Vercel serverless functions | 2 hours | 0 (stateless; redeploy from git) |
| Firestore data | 4 hours | 1 hour (continuous backup) |
| Source code (GitHub) | 4 hours | Last commit (mirrors kept) |

## 4. Backup Strategy

### 4.1 Firestore
- Google Cloud Firestore **daily managed exports** to a GCS bucket are enabled for the
  `gameplan-hq-5995b` project.
- Exports are retained for **30 days**.
- Firestore also supports point-in-time recovery (PITR) for the most recent 7 days; this is
  confirmed enabled.
- Backup restore is tested at least **semi-annually** (simulated data-loss drill).

### 4.2 Source Code
- The `gameplan-hq` repository is hosted on GitHub (primary) with at least one developer
  maintaining a local clone (secondary).
- GitHub provides repository-level backups and version history; MerchantsBI may additionally
  use GitHub's Archive Program or third-party backup tools.

### 4.3 Configuration
- Vercel project configuration (environment variables) is documented in `.env.example` and
  Vercel's dashboard history.
- Firebase/GCP project configuration is captured in `firebase.json`, `firestore.rules`, and
  `storage.rules` in version control.

## 5. Disaster Recovery Procedures

### 5.1 Web App / Functions Outage
1. Diagnose via Vercel dashboard and status page.
2. If a bad deployment, roll back via Vercel's instant rollback feature.
3. If Vercel platform outage, monitor Vercel status page; no alternative hosting is pre-provisioned
   (acceptable given Vercel's SLA).
4. Communicate status to users via email or status page.

### 5.2 Firestore Outage / Data Loss
1. Assess scope: distinguish GCP outage (wait for Google) from accidental deletion.
2. For accidental deletion: use PITR to restore to the last known-good point.
3. For export restore: import the most recent daily export into a new or restored project.
4. Validate data integrity before re-opening access.
5. Document the event and corrective actions.

### 5.3 GitHub Unavailability
1. Developers use their local clones; no new deployments until GitHub restores.
2. Emergency changes can be applied directly via Vercel CLI from a local clone.

## 6. Business Continuity

During an extended outage:
- Users are notified via email (Google Workspace) with a status update and expected resolution.
- Critical workflows (e.g., roadmap, task tracking) may fall back to Google Sheets / Docs
  temporarily.
- The Security Officer or designee provides updates at least every 2 hours during P1 outages.

## 7. Testing & Drills

| Test | Frequency |
|------|-----------|
| Firestore restore drill | Semi-annually |
| Vercel rollback drill | Annually |
| Tabletop BC exercise | Annually (combined with IR tabletop) |

Test results are documented and gaps addressed within 30 days.

## 8. Plan Maintenance

This plan is reviewed and updated annually, after any declared disaster or significant
infrastructure change, and when RTO/RPO targets change.
