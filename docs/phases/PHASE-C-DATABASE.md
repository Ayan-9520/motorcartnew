# Phase C — Database Changes (review before `db push`)

**Rules:** Additive only. No drops. No route changes. Align Prisma with MySQL production schema used by finance UI.

---

## 0. Problem statement

`finance_applications` in **Prisma today**:

```prisma
amount, tenure, bankId, status, metadata  // minimal
```

**Frontend / SQL reference** expects: `loan_amount`, `tenure_months`, `dsa_agent_id`, `documents`, `emi_amount`, etc.

Phase C **adds columns** (and keeps writing `metadata` for backward compatibility during transition).

---

## 1. `finance_applications` — column additions

| Column | MySQL type | Default | Maps from legacy |
|--------|------------|---------|------------------|
| `loan_amount` | DECIMAL(12,2) | — | `amount` |
| `tenure_months` | INT | — | `tenure` |
| `vehicle_id` | CHAR(36) NULL | NULL | `metadata.vehicle_id` |
| `dsa_agent_id` | CHAR(36) NULL | NULL | assign on submit |
| `interest_rate` | DECIMAL(5,2) NULL | NULL | metadata |
| `emi_amount` | DECIMAL(12,2) NULL | NULL | metadata |
| `ai_eligibility_score` | INT NULL | NULL | metadata |
| `approval_probability` | INT NULL | NULL | metadata |
| `cibil_score` | INT NULL | NULL | metadata |
| `monthly_income` | BIGINT NULL | NULL | metadata |
| `employment_type` | VARCHAR(32) NULL | `salaried` | metadata |
| `application_type` | VARCHAR(32) NOT NULL | `new_loan` | metadata |
| `applicant_metadata` | JSON | `{}` | metadata blob |
| `documents` | JSON | `[]` | metadata |
| `notes` | TEXT NULL | NULL | — |
| `refinance_application_id` | CHAR(36) NULL | NULL | optional |
| `soft_approval_status` | VARCHAR(24) NOT NULL | `none` | new |
| `soft_approved_at` | DATETIME NULL | NULL | new |
| `comparison_session_id` | CHAR(36) NULL | NULL | new |

**Indexes (additive):**

- `(user_id, created_at DESC)`
- `(dsa_agent_id, status)`
- `(bank_id, status)`
- `(soft_approval_status)`
- `(comparison_session_id)`

**Enum values for `soft_approval_status` (app-enforced):**  
`none`, `pending`, `pre_approved`, `declined`, `expired`

**Prisma:** keep existing `FinanceStatus` on `status`; add optional `SoftApprovalStatus` enum.

**Migration note:** After `db push`, run one-time SQL (optional):

```sql
UPDATE finance_applications
SET loan_amount = amount, tenure_months = tenure
WHERE loan_amount IS NULL AND amount IS NOT NULL;
```

---

## 2. `finance_lender_offers` (new)

Multi-lender comparison results.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `application_id` | UUID NULL FK → finance_applications | Set when user picks a lender |
| `comparison_session_id` | UUID NOT NULL | Groups offers from one compare run |
| `bank_id` | UUID NOT NULL FK → banks | |
| `user_id` | UUID NOT NULL FK → users | Who ran compare |
| `loan_amount` | DECIMAL(12,2) | |
| `tenure_months` | INT | |
| `effective_rate` | DECIMAL(5,2) | |
| `emi_amount` | DECIMAL(12,2) | |
| `total_interest` | DECIMAL(12,2) NULL | |
| `approval_probability` | INT NULL | |
| `rank` | INT NOT NULL | 1 = best |
| `is_selected` | BOOLEAN DEFAULT false | User chose this offer |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Indexes:** `(comparison_session_id)`, `(application_id)`, `(user_id, created_at)`.

---

## 3. `finance_eligibility_checks` (new)

