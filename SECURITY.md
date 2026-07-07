# Security Policy

_Last reviewed: 2026-07-06_

This document describes how Ledge protects user data and handles security incidents. It applies to the production deployment at <https://ledgeflux.com> and the codebase in this repository.

## 1. Security Contact

Report suspected vulnerabilities to **Alex Wang** at <alexswang19@gmail.com>. Do not disclose vulnerabilities publicly before they have been acknowledged and remediated. Expect an initial response within 72 hours.

## 2. Access Control

Ledge is operated by a single developer. All administrative access to production systems is performed through that developer's personal accounts, each protected by TOTP-based two-factor authentication:

- Vercel (hosting + CI)
- GitHub (source control)
- Supabase (managed Postgres)
- Plaid (financial data aggregator)
- Resend (transactional email)
- Upstash (rate-limit datastore)
- Domain registrar (Cloudflare/Namecheap)

There are no shared credentials, no third-party contractors with production access, and no service accounts that can be used outside their intended automation. If the operator's accounts are compromised, see incident response below.

## 3. Authentication and MFA for End Users

- Passwords are hashed with bcrypt (cost factor 10) before storage; the plaintext is never persisted or logged.
- Email-based multi-factor authentication is required on every sign-in. A six-digit verification code is sent via Resend and must be entered within 10 minutes; codes are single-use and a fresh MFA verification is required for each session issuance.
- Sessions are JWTs signed with `AUTH_SECRET` and issued by NextAuth. Rotating `AUTH_SECRET` immediately invalidates every active session.
- Authentication endpoints are rate-limited per IP via Upstash Redis with scoped windows: login 5/60s, verification-code sends 3/60s, verification-code checks 10/60s. Code sends additionally have a 60-second per-user cooldown, and codes are consumed atomically (single-use even under concurrent requests).

## 4. Encryption

- **In transit:** TLS 1.2+ is enforced by Vercel for all inbound HTTPS connections and by Supabase for all Postgres connections. Plaid, Resend, and Upstash communicate over TLS as well.
- **At rest:** Supabase managed Postgres encrypts all data using AES-256. Disk-level encryption is provided by the underlying AWS infrastructure.
- **Application-level:** Passwords are bcrypt-hashed before reaching the database (see §3). Plaid access tokens are encrypted with AES-256-GCM (`src/lib/crypto.ts`) before storage, keyed by `ENCRYPTION_KEY` (32 bytes, base64; generate with `openssl rand -base64 32`). Tokens are decrypted only server-side at the point of use and are never sent to the browser. Existing plaintext rows are migrated with `prisma/encrypt-tokens.ts`.

## 5. Secrets Management

All secrets — `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `RESEND_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `ENCRYPTION_KEY` — are stored exclusively in Vercel's encrypted environment-variable store (Production scope) and, for local development, in a gitignored `.env` file. No secret is committed to source control; `.env` is enumerated in `.gitignore` and a placeholder `.env.example` is used for onboarding.

> **Known exposure (2026-07-06 audit):** an early `.env` containing `DATABASE_URL`, `PLAID_SECRET`, `AUTH_SECRET`, and `RESEND_API_KEY` was committed before `4b6c5dd` ("chore: stop tracking .env") and remains recoverable from git history on the remote. Those values must be treated as exposed and rotated:
> 1. `AUTH_SECRET` — generate a new value (`openssl rand -base64 32`), update in Vercel; all sessions are invalidated.
> 2. `PLAID_SECRET` — rotate via Plaid Dashboard → Team Settings → Keys.
> 3. `DATABASE_URL` / `DIRECT_URL` — reset the database password in Supabase and update both URLs.
> 4. `RESEND_API_KEY` — revoke and re-issue in the Resend dashboard.

Secrets are rotated:
- Immediately on any suspicion of exposure.
- At minimum, annually.
- After any operator-account compromise.

## 6. Incident Response

If a breach or suspected breach is detected, the operator will:

1. **Contain.** Rotate `AUTH_SECRET` (invalidates all active sessions), rotate `PLAID_SECRET` via the Plaid Dashboard, and rotate the Supabase database password.
2. **Investigate.** Audit Supabase query logs, Vercel function logs, and Plaid API logs for the affected time window. Identify the scope and timeline of unauthorized access.
3. **Notify.** Affected users are notified via email within 72 hours of confirmed compromise, in line with common-practice breach-notification timelines (e.g., GDPR Article 33). Plaid is notified per their partner-notification requirements.
4. **Remediate.** Patch the root cause, deploy the fix, and document a postmortem.

## 7. Data Handling and Retention

Data collected and retained:
- Account profile: email, optional name, bcrypt password hash.
- Financial data via Plaid: account metadata, balances, and transaction history.
- Verification codes (10-minute lifetime, single-use, deleted after consumption).

Data **not** stored:
- Bank-login credentials (handled by Plaid, never seen by Ledge).
- Plaintext passwords.
- Payment card data (the application does not process payments).

Users can delete their account at any time from the in-app settings page. Deletion cascades to all linked Plaid items, transactions, budget categories, and verification codes via Prisma `onDelete: Cascade`. There is no third-party data sale; Plaid, Resend, Supabase, and Upstash receive only the data necessary to perform their service.

## 8. Backups

Supabase Pro tier provides managed daily backups and point-in-time recovery (PITR) for the production database. Backup integrity is the responsibility of Supabase; no application-level backup is currently maintained.

## 9. Dependency Management

- Dependencies are tracked in `package.json` with explicit versions captured in `package-lock.json`.
- `npm audit` is run manually before each release; any high or critical CVEs are addressed before deploy.
- Automated dependency scanning (Dependabot or Renovate) is planned but not yet configured.

## 10. Source Code and CI

- Source code lives in a private GitHub repository.
- Pushes to `main` trigger a Vercel deployment which runs `prisma migrate deploy && next build` via the `vercel-build` script. There is no separate CI tier; type-checking and linting are run locally before push.
- Deploys are bound to commits — any production change is traceable to a git revision.

## 11. Out of Scope

This policy does not cover the security of Plaid, Supabase, Vercel, Resend, Upstash, or the user's own devices and email accounts. Refer to those vendors' published security documentation for their controls.
