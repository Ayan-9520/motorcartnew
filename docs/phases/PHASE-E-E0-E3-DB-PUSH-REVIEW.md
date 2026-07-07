# Phase E0–E3 — Pre `db push` review (approval gate)

**Date:** 2026-06-04  
**Status:** ✅ Pre-push complete — see [PHASE-E-E0-E3-PRE-PUSH.md](./PHASE-E-E0-E3-PRE-PUSH.md) · ⏸ **`db push` NOT run**

Reply **Approve E0–E3 db push** to apply schema to MySQL.

---

## Scope delivered (code in repo)

| Phase | Delivered | Not delivered (per rules) |
|-------|-----------|---------------------------|
| **E0** | Prisma `broker` role + 13 `broker_*` tables, flags, `table-map` | — |
| **E1** | Broker signup mapping, `brokers` stub on register, `/api/broker/profile`, guard | Full broker signup UI polish |
| **E2** | `/api/broker/buyers`, `/api/broker/sellers` CRUD | Broker buyers/sellers **pages** |
| **E3** | `/api/broker/leads` CRUD, isolated bridge service + flag-gated route | Marketplace flow **unchanged** |
| — | Minimal `/dashboard/broker` shell only | Deals, commissions, WhatsApp, pipeline UI |

---

## 1. Prisma schema diff (E0 — database only)

### `AppRole` — additive

```diff
+  broker
```

### `User` — relation only

```diff
+  ownedBrokers      Broker[]
```

### New models → tables (13)

| Model | Table | Used in E0–E3 |
|-------|-------|-----------------|
| `Broker` | `brokers` | E1 |
| `BrokerBuyer` | `broker_buyers` | E2 |
| `BrokerSeller` | `broker_sellers` | E2 |
| `BrokerLead` | `broker_leads` | E3 |
| `BrokerDeal` | `broker_deals` | Schema idle (E4+) |
| `BrokerDealVehicle` | `broker_deal_vehicles` | Idle |
| `BrokerDealStageHistory` | `broker_deal_stage_history` | Idle |
| `BrokerTask` | `broker_tasks` | Idle (E6+) |
| `BrokerCommission` | `broker_commissions` | Idle (E7+) |
| `BrokerLeadNote` | `broker_lead_notes` | Idle |
| `BrokerWhatsAppConfig` | `broker_whatsapp_configs` | Idle (E8+) |
| `BrokerWhatsAppTemplate` | `broker_whatsapp_templates` | Idle |
| `BrokerWhatsAppMessage` | `broker_whatsapp_messages` | Idle |

### Unchanged (hard rule)

- `leads`, `crm_tasks`, `dealer_leads`, `Dealer`, dealer CRM columns
- `POST /api/leads` / `createMarketplaceLead()` — **no edits**

---

## 2. New broker tables (MySQL `CREATE`)

All created empty on push:

1. `brokers`
2. `broker_buyers`
3. `broker_sellers`
4. `broker_leads`
5. `broker_deals`
6. `broker_deal_vehicles`
7. `broker_deal_stage_history`
8. `broker_tasks`
9. `broker_commissions`
10. `broker_lead_notes`
11. `broker_whatsapp_configs`
12. `broker_whatsapp_templates`
13. `broker_whatsapp_messages`

Plus: `users.role` enum extended with `broker`.

**No `DROP` statements.**

---

## 3. Affected files

### Schema & config (E0)

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | E0 models |
| `backend/src/lib/db/table-map.ts` | Broker delegates |
| `backend/src/config/feature-flags.ts` | 9 flags, default **false** |
| `frontend/src/config/feature-flags.ts` | 9 `VITE_*`, default **false** |
| `backend/.env.example` | Commented broker flags |

### Backend E1–E3 (new)

| File | Purpose |
|------|---------|
| `backend/src/lib/broker/guard.ts` | Auth + per-flag gate |
| `backend/src/services/broker-profile.service.ts` | Profile + register stub |
| `backend/src/services/broker-buyer.service.ts` | E2 |
| `backend/src/services/broker-seller.service.ts` | E2 |
| `backend/src/services/broker-lead.service.ts` | E3 |
| `backend/src/services/broker-marketplace-bridge.service.ts` | Copy-only bridge (not wired to marketplace) |
| `backend/src/app/api/broker/profile/route.ts` | E1 |
| `backend/src/app/api/broker/buyers/route.ts` | E2 |
| `backend/src/app/api/broker/buyers/[id]/route.ts` | E2 |
| `backend/src/app/api/broker/sellers/route.ts` | E2 |
| `backend/src/app/api/broker/sellers/[id]/route.ts` | E2 |
| `backend/src/app/api/broker/leads/route.ts` | E3 |
| `backend/src/app/api/broker/leads/[id]/route.ts` | E3 |
| `backend/src/app/api/broker/bridge/copy-lead/route.ts` | E3 optional; `FEATURE_BROKER_MARKETPLACE_BRIDGE` |

### Backend E1 (auth — minimal)

