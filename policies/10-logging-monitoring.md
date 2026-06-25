# Logging & Monitoring Policy

**Policy Number:** SEC-010  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Engineering Lead / Security Officer  
**SOC 2 Criteria:** CC7.1, CC7.2, CC7.3

---

## 1. Purpose

Ensure MerchantsBI maintains sufficient logging and monitoring to detect security events,
support incident investigations, and demonstrate compliance.

## 2. Scope

All production systems: Vercel (functions, deployments), Firebase/GCP (Firestore, Auth, Storage,
IAM), GitHub, and employee access to systems containing Confidential or Restricted data.

## 3. Logging Requirements

### 3.1 What Must Be Logged

| Event Category | Examples | System |
|---------------|----------|--------|
| Authentication events | Login success/failure, MFA events | Firebase Auth, Google Workspace |
| Authorization failures | Firestore denied reads/writes, IAM denials | GCP Audit Logs |
| API access | Serverless function invocations, errors, latency | Vercel function logs |
| Configuration changes | Firestore rule changes, Vercel env var changes, IAM changes | GCP Audit Logs, GitHub |
| Security alerts | GitHub secret scanning, Dependabot alerts | GitHub |
| Data access (Restricted) | Service account Firestore reads of sensitive collections | GCP Data Access Logs |

### 3.2 Log Contents
Logs must include, at minimum:
- Timestamp (UTC).
- Actor identity (user ID, service account, IP where available).
- Action performed.
- Resource affected.
- Success or failure outcome.

### 3.3 Log Integrity
- Logs are written to immutable or append-only destinations where possible (GCP Cloud Logging).
- Logs must not be modified or deleted outside of the defined retention window.

## 4. Log Retention

| Log Source | Retention Period |
|-----------|-----------------|
| GCP Audit Logs (Admin Activity) | 400 days (GCP default; automatically retained) |
| GCP Data Access Logs | 30 days (GCP default; increase to 1 year for Restricted data) |
| Vercel function logs | 1 year (configure log drain to external storage if needed) |
| GitHub audit log | 90 days (GitHub Enterprise) / export for longer retention |
| Google Workspace Admin | 6 months (extend via Vault if available) |

All security-relevant logs are retained for a **minimum of 1 year** (3 years for P1 incidents).

## 5. Monitoring & Alerting

### 5.1 Active Monitoring
The following conditions generate alerts reviewed within **4 hours** on business days and
**8 hours** on weekends:
- Unusual volume of Firebase Auth failures (brute-force indicator).
- Firestore rule denials from unexpected sources.
- Vercel function error rates exceeding baseline by >200%.
- GitHub Actions secrets scanning findings.
- New IAM role bindings to production GCP project.
- Vercel production deployment from a non-standard user.

### 5.2 Alert Routing
Alerts are routed to the designated security channel (email or Slack #security-alerts).
The Security Officer or on-call engineer triages all alerts.

### 5.3 Anomaly Detection
MerchantsBI will leverage GCP Security Command Center (standard tier) and GitHub Advanced
Security (secret scanning, Dependabot) for automated anomaly detection.

## 6. Log Review

- Security-relevant logs are reviewed **weekly** by the Security Officer or designee for
  anomalies (authentication patterns, IAM changes, data access spikes).
- Review findings are documented; anomalies are escalated per the Incident Response Policy.

## 7. Log Access Controls

- Log access is restricted to Security Officer and Engineering Lead.
- Log data is treated as Confidential (Tier 2).
- Log deletion requires Security Officer approval and is documented.

## 8. Prohibited Practices

- Logging Restricted data (passwords, API keys, PII) in plaintext in application logs.
- Disabling audit logging on production GCP resources without Security Officer approval.
- Modifying or deleting logs outside the defined retention window.
