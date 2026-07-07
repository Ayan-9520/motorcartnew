# Phase S1 — Production Readiness Security Audit

**Date:** 2026-06-04  
**Scope:** Full backend (`backend/`) + frontend (`frontend/`) review  
**Type:** Audit only — no code changes  
**Reviewer:** Automated architecture review against OWASP-aligned checklist

---

## Executive summary

MotorCart has a **solid auth foundation** (bcrypt, refresh token hashing, rotation, Zod on key auth routes, business pending-approval gates on Growth and `/api/db/*`). However, **production readiness is blocked** by architectural risks centered on **`/api/db/query` generic CRUD**, **open role escalation on registration**, and **missing platform controls** (rate limiting, security headers, upload hardening, audit logging).

| Area | Production-ready? |
|------|-------------------|
| Authentication (core) | Partial |
| Authorization / RBAC | **No** (server-side) |
| JWT lifecycle | Partial |
| Rate limiting | **No** |
| Input validation | Partial |
| File uploads | **No** |
| Prisma / data access | **High risk** |
| API security | **No** |
| Environment / secrets | Partial |
| Audit logging | **No** |

**Recommended gate:** Do not expose to public internet until **P0** items below are resolved.

---

## 1. Authentication

### What works

- Email/password login with **bcrypt** (12 rounds) (`lib/auth/password.ts`).
- **Zod** validation on login/register (`min(6)` password).
- **Refresh tokens** stored as SHA-256 hash; rotation on refresh (`auth/refresh/route.ts`).
- Suspended/closed accounts blocked at login.
- OAuth Google creates users as **`customer` only** (`auth/oauth/callback/route.ts`).
- `/api/auth/me` loads user from **database** by `sub` (not JWT-only profile).

### Issues

| Severity | Issue |
|----------|--------|
| **Critical** | **Self-service role escalation:** `POST /api/auth/register` accepts `role` from body including `admin`, `super_admin`, `bank_nbfc`, `finance_manager`. Non-business signup → `status: active` + tokens. Attacker obtains platform-admin JWT. |
| **Critical** | **JWT role trusted server-wide:** Most routes use `getAuthUser()` → JWT `role` without re-reading DB. Escalated role persists until token expiry. |
| **Medium** | Non-production **auto email verify** on login (`NODE_ENV !== "production"`). |
| **Medium** | Register allows **`MAILER_AUTOCONFIRM`** to skip verification in any env. |
| **Medium** | Password policy weak (**6 chars** min). |
| **Low** | OTP send has **no auth**, **no rate limit**; codes logged to console (`auth/otp/send/route.ts`). |

---

## 2. Authorization & RBAC

### What works

- **Frontend:** `ProtectedRoute` — role list, pending approval, workspace path guard.
- **Dedicated admin routes:** `requirePlatformAdmin()` on many `/api/admin/*` paths.
- **Growth:** `requireGrowthAuth`, workspace header, owner check, pending business block.
- **Account access:** `isPendingBusinessAccess` limits `/api/db/query` and RPC for pending dealers.
- **Finance RPC:** `advance_finance_application` checks reviewer roles in DB.
- **Billing / ecosystem flags:** 404 when disabled (defense in depth).

### Issues

| Severity | Issue |
|----------|--------|
| **Critical** | **`/api/db/query`:** Any authenticated user (non-pending) can **select/insert/update/delete** on **~100 mapped tables** including `users`, `platform_fraud_alerts`, `bank_integration_configs`, `finance_applications`, `dealers`, etc. No per-table or per-row RBAC. |
| **Critical** | **`delete` + `deleteMany`:** Empty or broad filters → mass delete risk on tables exposed to delegate. |
| **Critical** | **`GET /api/leads`:** Authenticated user without `dealer_id` param receives **all leads** (up to 100). |
| **High** | **RPC `finalize_auction`:** Any authenticated user can end any auction. |
| **High** | **RPC `update_finance_verification`:** Auth only — no lender/admin role check. |
| **High** | **RPC community notify handlers:** Some paths allow **unauthenticated** invoke (`community_notify_*`). |
| **Medium** | **`requirePlatformAdmin`** uses JWT role, not DB — stale or forged role if register bug exploited. |
| **Medium** | **Frontend RBAC is not security** — all enforcement must be server-side on every path. |
| **Low** | Pending users can **`update` on `users`** table via db/query without strict filter enforcement in `isPendingBusinessDbAllowed`. |

---

## 3. JWT

| Item | Status |
|------|--------|
| Access / refresh secrets | Env vars with **dev defaults** in `jwt.ts` if unset |
| `loadEnv()` Zod schema | Defined in `config/env.ts` but **not invoked at boot** |
| Access TTL | Configurable (`15m` default) |
| Refresh TTL | 7d; hashed storage |
| Algorithm | HS256 (jsonwebtoken default) — OK if secrets strong |
| Revocation | Refresh row deleted on rotation; no global access denylist |

