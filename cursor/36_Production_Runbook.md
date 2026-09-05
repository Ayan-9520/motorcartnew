# Production runbook (Batch 12)

**Production must not be touched by development agents.** This document is local/ops guidance only. Automated backups are **not** claimed unless your host verifies them.

## Canonical data store

- PostgreSQL via Prisma migrations (`npx prisma migrate deploy`).
- **Never** `prisma db push` in shared environments.
- Do not rewrite historical migrations.

## Backup expectation (you must configure)

1. Take a PostgreSQL dump **before** every production migrate: `pg_dump` (custom format recommended).
2. Store dumps off-box with encryption and retention per company policy.
3. After restore, run `npx prisma migrate status` and a smoke `GET /api/health` + `GET /api/ready`.

MotorCart does not ship a backup daemon in this repository.

## Migration procedure

1. Backup.
2. Deploy code that includes the new migration folder.
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. Confirm `Database schema is up to date.`
6. Hit `/api/ready` — `checks.database` true.

Rollback: restore the dump taken in step 1; do not “edit” applied SQL. Feature flags can disable product surfaces without schema rollback.

## Feature flag / provider disable

Set to false or unset with documented defaults:

| Flag | Production recommendation |
|------|---------------------------|
| `FEATURE_PAYMENT_GATEWAY` | false until a live adapter + webhook secret exist |
| `FEATURE_DIALER` / `FEATURE_AI_CALLING` | false until provider + consent + entitlement |
| `FEATURE_LEAD_BOARD` / `FEATURE_PAID_LEADS` | false until commercial policy is live |
| `FEATURE_M5_UNIFIED_SEARCH` | true (PostgreSQL; no OpenSearch) |
| `FEATURE_M4_NOTIFICATIONS` | true |

Unset `OPENAI_API_KEY`, `COMM_WEBHOOK_SECRET`, `COMMERCIAL_WEBHOOK_SECRET` to disable those providers. UI/API must stay honest (unavailable), not fake success.

## Background jobs

There is **no in-process cron** guaranteed in production.

Entry point: `runSuperAppJobs()` in `backend/src/jobs/superapp-scheduler.ts` (saved-search notifications, reminders, stale offer expiry). Wire to your scheduler (systemd timer, k8s CronJob, or host cron) to call an authenticated internal job runner you deploy. Jobs are designed to be rerunnable and bounded.

## Incident basics

1. Disable the affected provider flag or webhook secret.
2. Do not log JWTs, OTPs, PAN, bank accounts, or raw webhook secrets.
3. Prefer 503 on `/api/ready` when PostgreSQL is down; `/api/health` remains liveness-only.

## Webhooks

Communications and commercial webhooks require secrets and event ids. Replay/idempotency is server-side. Missing secret = provider not configured (fail closed).
