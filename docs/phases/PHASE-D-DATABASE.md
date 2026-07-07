# Phase D — Database Changes (review before `db push`)

**Rules:** Additive only. No drops. Align Prisma with insurance UI types and Postgres reference `00025_insurance_enterprise.sql`.

---

## 0. Gap summary

| Model (Prisma today) | UI / SQL expects |
|----------------------|------------------|
| `InsuranceApplication` | `provider`, `premium`, `metadata` only | Full vehicle, plan, premium, policy dates, applicant, addons, status enum |
| `InsuranceQuote` | `userId`, `partnerId`, `premium`, `metadata` | Vehicle, IDV, NCB, plan, breakdown, rank, expires |
| `InsurancePartner` | `name`, `slug`, `logoUrl`, `metadata` | `claim_settlement_ratio`, `plan_types[]` |
| `InsuranceWallet` | `insurerName`, `policyNumber`, `policyEnd` | `idv_amount`, `annual_premium`, `ncb_percent`, `plan_type`, `claim_count`, `vehicle_id` |
| *(missing)* | Claims panel | `insurance_claims` table |
| *(missing)* | Agent CRM, commissions, renewals | Dedicated tables |

---

## 1. `insurance_partners` — align columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `claim_settlement_ratio` | DECIMAL(5,2) NULL | NULL | CSR % |
| `plan_types` | JSON | `[]` | `third_party`, `comprehensive`, etc. |
| `short_code` | VARCHAR(16) NULL | NULL | Optional |
| `updated_at` | DATETIME | NOW() | |

Existing: `name`, `slug`, `logo_url`, `is_active`, `metadata`.

---

## 2. `insurance_quotes` — align columns

| Column | Type | Notes |
|--------|------|-------|
| `vehicle_type` | VARCHAR(16) | `car`, `bike` |
| `vehicle_year` | INT | |
| `vehicle_make` | VARCHAR(64) | |
| `vehicle_model` | VARCHAR(64) | |
| `registration_city` | VARCHAR(64) | |
| `fuel_type` | VARCHAR(32) | default `petrol` |
| `idv_amount` | BIGINT | |
| `ncb_percent` | INT | 0–50 |
| `plan_type` | VARCHAR(32) | |
| `partner_name` | VARCHAR(128) NULL | |
| `annual_premium` | BIGINT | |
| `monthly_premium` | BIGINT NULL | |
| `addons` | JSON | `[]` |
| `premium_breakdown` | JSON | `{}` |
| `claim_settlement_ratio` | DECIMAL(5,2) NULL | |
| `rank_score` | INT | 0 |
| `comparison_session_id` | CHAR(36) NULL | Phase D compare |
| `expires_at` | DATETIME | default +7 days |

Keep `user_id`, `partner_id`, `premium` (deprecated alias of `annual_premium` optional).

**Index:** `(user_id, created_at)`, `(comparison_session_id)`.

---

## 3. `insurance_quote_offers` (new) — policy comparison persistence

Normalized compare output (optional if quotes table sufficient; recommended for session history).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `comparison_session_id` | UUID NOT NULL | |
| `user_id` | UUID NULL | |
| `partner_id` | UUID NOT NULL | |
| `quote_id` | UUID NULL | FK → insurance_quotes |
| `annual_premium` | BIGINT | |
| `monthly_premium` | BIGINT NULL | |
| `idv_amount` | BIGINT | |
| `rank` | INT | |
| `rank_score` | INT | |
| `approval_probability` | INT NULL | |
| `premium_breakdown` | JSON | |
| `is_selected` | BOOLEAN DEFAULT false | |
| `created_at` | DATETIME | |

---

## 4. `insurance_applications` — align columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `quote_id` | UUID NULL | | FK quotes |
| `partner_id` | UUID NULL | | |
| `partner_name` | VARCHAR(128) NULL | | |
| `vehicle_type` | VARCHAR(16) | | |
| `vehicle_year` | INT | | |
| `vehicle_make` | VARCHAR(64) | | |
| `vehicle_model` | VARCHAR(64) | | |
| `registration_number` | VARCHAR(20) NULL | | |
| `registration_city` | VARCHAR(64) | | |
| `plan_type` | VARCHAR(32) | | |
| `idv_amount` | BIGINT | | |
| `annual_premium` | BIGINT | | maps from `premium` |
| `ncb_percent` | INT | 0 | |
| `status` | VARCHAR(32) | `submitted` | draft, quoted, submitted, under_review, issued, rejected, expired |
| `policy_number` | VARCHAR(64) NULL | | |
| `policy_start` | DATE NULL | | |
| `policy_end` | DATE NULL | | |
| `applicant_name` | VARCHAR(128) NULL | | |
| `applicant_phone` | VARCHAR(20) NULL | | |
| `applicant_email` | VARCHAR(128) NULL | | |
| `addons` | JSON | `[]` | |
| `notes` | TEXT NULL | | |
| `agent_id` | UUID NULL | | FK insurance_agents |
| `comparison_session_id` | UUID NULL | | |

Keep `provider` (legacy alias of `partner_name`) and `metadata` for compat.

**Indexes:** `(user_id, created_at)`, `(status)`, `(agent_id)`, `(partner_id)`.

---

## 5. `insurance_policies` (new) — policy management

