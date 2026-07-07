# Phase E0–E3 — Pre-push package (awaiting `db push` approval)

**Date:** 2026-06-04  
**E0–E3 applied** — see [PHASE-E-E0-E3-APPLIED-RESULTS.md](./PHASE-E-E0-E3-APPLIED-RESULTS.md)

`db push` completed 2026-06-04. Awaiting review before E4 / flag enablement.

---

## 1. MySQL backup — done

| Item | Value |
|------|-------|
| File | `backend/backups/motorcart-pre-e0e3-20260604-115202.sql` |
| Size | 148,799 bytes (~145 KB) |
| Tool | `E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction --routines --triggers motorcart` |
| Exit code | `0` |

---

## 2. `prisma validate` — done

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

Exit code: **0**

---

## 3. Prisma schema diff (final)

### A. `AppRole` enum — additive

```diff
 enum AppRole {
   ...
   finance_partner
+  broker
 }
```

### B. `User` — relation only (no new `users` columns)

```diff
 model User {
   ...
+  ownedBrokers      Broker[]
 }
```

FK lives on `brokers.owner_id` → `users.id`.

### C. New models (13) — full block in `backend/prisma/schema.prisma` after `DealerLeadNote`

| # | Model | `@@map` table |
|---|--------|----------------|
| 1 | `Broker` | `brokers` |
| 2 | `BrokerBuyer` | `broker_buyers` |
| 3 | `BrokerSeller` | `broker_sellers` |
| 4 | `BrokerLead` | `broker_leads` |
| 5 | `BrokerDeal` | `broker_deals` |
| 6 | `BrokerDealVehicle` | `broker_deal_vehicles` |
| 7 | `BrokerDealStageHistory` | `broker_deal_stage_history` |
| 8 | `BrokerTask` | `broker_tasks` |
| 9 | `BrokerCommission` | `broker_commissions` |
| 10 | `BrokerLeadNote` | `broker_lead_notes` |
| 11 | `BrokerWhatsAppConfig` | `broker_whatsapp_configs` |
| 12 | `BrokerWhatsAppTemplate` | `broker_whatsapp_templates` |
| 13 | `BrokerWhatsAppMessage` | `broker_whatsapp_messages` |

### D. Unchanged Prisma models (dealer / marketplace)

- `Lead` → `leads`
- `DealerLead` → `dealer_leads`
- `CrmTask` → `crm_tasks`
- `Dealer`, `DealerLeadNote`, `Vehicle`, etc.

**Counts:** 13 new models · 2 touched (`AppRole`, `User` relation) · 0 dealer/marketplace model edits

---

## 4. Exact `broker_*` tables to be created (13)

```
brokers
broker_buyers
broker_sellers
broker_leads
broker_deals
broker_deal_vehicles
broker_deal_stage_history
broker_tasks
broker_commissions
broker_lead_notes
broker_whatsapp_configs
broker_whatsapp_templates
broker_whatsapp_messages
```

**Plus (additive enum only on existing tables):**

- `users.role` — add enum value `broker`
- `dealers.dealer_type` — add enum value `broker` (Prisma `Dealer.dealerType` uses `AppRole`; no column rename/drop)

**Not altered:** `leads`, `dealer_leads`, `crm_tasks`, or any dealer CRM column semantics.

**E0–E3 active after flags on:** `brokers`, `broker_buyers`, `broker_sellers`, `broker_leads` only.  
**Idle until E4+:** deals, tasks, commissions, whatsapp_* tables (empty, no APIs).

---

## 5. Confirmations — no changes to

| Item | Confirmed |
|------|-----------|
| `leads` table / `Lead` model | **No** schema or API changes |
| `dealer_leads` / `DealerLead` | **No** changes |
| `crm_tasks` / `CrmTask` | **No** changes |
| Dealer CRM routes (`/dashboard/dealer/*`) | **No** changes |
| `frontend/src/features/dealer-crm/**` | **No** edits |
| `POST /api/leads` / `marketplace-lead.service.ts` | **Unchanged** |

---

## 6. `FEATURE_BROKER_*` — all default false

| Flag | Default in code |
|------|-----------------|
| `FEATURE_BROKER_CRM` | `false` |
| `FEATURE_BROKER_CONTACTS` | `false` |
| `FEATURE_BROKER_LEADS` | `false` |
| `FEATURE_BROKER_DEALS` | `false` |
| `FEATURE_BROKER_VEHICLE_ASSIGN` | `false` |
| `FEATURE_BROKER_TASKS` | `false` |
| `FEATURE_BROKER_COMMISSIONS` | `false` |
| `FEATURE_BROKER_WHATSAPP` | `false` |
| `FEATURE_BROKER_MARKETPLACE_BRIDGE` | `false` |

`backend/.env` has **no** broker flags set. Frontend `VITE_FEATURE_BROKER_*` mirrors defaults.

With flags off, `/api/broker/*` returns **404**.

---

## 7. Marketplace bridge — disabled by default

| Check | Status |
|-------|--------|
| `FEATURE_BROKER_MARKETPLACE_BRIDGE` default | **`false`** |
| `createMarketplaceLead()` modified | **No** |
| `POST /api/leads` modified | **No** |
| Bridge endpoint | `POST /api/broker/bridge/copy-lead` only; requires flag + broker auth; **not** called from marketplace flow |

---

## 8. Rollback plan

### A — Application (immediate)

1. Keep all `FEATURE_BROKER_*` / `VITE_FEATURE_BROKER_*` unset or `false`.
2. Broker APIs 404; dealer CRM and marketplace enquiries unchanged.
3. Optional: hide `/dashboard/broker` via route revert.

### B — Full DB restore (dev)

```powershell
& "E:\xampp\mysql\bin\mysql.exe" -u root motorcart < backend\backups\motorcart-pre-e0e3-20260604-115202.sql
cd backend
git checkout -- prisma/schema.prisma
npx prisma generate
```

### C — Surgical (empty broker tables only)

Drop 13 `broker_*` tables in reverse FK order, then revert enum via backup (enum rollback safest via full restore).

**Dealer data:** never modified by broker migration.

### D — Destructive migration check

- No `DROP TABLE` / `DROP COLUMN` in expected diff.
- Do **not** use `--force-reset` or `--accept-data-loss` without line-by-line review.

---

## Apply commands (after **db push** approval only)

```powershell
cd backend
npx prisma validate
npx prisma db push
npx prisma generate
```

Optional live SQL review before push:

```powershell
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

---

## Approval gate

**Pre-push checklist:** complete (backup + validate + this document).  
**`db push`:** not run — reply **Approve E0–E3 db push** to migrate.