Server eligibility engine audit (no raw PII beyond bands).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `user_id` | UUID NULL | Guest flows NULL |
| `monthly_income_band` | VARCHAR(16) | e.g. `50k-100k` |
| `existing_emi` | BIGINT | |
| `loan_amount` | DECIMAL(12,2) | |
| `tenure_months` | INT | |
| `cibil_band` | VARCHAR(16) | e.g. `700-749` |
| `employment_type` | VARCHAR(32) | |
| `eligible` | BOOLEAN | |
| `max_loan` | BIGINT | |
| `max_emi` | BIGINT | |
| `message` | VARCHAR(512) | |
| `recommended_tenure` | INT NULL | |
| `engine_version` | VARCHAR(16) DEFAULT `v1` | |
| `metadata` | JSON | per-lender breakdown optional |
| `created_at` | DATETIME | |

---

## 4. `finance_application_documents` (new)

Links uploads to applications (replaces JSON-only long term; JSON kept for compat).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `application_id` | UUID FK | |
| `user_id` | UUID FK | uploader |
| `doc_type` | VARCHAR(32) | pan, aadhaar, salary, … |
| `file_name` | VARCHAR(255) | |
| `file_url` | VARCHAR(512) | from `/api/upload` |
| `status` | VARCHAR(24) DEFAULT `uploaded` | uploaded, verified, rejected |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

**Index:** `(application_id)`.

---

## 5. `finance_soft_approvals` (new)

Audit trail for soft approval workflow.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `application_id` | UUID FK | |
| `bank_id` | UUID FK | lender |
| `acted_by` | UUID FK → users | lender user |
| `decision` | VARCHAR(24) | pre_approved, declined |
| `note` | TEXT NULL | |
| `expires_at` | DATETIME NULL | soft offers expire |
| `created_at` | DATETIME | |

---

## 6. `finance_crm_tasks` (new)

DSA / lender CRM tasks.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `application_id` | UUID NULL FK | |
| `lead_id` | UUID NULL FK → finance_leads | |
| `assigned_to` | UUID NULL | user id |
| `dsa_agent_id` | UUID NULL | |
| `bank_id` | UUID NULL | lender context |
| `task_type` | VARCHAR(32) | callback, doc_chase, … |
| `title` | VARCHAR(255) | |
| `due_at` | DATETIME NULL | |
| `status` | VARCHAR(24) DEFAULT `pending` | |
| `metadata` | JSON | |
| `created_at` | DATETIME | |

---

## 7. Align existing tables (Prisma ↔ SQL `00013`)

### `finance_commissions`

| Column | Type | Notes |
|--------|------|-------|
| `application_id` | UUID NOT NULL | FK |
| `dsa_agent_id` | UUID NOT NULL | FK |
| `loan_amount` | BIGINT | |
| `commission_rate` | DECIMAL(5,2) | |
| `commission_amount` | BIGINT | |
| `status` | VARCHAR | pending, approved, paid, cancelled |
| `paid_at` | DATETIME NULL | |

Replace minimal Prisma model (`userId`, `amount` only).

### `finance_leads`

Align with SQL: `assigned_dsa_id`, `application_id`, `phone`, `source`, `customer_name`, etc.

### `finance_status_history`

Add: `from_status`, `to_status`, `changed_by` (UUID NULL), keep `note`.

### `finance_verifications`

Add: `check_type` (identity, income, cibil, bank_statement), `status`, `reviewed_at`.

### `banks`

Add: `ranking_score` INT, `min_cibil` INT, `short_code` VARCHAR(16).

### `dsa_agents`

Add: `total_disbursed` BIGINT DEFAULT 0 (for round-robin assign).

---

## 8. Apply commands

```powershell
cd backend
npx prisma validate
# Review PHASE-C-PLAN.md + this file
npx prisma db push
npx prisma generate
```

**Rollback (dev):** Restore MySQL dump; revert `schema.prisma`; flags off in app.

**Production:** Take backup before push; do not drop new columns if rolling back code only.

---

## 9. Feature flags (no DB)

See `PHASE-C-PLAN.md` — `FEATURE_FINANCE_*` / `VITE_FEATURE_FINANCE_*`.