Issued policy record (source of truth for vault + renewal + claims).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID FK | owner |
| `application_id` | UUID NULL FK | originating app |
| `partner_id` | UUID NULL | |
| `vehicle_id` | UUID NULL | customer_vehicles |
| `policy_number` | VARCHAR(64) UNIQUE | |
| `insurer_name` | VARCHAR(128) | |
| `plan_type` | VARCHAR(32) | |
| `vehicle_label` | VARCHAR(128) | display |
| `registration_number` | VARCHAR(20) NULL | |
| `idv_amount` | BIGINT | |
| `annual_premium` | BIGINT | |
| `ncb_percent` | INT | |
| `policy_start` | DATE | |
| `policy_end` | DATE | |
| `status` | VARCHAR(24) | active, expiring, expired, cancelled |
| `agent_id` | UUID NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(user_id, policy_end)`, `(agent_id)`, `(status)`.

---

## 6. `insurance_wallet` — extend (vault)

| Column | Type | Notes |
|--------|------|-------|
| `policy_id` | UUID NULL FK | → insurance_policies |
| `plan_type` | VARCHAR(32) NULL | |
| `idv_amount` | BIGINT NULL | |
| `annual_premium` | BIGINT NULL | |
| `ncb_percent` | INT NULL | |
| `claim_count` | INT DEFAULT 0 | |
| `vehicle_label` | VARCHAR(128) NULL | |

Sync rule (app): on policy `issued`, upsert wallet row from policy.

---

## 7. `insurance_claims` (new) — claims tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `policy_id` | UUID FK | |
| `vehicle_label` | VARCHAR(128) | |
| `insurer_name` | VARCHAR(128) | |
| `claim_number` | VARCHAR(64) | external ref |
| `amount` | BIGINT | claimed amount |
| `status` | VARCHAR(24) | processing, settled, rejected |
| `filed_at` | DATETIME | |
| `settled_at` | DATETIME NULL | |
| `notes` | TEXT NULL | |
| `documents` | JSON | `[]` upload refs |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Index:** `(user_id, filed_at)`, `(policy_id)`.

---

## 8. `insurance_renewal_tasks` (new) — renewal engine

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `policy_id` | UUID FK | |
| `user_id` | UUID FK | |
| `due_at` | DATETIME | policy_end − lead days |
| `window_days` | INT DEFAULT 30 | |
| `status` | VARCHAR(24) | pending, notified, quoted, renewed, skipped |
| `last_notified_at` | DATETIME NULL | |
| `renewal_application_id` | UUID NULL | new app if customer renews |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Unique:** `(policy_id, window_days)` or `(policy_id, due_at)` to prevent duplicates.

---

## 9. `insurance_agents` (new) — agent CRM

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK | login |
| `license_number` | VARCHAR(64) NULL | |
| `commission_rate` | DECIMAL(5,2) DEFAULT 0 | |
| `is_active` | BOOLEAN DEFAULT true | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**AppRole (additive):** `insurance_agent` in Prisma `AppRole` enum.

---

## 10. `insurance_agent_leads` (new)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `agent_id` | UUID FK | |
| `user_id` | UUID NULL | customer |
| `customer_name` | VARCHAR(128) | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(128) NULL | |
| `source` | VARCHAR(32) | website, dealer, renewal |
| `stage` | VARCHAR(24) | new, contacted, quoted, bound, lost |
| `vehicle_make` | VARCHAR(64) NULL | |
| `vehicle_model` | VARCHAR(64) NULL | |
| `policy_end` | DATE NULL | renewal lead |
| `application_id` | UUID NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

---

## 11. `insurance_crm_tasks` (new)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `agent_id` | UUID FK | |
| `lead_id` | UUID NULL | |
| `application_id` | UUID NULL | |
| `policy_id` | UUID NULL | |
| `task_type` | VARCHAR(32) | renewal_call, doc_chase, quote_followup |
| `title` | VARCHAR(255) | |
| `due_at` | DATETIME NULL | |
| `status` | VARCHAR(24) DEFAULT pending | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

---

## 12. `insurance_commissions` (new) — commission tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `agent_id` | UUID FK | |
| `policy_id` | UUID FK | |
| `application_id` | UUID NULL | |
| `event_type` | VARCHAR(24) | new_business, renewal |
| `premium_amount` | BIGINT | |
| `commission_rate` | DECIMAL(5,2) | |
| `commission_amount` | BIGINT | |
| `status` | VARCHAR(24) | pending, approved, paid, cancelled |
| `paid_at` | DATETIME NULL | |
| `created_at` | DATETIME | |

**Unique:** `(policy_id, event_type)` to avoid double pay.

---

## 13. `insurance_status_history` (new, optional but recommended)

Audit trail for application/policy status (mirrors finance pattern).

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `application_id` | UUID NULL |
| `policy_id` | UUID NULL |
| `from_status` | VARCHAR(32) NULL |
| `to_status` | VARCHAR(32) |
| `changed_by` | UUID NULL |
| `note` | TEXT NULL |
| `created_at` | DATETIME |

---

## 14. Prisma enum additions

```prisma
enum InsuranceAppStatus {
  draft
  quoted
  submitted
  under_review
  issued
  rejected
  expired
}

enum InsuranceVehicleType {
  car
  bike
}

enum InsurancePlanType {
  third_party
  comprehensive
  zero_dep
  own_damage
}
```

Map to VARCHAR in MySQL if enum migration is heavy—app enforces values either way.

---

## 15. Apply commands

```powershell
cd backend
npx prisma validate
# Review PHASE-D-PLAN.md + this file
npx prisma db push
npx prisma generate
```

**Optional backfill:**

```sql
UPDATE insurance_applications
SET annual_premium = CAST(premium AS UNSIGNED)
WHERE annual_premium IS NULL AND premium IS NOT NULL;
```

---

## 16. Rollback

| Environment | Action |
|-------------|--------|
| **App only** | Disable `FEATURE_INSURANCE_*` flags |
| **Dev DB** | Restore backup before D0 |
| **Production** | Do not drop columns; idle tables are safe |

---

## 17. Feature flags (no DB)

See `PHASE-D-PLAN.md` — `FEATURE_INSURANCE_*` / `VITE_FEATURE_INSURANCE_*`.
