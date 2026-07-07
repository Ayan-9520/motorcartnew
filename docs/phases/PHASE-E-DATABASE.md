# Phase E — Database Changes (review before `db push`)

**E0 status:** Schema applied in repo · **`db push` pending** — see [PHASE-E-SCHEMA-DIFF.md](./PHASE-E-SCHEMA-DIFF.md)

**Rules:** Additive only. **New `broker_*` tables only.** No changes to `leads`, `dealer_leads`, `crm_tasks`, or dealer-related columns.

---

## 1. `AppRole` enum — additive value

```prisma
enum AppRole {
  // ... existing values ...
  broker   // NEW
}
```

Signup metadata: `business_category: "vehicle_broker"` → role `broker` (app mapping, no dealer table FK).

---

## 2. `brokers` — broker organization profile

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `owner_id` | UUID FK → users | |
| `name` | VARCHAR(128) | Agency name |
| `slug` | VARCHAR(64) UNIQUE | |
| `license_number` | VARCHAR(64) NULL | RTO broker license |
| `city` | VARCHAR(64) | |
| `state` | VARCHAR(64) | |
| `phone` | VARCHAR(20) NULL | Business line |
| `whatsapp_number` | VARCHAR(20) NULL | WA Business |
| `email` | VARCHAR(128) NULL | |
| `commission_default_rate` | DECIMAL(5,2) DEFAULT 2.00 | % on deal |
| `is_verified` | BOOLEAN DEFAULT false | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(owner_id)`.

---

## 3. `broker_buyers` — buyer management

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK → brokers | |
| `full_name` | VARCHAR(128) | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(128) NULL | |
| `city` | VARCHAR(64) NULL | |
| `budget_min` | BIGINT NULL | |
| `budget_max` | BIGINT NULL | |
| `preferred_brands` | JSON | `[]` |
| `preferred_fuel` | VARCHAR(32) NULL | |
| `notes` | TEXT NULL | |
| `status` | VARCHAR(24) DEFAULT active | active, archived |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(broker_id, phone)`, `(broker_id, status)`.

---

## 4. `broker_sellers` — seller management

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `full_name` | VARCHAR(128) | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(128) NULL | |
| `city` | VARCHAR(64) NULL | |
| `seller_type` | VARCHAR(24) | individual, dealer, fleet |
| `kyc_status` | VARCHAR(24) DEFAULT pending | |
| `notes` | TEXT NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(broker_id, phone)`.

---

## 5. `broker_leads` — lead management (isolated from `leads`)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `buyer_id` | UUID NULL FK → broker_buyers | |
| `seller_id` | UUID NULL FK → broker_sellers | |
| `name` | VARCHAR(128) | |
| `phone` | VARCHAR(20) | |
| `email` | VARCHAR(128) NULL | |
| `source` | VARCHAR(32) | manual, website, whatsapp, marketplace_bridge |
| `status` | VARCHAR(24) | new, contacted, qualified, converted, lost |
| `vehicle_interest` | VARCHAR(255) NULL | |
| `vehicle_id` | UUID NULL | read-only ref, no FK enforce on vehicles if mock |
| `vehicle_slug` | VARCHAR(128) NULL | |
| `sale_mode` | VARCHAR(32) NULL | broker_assisted, etc. |
| `assigned_to` | UUID NULL | user id |
| `notes` | TEXT NULL | |
| `metadata` | JSON | includes `marketplace_lead_id` if bridged |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(broker_id, status)`, `(broker_id, created_at)`.

**Bridge rule:** Insert only; never update `leads` table.

---

