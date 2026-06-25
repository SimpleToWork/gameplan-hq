# Encryption Policy

**Policy Number:** SEC-009  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Engineering Lead / Security Officer  
**SOC 2 Criteria:** CC6.1, CC6.7

---

## 1. Purpose

Establish minimum encryption standards for data in transit and at rest to protect Confidential
and Restricted MerchantsBI data from unauthorized disclosure.

## 2. Scope

All systems, services, and devices that process, store, or transmit MerchantsBI Confidential or
Restricted data.

## 3. Encryption in Transit

### 3.1 Web Traffic
- All HTTP traffic to and from merchantsbi-team.com and merchantsbi.com is served over **TLS 1.2
  or higher** (TLS 1.3 preferred), enforced by Vercel's edge network.
- HTTP → HTTPS redirects are enabled; HSTS headers are set.
- Mixed-content (HTTP resources on HTTPS pages) is prohibited.

### 3.2 API Calls
- All calls to external APIs (Anthropic, Firebase, GitHub, Fireflies) use HTTPS/TLS.
- Certificate validation must not be disabled in code (no `rejectUnauthorized: false` in
  production).

### 3.3 Internal Service Communication
- Firebase SDK and Vercel function outbound calls use TLS by default (SDK-enforced).
- No plaintext HTTP is used between services.

## 4. Encryption at Rest

### 4.1 Cloud Data Stores
- **Firestore:** Data at rest encrypted by Google using AES-256 (Google-managed keys). Confirmed
  default for all Firebase projects.
- **Firebase Storage:** AES-256 encryption at rest, Google-managed.
- **Vercel:** Deployment artifacts and logs encrypted at rest per Vercel's platform controls.
- **GitHub:** Repositories encrypted at rest per GitHub's platform controls.

### 4.2 Employee Devices
- All employee laptops and workstations used for work must have full-disk encryption enabled:
  - macOS: FileVault
  - Windows: BitLocker
  - Linux: LUKS or equivalent
- Enforcement is the employee's responsibility; confirmed during onboarding and annual review.

### 4.3 Secrets & Keys
- API keys, service account credentials, and secrets are stored in Vercel environment variables
  or GCP Secret Manager — never in plaintext files, emails, or chat.
- Local development secrets in `.env` files are git-ignored and never committed.

## 5. Prohibited Practices

- Using deprecated or broken cryptographic algorithms: MD5, SHA-1 (for security), DES, 3DES,
  RC4, SSLv2/v3, TLS 1.0/1.1.
- Storing or transmitting Restricted data in plaintext over any medium.
- Disabling TLS certificate validation in any production code path.
- Hardcoding encryption keys or secrets in source code.

## 6. Key Management

- Encryption keys for Google-managed services (Firestore, Storage) are managed by Google's KMS.
- If customer-managed encryption keys (CMEK) are required in the future, this policy will be
  updated with key rotation, escrow, and access-control requirements.
- API keys (treated as secrets, not encryption keys) are rotated at least annually and on
  suspected compromise per the Access Control Policy.

## 7. Exceptions

Any exception to this policy requires written approval from the Security Officer and must be
documented with a compensating control and expiry date.