| Severity | Issue |
|----------|--------|
| **Critical** | Production deploy without `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → **known dev secrets**. |
| **Medium** | No **issuer/audience** claims; no key rotation story. |
| **Low** | Access token cannot be revoked before expiry (stolen token window). |

---

## 4. Rate limiting

| Location | Status |
|----------|--------|
| `express-rate-limit` in `package.json` | **Not wired** in `server.ts` |
| Auth endpoints | None |
| OTP send | None |
| Public lead POST `/api/leads` | None |
| Public `db/query` lead insert | None |
| AI agents (frontend) | Client-side only (`ai/utils/rate-limit.ts`) |

| Severity | Issue |
|----------|--------|
| **High** | Brute-force login, OTP flood, lead spam, db/query abuse — all unthrottled. |

---

## 5. Validation

| Area | Status |
|------|--------|
| Auth login/register | Zod |
| Admin user patch, finance status | Zod |
| Most other API routes | Ad-hoc or `Record<string, unknown>` |
| `db/query` filters/body | **JSON.parse** without size/schema limits |
| `db/query` limit | **No server max** on `take` (client-controlled) |

| Severity | Issue |
|----------|--------|
| **Medium** | Unvalidated payloads on leads, upload metadata, many growth/community routes. |
| **Medium** | Malformed `filters` JSON → 500; oversized body → DoS risk. |

---

## 6. File uploads

| Item | Status |
|------|--------|
| Auth required | Yes (`POST /api/upload`) |
| Path traversal | Partial — `..` stripped in path |
| MIME / extension allowlist | **None** |
| Max file size | **None** |
| Bucket / path | **Client-controlled** (`bucket`, `path` form fields) |
| Static serve `/uploads/*` | **No authentication** in `server.ts` — anyone with URL reads file |
| DELETE | Scoped to `userId` in DB row — good |

| Severity | Issue |
|----------|--------|
| **High** | Public read of all uploaded files if URL guessed or leaked. |
| **High** | Arbitrary file upload (malware, HTML/SVG XSS if served with wrong content-type). |
| **Medium** | No virus scanning or content-type verification. |

---

## 7. Prisma queries

| Item | Status |
|------|--------|
| ORM usage | Prisma delegate pattern — **no raw SQL** in app routes (except health `SELECT 1`) |
| `$queryRawUnsafe` | Scripts only (`scripts/list-tables.ts`) |
| Generic query layer | **Highest risk** — bypasses business logic |
| N+1 / pagination | Dedicated routes sometimes cap limits (e.g. vehicles `limit` max 100); **db/query uncapped** |
| Transactions | Used in finance status advance — good |

| Severity | Issue |
|----------|--------|
| **Critical** | Generic CRUD is equivalent to exposing **admin DB console** to any logged-in user. |

---

## 8. API security

| Control | Status |
|---------|--------|
| CORS | Single origin via `CORS_ORIGIN`; API middleware handles OPTIONS |
| Helmet / security headers | Dependency present — **not applied** |
| HTTPS enforcement | Deployment concern — not in app |
| CSRF | Bearer tokens in header — lower CSRF risk |
| Socket.io | **No auth** on `join` / `presence` — any client can join any room |
| Error responses | Generic `{ message }` — OK; stack traces in logs |
| Feature flags | Good pattern for immature surfaces |
| Dedicated routes vs db/query | Split brain — security inconsistent |

| Severity | Issue |
|----------|--------|
| **High** | Socket rooms enumerable — auction/notification snooping or spam. |
| **Medium** | No request ID / structured security logging. |
| **Low** | `helmet` unused. |

---

## 9. Environment variables

| Item | Status |
|------|--------|
| `.env.example` | Present backend + frontend |
| `.gitignore` | Excludes `.env`, `.env.local` |
| `loadEnv()` | **Not called** at startup — weak production validation |
| JWT defaults in code | Fallback dev secrets |
| `DATABASE_URL` in example | Local root empty password — doc only |

| Severity | Issue |
|----------|--------|
| **High** | Misconfigured production env may boot with dev JWT secrets silently. |
| **Low** | No secrets manager integration (Vault/AWS SM) documented. |

---

## 10. Secrets handling

| Secret | Handling |
|--------|----------|
| JWT | Env vars — OK if set |
| Google OAuth | Env vars — OK |
| SMTP | Env vars — OK |
| Refresh tokens | Hashed in DB — good |
| Passwords | bcrypt — good |
| OTP | Plaintext in DB + **console log** — bad for prod |

| Severity | Issue |
|----------|--------|
| **Medium** | OTP logged to stdout in all environments. |
| **Low** | Frontend stores tokens in **localStorage** (XSS → token theft). |

---

## 11. Audit logging

| Item | Status |
|------|--------|
| `activity_logs` / analytics mapping | Exists; **not systematically used** for security events |
| Finance `finance_status_history` | Good for finance transitions |
| Admin actions | Partial — no unified audit trail |
| Auth events (login fail, role change) | **Not logged** |
| `db/query` mutations | **Not logged** |
| SIEM / immutable audit | None |

| Severity | Issue |
|----------|--------|
| **High** | No forensic trail for privilege escalation, mass data access, or admin abuse. |
| **Medium** | Compliance (RBI/IRDAI/DPDP) will require access logs — not ready. |

---

## 12. Frontend-specific notes

| Item | Risk |
|------|------|
| Tokens in `localStorage` | XSS impact |
| API URL from `VITE_API_URL` | OK — no secrets in frontend env example |
| RBAC routing | UX only — must match server |
| Mock fallbacks | Business logic bypass in UI — not a direct API bypass |
| Feature flags | Client-visible — OK for rollout |

---

# Issue register & fix priority

## Critical (P0 — block production)

| # | Issue | Area |
|---|--------|------|
| C1 | Register allows `super_admin` / `admin` / privileged roles from client | Auth |
| C2 | `/api/db/query` open CRUD for all authenticated users on sensitive tables | Authorization / Prisma |
| C3 | Mass `deleteMany` / broad `update` via db/query filters | Prisma |
| C4 | JWT dev secret fallbacks if env missing | JWT / Secrets |
| C5 | `GET /api/leads` returns all leads without dealer scoping | Authorization |

**Fix priority:** **Immediate** — before any public deployment or investor pentest.

---

## High (P1 — before scale / enterprise)

| # | Issue | Area |
|---|--------|------|
| H1 | No rate limiting on auth, OTP, leads, db/query | Rate limiting |
| H2 | Uploads publicly served without auth; no type/size limits | File uploads |
| H3 | Socket.io unauthenticated room join | API security |
| H4 | RPC: `finalize_auction`, weak `update_finance_verification` authorization | Authorization |
| H5 | No security audit log for admin/auth/data access | Audit logging |
| H6 | `loadEnv()` not enforced at startup; prod secret validation | Env |
| H7 | Trust JWT `role` instead of DB on privileged routes | RBAC |

---

## Medium (P2 — hardening sprint)

| # | Issue | Area |
|---|--------|------|
| M1 | Weak password policy (6 chars) | Auth |
| M2 | OTP logged + no throttling | Auth |
| M3 | `helmet` / security headers not enabled | API security |
| M4 | Inconsistent Zod validation across routes | Validation |
| M5 | `db/query` uncapped `limit`; JSON filter DoS | Validation |
| M6 | Non-prod auto-verify email on login | Auth |
| M7 | Pending business `users` update allowance too broad | Authorization |
| M8 | localStorage token storage — move to httpOnly cookie or refresh-only pattern | Frontend |
| M9 | Community RPC unauthenticated paths | API security |

---

## Low (P3 — backlog)

| # | Issue | Area |
|---|--------|------|
| L1 | No JWT iss/aud; no access token denylist | JWT |
| L2 | No mTLS for enterprise (O2 future) | API |
| L3 | CORS credentials + single origin — document production origins | API |
| L4 | Scripts use `$queryRawUnsafe` — keep dev-only | Prisma |
| L5 | AI client-side rate limit only | Frontend |
| L6 | DEV_WRITE_TABLES bypass in non-production for db/query | Prisma |

---

# Recommended remediation order

```text
Week 1 (P0)
  ├── Lock register roles (allowlist: customer + business roles only; never admin/super_admin)
  ├── Disable or strictly allowlist /api/db/query (table + action + row scope)
  ├── Scope GET /api/leads to dealer membership or admin
  └── Fail fast if JWT secrets missing/weak in production

Week 2 (P1)
  ├── express-rate-limit on /api/auth/*, /api/db/*, /api/leads, OTP
  ├── Upload: auth on static files OR signed URLs; MIME/size limits
  ├── Socket auth + room membership checks
  ├── RPC role guards (auction finalize, finance verification)
  └── Security audit log middleware (auth, admin, db/query denials)

Week 3–4 (P2)
  ├── Enforce loadEnv() at boot; password policy; OTP provider + rate limit
  ├── Helmet + CSP baseline
  ├── Migrate dashboards off db/query to dedicated scoped APIs
  └── Re-load role from DB on privileged operations
```

---

# Positive findings (retain)

- Refresh token hashing and rotation.
- Business pending-approval gate on Growth and db layer (partial).
- bcrypt cost factor 12.
- Feature-flag 404 pattern for immature modules.
- Admin finance status route uses Zod + platform admin check.
- Growth workspace isolation via header + owner check.
- `.env` gitignored; no secrets committed in examples.
- Prisma ORM avoids ad-hoc SQL in request path.

---

# Production readiness verdict

| Score | Value |
|-------|-------|
| **Security maturity** | **42 / 100** |
| **Production go-live** | **Not recommended** until P0 resolved |
| **Enterprise / O2 sales** | **Blocked** until P0 + P1 |

---

**Approval record:** S1 Production Readiness Audit complete — remediation tracked as implementation work (out of scope for this audit).
