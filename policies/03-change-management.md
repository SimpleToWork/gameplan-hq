# Change Management Policy

**Policy Number:** SEC-003  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Engineering Lead / Security Officer  
**SOC 2 Criteria:** CC8.1

---

## 1. Purpose

Ensure that changes to MerchantsBI production systems are authorized, tested, documented, and
reversible in order to protect system integrity, availability, and confidentiality.

## 2. Scope

All changes to:
- Production source code (`master` branch of `gameplan-hq` and any other production repositories).
- Vercel configuration, environment variables, and deployments.
- Firebase / GCP configuration (Firestore rules, IAM, security rules, Storage rules).
- Infrastructure and serverless function configuration.
- Third-party integrations and API keys.

## 3. Change Categories

| Category | Examples | Approval Required |
|----------|----------|-------------------|
| Standard | Bug fixes, UI updates, non-breaking feature adds | Peer code review (PR) |
| Significant | New external integrations, Firestore rule changes, new API keys | Engineering Lead + Security Officer |
| Emergency | P1/P2 incident hotfixes | Post-hoc review within 24 hours |
| Infrastructure | IAM changes, new Firebase projects, domain changes | Security Officer |

## 4. Change Process

### 4.1 Standard Changes
1. **Branch** — all work happens in a feature branch (never directly on `master`).
2. **Test** — syntax-check and manually verify the change works as intended.
3. **Pull Request** — opened against `master` with a clear description and link to the Gameplan HQ
   task.
4. **Peer Review** — at least one other team member reviews and approves the PR.
5. **Merge** — PR merged to `master`; Vercel auto-deploys to production.

### 4.2 Significant Changes
All steps from 4.1, plus:
- Security Officer reviews and approves before merge.
- Rollback plan documented in the PR description.
- Post-deploy smoke test completed and recorded.

### 4.3 Emergency Changes
- Can bypass standard peer review to restore availability.
- Must be reviewed and retrospectively approved within **24 hours**.
- Documented in the incident ticket with justification.

### 4.4 Infrastructure / IAM Changes
- Require a written change request (Gameplan HQ task) describing the before/after state.
- Security Officer approves before implementation.
- Reviewed as part of the quarterly access review.

## 5. Prohibited Practices

- Committing directly to `master` without review (except documented emergency changes).
- Hardcoding secrets, API keys, or credentials in source code.
- Deploying without a linked task or PR description.
- Disabling Firestore security rules or relaxing IAM without Security Officer sign-off.

## 6. Rollback

- Every significant change must have a documented rollback path.
- Vercel supports instant rollback via the dashboard; this is the primary rollback mechanism for
  front-end and serverless function changes.
- Firestore rule rollbacks require manual redeployment of the previous rule file.
- Configuration rollbacks (Vercel env vars) are handled via the Vercel dashboard version history.

## 7. Audit Trail

- GitHub commit history and pull request records serve as the primary audit trail.
- Vercel deployment history is retained by Vercel for 90 days.
- Significant and infrastructure changes are additionally logged as Gameplan HQ tasks.

## 8. Review

This policy is reviewed annually or after any significant incident attributable to an uncontrolled
change.
