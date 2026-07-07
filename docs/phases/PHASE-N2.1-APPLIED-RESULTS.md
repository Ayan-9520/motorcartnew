# Phase N2.1 — Billing MVP (applied)

Architecture reference: `PHASE-N2.0-BILLING-FOUNDATION-PLAN.md`.

## Feature flag

| Layer | Variable | Default |
|-------|----------|---------|
| API | `FEATURE_BILLING_V2` | `false` |
| Web | `VITE_FEATURE_BILLING_V2` | `false` |

When OFF, all `/api/billing/*` routes return **404**. UI shows disabled state at `/dashboard/billing`.

## Deliverables

### APIs (additive)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/billing/plans` | Public (flag) | Catalog: Free, Starter, Professional, Business, Enterprise |
| GET | `/api/billing/entitlements` | JWT | Resolved limits + feature flags for account |
| GET | `/api/billing/subscription` | JWT | Mock subscription + plan summary |
| POST | `/api/billing/subscription` | JWT | Mock plan change (`plan_slug`, optional `billing_cycle`) |
| GET | `/api/billing/usage` | JWT | Usage meters (store + read-only DB/router) |
| GET | `/api/billing/overview` | JWT | Dashboard aggregate |

**Not implemented (by design):** Razorpay, Stripe, real payments, GST invoices, auto-renew.

### Services & storage

- Plan catalog: `backend/src/lib/billing/plans-catalog.ts`
- Entitlement resolver: `backend/src/lib/billing/entitlements-resolver.ts`
- Mock persistence: `backend/.data/billing/` (gitignored)
  - `billing-accounts.json`
  - `subscriptions.json`
  - `usage-tracking.json`
  - `invoices.json` (draft mock only)

No Prisma schema changes. No `db push`.

### Frontend

- Route: `/dashboard/billing` — `BillingDashboardPage`
- API client: `frontend/src/integrations/api/billing.ts`
- Cross-role workspace access in `workspace-redirect.ts`

### Smoke test

```bash
cd backend
npx tsx scripts/smoke-n2-billing.ts
```

With flags OFF, expects 404 on billing routes and 200 on `/api/health`.

## Rollback plan

1. Set `FEATURE_BILLING_V2=false` and `VITE_FEATURE_BILLING_V2=false` (or unset).
2. Restart API and frontend dev servers.
3. Optional: delete `backend/.data/billing/` to clear mock accounts.
4. No database rollback required.

## Enable for local testing

```env
# backend/.env
FEATURE_BILLING_V2=true

# frontend/.env
VITE_FEATURE_BILLING_V2=true
```

Sign in, open `/dashboard/billing`, use **Select (mock)** on a plan. Creates/updates JSON store only.

## Out of scope (N2.1)

- Payment gateways (N2.4+)
- `plans` / `subscriptions` SQL tables (future migration, user-approved)
- Enforcement hooks on vehicle create, auction entry, etc. (N2.2+)
