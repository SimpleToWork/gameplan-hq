# Password & Authentication Policy

**Policy Number:** SEC-012  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer  
**SOC 2 Criteria:** CC6.1, CC6.2, CC6.6

---

## 1. Purpose

Define minimum requirements for passwords and authentication mechanisms to protect MerchantsBI
systems from unauthorized access.

## 2. Scope

All MerchantsBI user accounts: Google Workspace (primary identity), Vercel, GitHub, GCP Console,
and any other SaaS tools used for work.

## 3. Primary Authentication — Google Workspace / SSO

MerchantsBI uses **Google Workspace as the primary identity provider (IdP)** for company accounts.
Where SSO via Google is available, it is the preferred authentication method. This concentrates
security controls (password policy, MFA, session management) at the Google Workspace level.

- Google Workspace password policy is enforced at the organizational level.
- MFA enforcement is mandatory for all `@merchantsbi.com` accounts (managed via Admin Console).

## 4. Password Requirements

For systems that require a separate password (not federated via Google SSO):

| Requirement | Standard |
|-------------|---------|
| Minimum length | 14 characters |
| Complexity | Upper + lower + digit or symbol |
| Prohibition | Must not be a known breached password (HIBP-style check where available) |
| Reuse | Must not reuse any of the last 12 passwords |
| Rotation | No mandatory periodic rotation unless compromise is suspected |
| Sharing | Passwords must never be shared between users or sent via email/chat |

Passwords for Restricted-access systems must be unique and not reused across services.

## 5. Multi-Factor Authentication (MFA)

MFA is **mandatory** for all accounts. Preference order (most secure → acceptable):

1. **Hardware security key** (FIDO2/WebAuthn, e.g., YubiKey) — required for Owner/Admin roles.
2. **Passkey** (device-bound FIDO2) — strongly recommended.
3. **Authenticator app** (TOTP, e.g., Google Authenticator, Authy, 1Password TOTP).
4. **SMS OTP** — acceptable only where stronger options are unavailable; actively discouraged.

MFA bypass codes / backup codes must be stored securely (e.g., in a password manager) and not
shared.

## 6. Password Manager

All employees are strongly encouraged (and contractors with Restricted access are required) to
use a reputable password manager (1Password, Bitwarden, or equivalent) to generate and store
unique, complex passwords.

## 7. Session Management

- Idle sessions should lock after **15 minutes** on all web applications where configurable.
- Users must log out of shared or public devices when done.
- "Remember me" / persistent sessions on unmanaged devices are discouraged for production tools.
- Google Workspace session length for high-risk operations is set to require re-authentication
  every 24 hours (enforced via Google Admin Console).

## 8. Service Accounts & API Keys

Service account credentials and API keys are **not** passwords but are governed by equivalent
controls:
- Stored only in approved secrets management (Vercel env vars, GCP Secret Manager).
- Rotated at least annually and on suspicion of compromise.
- Access to secrets management systems requires MFA.

Refer to Access Control Policy (SEC-001) for full service-account governance.

## 9. Compromised Credentials

If a password or credential is suspected compromised:
1. **Immediately** rotate the credential and revoke all active sessions.
2. Report to the Security Officer.
3. Review access logs for unauthorized activity since the estimated time of compromise.
4. Escalate to an incident if unauthorized access is confirmed.

## 10. Enforcement

Non-compliance (e.g., sharing passwords, disabling MFA, using weak passwords for Restricted
systems) is subject to disciplinary action per the Acceptable Use Policy.
