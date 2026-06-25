# Access Control Policy

**Policy Number:** SEC-001  
**Version:** 1.0  
**Effective Date:** 2026-06-25  
**Owner:** Security Officer  
**SOC 2 Criteria:** CC6.1, CC6.2, CC6.3, CC6.6, CC6.7

---

## 1. Purpose

This policy establishes requirements for managing logical access to MerchantsBI systems, data, and
infrastructure to protect against unauthorized access, disclosure, or misuse.

## 2. Scope

Applies to all employees, contractors, and third parties who access MerchantsBI systems, including:
- Vercel (hosting and serverless functions)
- Firebase / Google Cloud Platform (Firestore, Auth, Storage)
- GitHub (source code)
- Anthropic API and other AI service integrations
- Internal tools and SaaS applications

## 3. Access Provisioning

### 3.1 Least Privilege
Access rights are granted based on job function and the principle of least privilege. Users receive
only the minimum permissions required to perform their duties.

### 3.2 Authorization
All access requests must be approved by the employee's manager or the Security Officer before
provisioning. Access grants are documented.

### 3.3 Unique Accounts
Every user must have a unique account. Shared accounts are prohibited except for service accounts
with a documented business justification and dedicated credential management.

### 3.4 Application Access
- **Gameplan HQ / Firestore:** Access is restricted to verified Google accounts on the
  `@merchantsbi.com` domain via Firebase Authentication and Firestore security rules.
- **Vercel:** Access limited to team members with a documented role (Owner, Member, Viewer).
- **GitHub:** Access limited to named team members; repository permissions scoped to the role.
- **GCP / Firebase Console:** Access provisioned via Google Workspace IAM, scoped by project role.
- **Anthropic API / third-party keys:** API keys stored only as Vercel environment variables;
  never committed to source code or shared over unencrypted channels.

## 4. Access Reviews

Access rights are reviewed:
- **Quarterly** for privileged/admin accounts.
- **Semi-annually** for all other accounts.
- **Immediately** upon role change or termination.

Reviews are documented and stale or excess access is revoked within 5 business days of discovery.

## 5. Access Revocation

Upon employee termination or departure:
- All accounts (Google Workspace, Vercel, GitHub, GCP, SaaS tools) are disabled or deleted within
  **24 hours** of the effective separation date.
- API keys and tokens the departing user had access to are rotated within **48 hours**.
- The offboarding checklist in the HR system documents each step and the responsible party.

## 6. Privileged Access

Administrative/privileged access (e.g., Vercel Owner, Firebase Project Owner, GitHub Organization
Owner) is:
- Restricted to the minimum number of individuals necessary.
- Protected with phishing-resistant MFA (hardware key or passkey preferred; TOTP acceptable).
- Reviewed quarterly.
- Never used for routine development tasks; a lower-privilege account is used for day-to-day work.

## 7. Multi-Factor Authentication (MFA)

MFA is mandatory for:
- All Google Workspace accounts (enforced at the organizational level).
- Vercel, GitHub, and all other SaaS tools where MFA is available.
- Remote access to any production system.

## 8. Service Accounts & API Keys

- Service accounts are named, documented, and owned by a named human (the "key owner").
- Secrets are stored in Vercel environment variables or a designated secrets manager; never in code.
- Keys are rotated at least annually and immediately upon suspected compromise.
- Service account permissions follow least privilege.

## 9. Enforcement

Violations of this policy may result in disciplinary action up to and including termination and
legal action. Security incidents resulting from access-control failures are handled under the
Incident Response Policy (SEC-002).