## 6. `broker_deals` — deal pipeline

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `lead_id` | UUID NULL FK → broker_leads | |
| `buyer_id` | UUID NULL FK → broker_buyers | |
| `seller_id` | UUID NULL FK → broker_sellers | |
| `title` | VARCHAR(255) | e.g. "Hyundai Creta 2022" |
| `stage` | VARCHAR(32) | inquiry, negotiation, token, documentation, closed, lost |
| `deal_value` | BIGINT NULL | Agreed price |
| `token_amount` | BIGINT NULL | |
| `expected_close_at` | DATE NULL | |
| `closed_at` | DATETIME NULL | |
| `lost_reason` | VARCHAR(255) NULL | |
| `commission_rate` | DECIMAL(5,2) NULL | override broker default |
| `commission_amount` | BIGINT NULL | computed on close |
| `assigned_to` | UUID NULL | |
| `notes` | TEXT NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(broker_id, stage)`, `(broker_id, closed_at)`.

---

## 7. `broker_deal_vehicles` — vehicle assignment

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `deal_id` | UUID FK → broker_deals | |
| `vehicle_id` | UUID NULL | platform vehicle |
| `vehicle_slug` | VARCHAR(128) NULL | mock catalog fallback |
| `is_primary` | BOOLEAN DEFAULT false | |
| `listing_title` | VARCHAR(255) NULL | snapshot |
| `listing_price` | BIGINT NULL | snapshot at assign time |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Index:** `(deal_id)`, `(vehicle_id)`.

**Constraint:** Application layer must **not** UPDATE `vehicles.dealer_id` / `seller_id`.

---

## 8. `broker_deal_stage_history` — pipeline audit

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `deal_id` | UUID FK | |
| `from_stage` | VARCHAR(32) NULL | |
| `to_stage` | VARCHAR(32) | |
| `changed_by` | UUID NULL | |
| `note` | TEXT NULL | |
| `created_at` | DATETIME | |

---

## 9. `broker_tasks` — follow-up tasks (isolated from `crm_tasks`)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `lead_id` | UUID NULL | |
| `deal_id` | UUID NULL | |
| `assigned_to` | UUID NULL | |
| `task_type` | VARCHAR(32) | callback, whatsapp, site_visit, doc_collect |
| `title` | VARCHAR(255) | |
| `description` | TEXT NULL | |
| `due_at` | DATETIME NULL | |
| `status` | VARCHAR(24) DEFAULT pending | pending, done, cancelled |
| `priority` | VARCHAR(16) DEFAULT normal | |
| `completed_at` | DATETIME NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Index:** `(broker_id, due_at)`, `(broker_id, status)`.

---

## 10. `broker_commissions` — commission tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `deal_id` | UUID UNIQUE FK | one commission per closed deal |
| `deal_value` | BIGINT | |
| `commission_rate` | DECIMAL(5,2) | |
| `commission_amount` | BIGINT | |
| `status` | VARCHAR(24) | pending, approved, paid, cancelled |
| `paid_at` | DATETIME NULL | |
| `payout_reference` | VARCHAR(64) NULL | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Index:** `(broker_id, status)`.

---

## 11. `broker_lead_notes` — lead activity

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `lead_id` | UUID FK | |
| `broker_id` | UUID FK | |
| `author_id` | UUID NULL | |
| `body` | TEXT | |
| `created_at` | DATETIME | |

---

## 12. WhatsApp integration architecture (tables only in E0–E8)

### `broker_whatsapp_configs`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID UNIQUE FK | |
| `provider` | VARCHAR(32) | meta, gupshup, twilio, manual |
| `business_phone` | VARCHAR(20) | |
| `webhook_secret` | VARCHAR(128) NULL | verify inbound |
| `api_config` | JSON | encrypted refs only in prod |
| `is_active` | BOOLEAN DEFAULT true | |
| `created_at` | DATETIME | |

### `broker_whatsapp_templates`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `template_key` | VARCHAR(64) | follow_up, price_share, token_reminder |
| `name` | VARCHAR(128) | |
| `body` | TEXT | with `{buyer}`, `{vehicle}` placeholders |
| `language` | VARCHAR(8) DEFAULT en | |
| `provider_template_id` | VARCHAR(64) NULL | BSP id when approved |
| `status` | VARCHAR(24) DEFAULT draft | draft, approved, rejected |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

### `broker_whatsapp_messages`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `broker_id` | UUID FK | |
| `lead_id` | UUID NULL | |
| `deal_id` | UUID NULL | |
| `direction` | VARCHAR(8) | inbound, outbound |
| `provider_message_id` | VARCHAR(128) NULL UNIQUE | idempotency |
| `phone` | VARCHAR(20) | |
| `body` | TEXT | |
| `status` | VARCHAR(24) | queued, sent, delivered, read, failed |
| `metadata` | JSON | raw webhook payload |
| `created_at` | DATETIME | |

**Index:** `(broker_id, created_at)`, `(lead_id)`.

**Phase E scope:** Store templates + log messages; outbound send is **stub/queue** (no BSP credentials required for rollout).

---

## 13. Optional future (not E0–E9)

| Table | Purpose |
|-------|---------|
| `broker_members` | Staff users under broker org |
| `broker_documents` | KYC / deal paperwork |

Defer until post-pilot.

---

## 14. Apply commands

```powershell
cd backend
npx prisma validate
# Review PHASE-E-PLAN.md + this file
npx prisma db push
npx prisma generate
```

---

## 15. Rollback

| Level | Action |
|-------|--------|
| App | Disable `FEATURE_BROKER_*` flags |
| DB (dev) | Restore backup; broker tables unused |
| Dealer data | **Never touched** by broker schema |

---

## 16. Feature flags (no DB)

See `PHASE-E-PLAN.md`. Broker flags default **off** until pilot approval.