| File | Change |
|------|--------|
| `backend/src/app/api/auth/register/route.ts` | `broker` role + `vehicle_broker` category + broker stub |
| `backend/src/lib/auth/account-access.ts` | `broker` in approval roles |
| `backend/src/services/platform-admin.service.ts` | `broker` in `BUSINESS_ROLES` |

### Frontend (shell + signup only)

| File | Change |
|------|--------|
| `frontend/src/types/database.ts` | `broker` in `AppRole` |
| `frontend/src/auth/business-signup-types.ts` | `vehicle_broker` category |
| `frontend/src/auth/resolve-business-signup-role.ts` | Maps to `broker` |
| `frontend/src/auth/ecosystem-roles.ts` | Broker business signup |
| `frontend/src/lib/constants.ts` | `DASHBOARD_ROUTES.broker` |
| `frontend/src/auth/get-role-dashboard-path.ts` | Dedicated workspace |
| `frontend/src/features/broker-crm/components/BrokerDashboardLayout.tsx` | Minimal shell |
| `frontend/src/features/broker-crm/pages/BrokerOverviewPage.tsx` | Overview only |
| `frontend/src/router/index.tsx` | **New** route `/dashboard/broker` only |
| `frontend/src/router/lazy-pages.tsx` | Lazy overview |
| `frontend/src/pages/auth/BusinessSignupPage.tsx` | `vehicle_broker` enum value |

### Not modified

| Area | Rule |
|------|------|
| `frontend/src/features/dealer-crm/**` | No dealer CRM edits |
| `dashboard/dealer/*` routes | Unchanged |
| `backend/src/app/api/leads/route.ts` | Unchanged |
| `backend/src/services/marketplace-lead.service.ts` | Unchanged |
| Deal / commission / WhatsApp APIs | Not created |

---

## 4. API behavior (flags off = 404)

| Endpoint | Flag required |
|----------|---------------|
| `GET/PATCH /api/broker/profile` | `FEATURE_BROKER_CRM` |
| `/api/broker/buyers*` | `FEATURE_BROKER_CONTACTS` |
| `/api/broker/sellers*` | `FEATURE_BROKER_CONTACTS` |
| `/api/broker/leads*` | `FEATURE_BROKER_LEADS` |
| `POST /api/broker/bridge/copy-lead` | `FEATURE_BROKER_MARKETPLACE_BRIDGE` (default **off**) |

With all flags false (default), broker APIs return **404** — same as disabled.

---

## 5. Feature flags (all default false)

| Backend | Default |
|---------|---------|
| `FEATURE_BROKER_CRM` | false |
| `FEATURE_BROKER_CONTACTS` | false |
| `FEATURE_BROKER_LEADS` | false |
| `FEATURE_BROKER_DEALS` | false |
| `FEATURE_BROKER_VEHICLE_ASSIGN` | false |
| `FEATURE_BROKER_TASKS` | false |
| `FEATURE_BROKER_COMMISSIONS` | false |
| `FEATURE_BROKER_WHATSAPP` | false |
| `FEATURE_BROKER_MARKETPLACE_BRIDGE` | false |

---

## 6. Rollback plan

### Level A — Application (immediate)

1. Keep all `FEATURE_BROKER_*` / `VITE_FEATURE_BROKER_*` unset or `false`.
2. Broker APIs return 404; marketplace enquiries unchanged.
3. Remove `/dashboard/broker` route block via revert if needed.

### Level B — Database (dev)

```powershell
# Before push:
E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction motorcart > backend\backups\motorcart-pre-e0e3-YYYYMMDD.sql

# Rollback:
E:\xampp\mysql\bin\mysql.exe -u root motorcart < backend\backups\motorcart-pre-e0e3-YYYYMMDD.sql
cd backend
git checkout -- prisma/schema.prisma
npx prisma generate
```

### Level C — Surgical (empty broker tables)

```sql
DROP TABLE IF EXISTS broker_whatsapp_messages;
DROP TABLE IF EXISTS broker_whatsapp_templates;
DROP TABLE IF EXISTS broker_whatsapp_configs;
DROP TABLE IF EXISTS broker_lead_notes;
DROP TABLE IF EXISTS broker_commissions;
DROP TABLE IF EXISTS broker_tasks;
DROP TABLE IF EXISTS broker_deal_stage_history;
DROP TABLE IF EXISTS broker_deal_vehicles;
DROP TABLE IF EXISTS broker_deals;
DROP TABLE IF EXISTS broker_leads;
DROP TABLE IF EXISTS broker_sellers;
DROP TABLE IF EXISTS broker_buyers;
DROP TABLE IF EXISTS brokers;
-- Then revert users.role enum via backup (enum rollback is safest via full restore)
```

**Dealer data:** never touched by broker schema or E0–E3 code paths.

---

## 7. Apply commands (after approval only)

```powershell
cd backend
npx prisma validate
E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction --routines --triggers motorcart > backups\motorcart-pre-e0e3-$(Get-Date -Format yyyyMMdd-HHmmss).sql
npx prisma db push
npx prisma generate
```

---

## Approval

Reply **Approve E0–E3 db push** to migrate MySQL.

E4+ (deals pipeline), E7 (commissions), E8 (WhatsApp) remain out of scope until separately approved.
