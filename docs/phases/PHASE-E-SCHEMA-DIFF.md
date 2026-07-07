# Phase E0 — Schema diff (approval required before `db push`)

**Date:** 2026-06-04  
**Status:** ⏸ **WAITING FOR APPROVAL** — see [PHASE-E-E0-E3-DB-PUSH-REVIEW.md](./PHASE-E-E0-E3-DB-PUSH-REVIEW.md) (E0–E3 code + schema).

Reply **Approve E0–E3 db push** to apply to MySQL.

---

## E0 scope (this commit)

| In scope | Out of scope |
|----------|--------------|
| Prisma `broker` role + 13 `broker_*` models | Broker UI (`/dashboard/broker/*`) |
| `table-map.ts` delegates | Broker REST APIs (`/api/broker/*`) |
| Feature flags (default **off**) | Dealer CRM edits |
| `.env.example` comments | Marketplace lead flow |
| | Route / router changes |
| | `leads`, `crm_tasks`, `dealer_leads` schema changes |

---

## 1. Prisma schema diff

### A. `AppRole` enum — additive value (backward compatible)

```diff
 enum AppRole {
   ...
   finance_partner
+  broker
 }
```

Existing users keep their current role values. No users assigned `broker` until E1 signup mapping.

### B. `User` — relation only

```diff
 model User {
   ...
+  ownedBrokers      Broker[]
 }
```

No column changes on `users`.

### C. New models (13 tables)

| Model | MySQL table |
|-------|-------------|
| `Broker` | `brokers` |
| `BrokerBuyer` | `broker_buyers` |
| `BrokerSeller` | `broker_sellers` |
| `BrokerLead` | `broker_leads` |
| `BrokerDeal` | `broker_deals` |
| `BrokerDealVehicle` | `broker_deal_vehicles` |
| `BrokerDealStageHistory` | `broker_deal_stage_history` |
| `BrokerTask` | `broker_tasks` |
| `BrokerCommission` | `broker_commissions` |
| `BrokerLeadNote` | `broker_lead_notes` |
| `BrokerWhatsAppConfig` | `broker_whatsapp_configs` |
| `BrokerWhatsAppTemplate` | `broker_whatsapp_templates` |
| `BrokerWhatsAppMessage` | `broker_whatsapp_messages` |

Full definitions: `backend/prisma/schema.prisma` (section after `DealerLeadNote`).

### D. Explicitly NOT modified

| Model / table | Rule |
|---------------|------|
| `Lead` → `leads` | No changes |
| `CrmTask` → `crm_tasks` | No changes |
| `DealerLead` → `dealer_leads` | No changes |
| `Dealer`, `Vehicle` columns | No changes |
| `VehicleSaleMode.broker_assisted` | Already exists (Phase B) — unchanged |

### E. Isolation rules (schema-level)

- `broker_leads` is separate from `leads` (no FK between them).
- `broker_tasks` is separate from `crm_tasks`.
- `broker_leads.vehicle_id` / `broker_deal_vehicles.vehicle_id` are optional UUIDs **without** FK to `vehicles` (read-only refs at app layer).
- No `DROP` / `ALTER` on dealer or marketplace tables.

---

## 2. MySQL changes (expected on `db push`)

### Enum alteration

```sql
ALTER TABLE `users` MODIFY `role` ENUM(..., 'broker') NOT NULL;
```

*(Prisma may emit equivalent `ALTER` on `users.role` depending on current enum definition.)*

### New tables (13)

All **CREATE TABLE** with FKs only within broker domain + `brokers.owner_id` → `users.id`.

| Table | FK targets |
|-------|------------|
| `brokers` | `users` |
| `broker_buyers` | `brokers` |
| `broker_sellers` | `brokers` |
| `broker_leads` | `brokers`, optional `broker_buyers`, `broker_sellers` |
| `broker_deals` | `brokers`, optional lead/buyer/seller |
| `broker_deal_vehicles` | `broker_deals` |
| `broker_deal_stage_history` | `broker_deals` |
| `broker_tasks` | `brokers`, optional lead/deal |
| `broker_commissions` | `brokers`, `broker_deals` (unique `deal_id`) |
| `broker_lead_notes` | `broker_leads`, `brokers` |
| `broker_whatsapp_configs` | `brokers` (unique `broker_id`) |
| `broker_whatsapp_templates` | `brokers` |
| `broker_whatsapp_messages` | `brokers`, optional lead/deal |

### Tables / columns dropped

**None.**

### Existing data modified

**None** — only new empty tables + enum extension. Existing `users`, `leads`, dealer rows unchanged.

---

## 3. Affected files

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | E0 models + `broker` role |
| `backend/src/lib/db/table-map.ts` | 13 broker table delegates |
| `backend/src/config/feature-flags.ts` | 9 broker flags, default `false` |
| `frontend/src/config/feature-flags.ts` | 9 `VITE_*` broker flags, default `false` |
| `backend/.env.example` | Commented `FEATURE_BROKER_*` |
| `PHASE-E-SCHEMA-DIFF.md` | This review doc |

### Not modified (per rules)

| Area | Files |
|------|-------|
| Dealer CRM | `frontend/src/features/dealer-crm/**` |
| Marketplace leads | `backend/src/app/api/leads/**`, marketplace services |
| Routes | `frontend/src/router/**` |
| Broker APIs | *(none exist yet)* |
| Auth signup | `register/route.ts` — `broker` not in `VALID_ROLES` until E1 |

---

## 4. Feature flags (default off)

| Backend | Frontend | Default |
|---------|----------|---------|
| `FEATURE_BROKER_CRM` | `VITE_FEATURE_BROKER_CRM` | `false` |
| `FEATURE_BROKER_CONTACTS` | `VITE_FEATURE_BROKER_CONTACTS` | `false` |
| `FEATURE_BROKER_LEADS` | `VITE_FEATURE_BROKER_LEADS` | `false` |
| `FEATURE_BROKER_DEALS` | `VITE_FEATURE_BROKER_DEALS` | `false` |
| `FEATURE_BROKER_VEHICLE_ASSIGN` | `VITE_FEATURE_BROKER_VEHICLE_ASSIGN` | `false` |
| `FEATURE_BROKER_COMMISSIONS` | `VITE_FEATURE_BROKER_COMMISSIONS` | `false` |
| `FEATURE_BROKER_TASKS` | `VITE_FEATURE_BROKER_TASKS` | `false` |
| `FEATURE_BROKER_WHATSAPP` | `VITE_FEATURE_BROKER_WHATSAPP` | `false` |
| `FEATURE_BROKER_MARKETPLACE_BRIDGE` | `VITE_FEATURE_BROKER_MARKETPLACE_BRIDGE` | `false` |

---

## 5. Pre-push commands (after approval)

```powershell
cd backend
npx prisma validate
# backup: E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction motorcart > backups\motorcart-pre-e0-YYYYMMDD.sql
npx prisma db push
npx prisma generate
```

---

## 6. Rollback (dev)

1. Restore MySQL backup.
2. Revert `schema.prisma` E0 commit.
3. `npx prisma generate`
4. Keep all `FEATURE_BROKER_*` unset/false.

Broker tables empty = zero impact on dealer CRM.

---

## Approval

Reply **Approve E0 db push** to migrate MySQL, or request schema changes before push.
