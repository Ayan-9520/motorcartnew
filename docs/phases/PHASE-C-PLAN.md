# Phase C — Finance Marketplace Architecture (approval before code)

**Constraints (non-negotiable):** Additive only · backward compatible · **no existing route changes** · **no UI redesign** · feature flags · database changes documented before `db push`.

**Current state:** Finance hub UI, DSA/lender/manager dashboards, EMI/eligibility/compare/apply pages, and document upload **already exist**. Data flows through Supabase client + RPC (`submit_finance_application`, `advance_finance_application`) with **mock fallbacks**. Prisma `FinanceApplication` is **narrow** (`amount`, `tenure`, `metadata`) while MySQL/Supabase SQL and `DbFinanceApplication` expect **full columns** (`loan_amount`, `dsa_agent_id`, `documents`, etc.).

---

## Why (business + technical)

| Driver | Explanation |
|--------|-------------|
| **Product** | MotorCart markets itself as a finance marketplace; customers need one application, many lenders, traceable status, and DSA/lender ops without leaving the platform. |
| **Data integrity** | Today, apps created via Next RPC store finance fields only in `metadata` JSON; UI and SQL migrations assume **first-class columns**. That causes silent mismatches when listing/filtering applications. |
| **Ops scale** | DSA assignment, commission on disburse, and status history exist in **Postgres migration reference SQL** but are only **partially** implemented in Prisma RPC. Phase C makes MySQL the single source of truth with dedicated REST APIs. |
| **Safety** | Soft approval (pre-qualification without hard credit pull) and eligibility snapshots need auditable tables—not ad hoc JSON. |
| **Compatibility** | Feature flags let production keep mock/Supabase paths while staging enables the new `/api/finance/*` stack. |

---

## Feature map (10 requirements → architecture)

| # | Requirement | Existing UI (unchanged) | Phase C deliverable |
|---|-------------|-------------------------|---------------------|
| 1 | Customer finance application | `LoanApplyPage`, `LoanApplicationForm` | `POST /api/finance/applications` + align Prisma create with SQL columns; RPC fallback retained |
| 2 | Multi-lender comparison | `LoanComparePage`, `LoanComparisonTable`, `useFinanceMarketplace` | `POST /api/finance/compare` → persist `finance_lender_offers`; read via `GET .../offers` |
| 3 | Eligibility engine | `EligibilityChecker`, `lib/eligibility.ts` (client) | `POST /api/finance/eligibility` — server rules + optional per-lender matrix; log to `finance_eligibility_checks` |
| 4 | Soft approval workflow | `ApprovalPipelineBoard`, lender grids (mock) | `soft_approval_status` on application + `finance_soft_approvals` audit; lender `PATCH` pre-approve/decline |
| 5 | EMI calculator | `EmiCalculatorWidget`, `lib/emi-utils.ts` | `GET /api/finance/emi/calculate` (validation only); **UI keeps local math** when flag off |
| 6 | DSA CRM | `DsaPortalPage`, `DsaLeadsPage`, `DsaApplicationsPage` | `GET /api/finance/dsa/*` — apps, leads, tasks scoped to `dsa_agent_id` |
| 7 | Lender CRM | `LenderDashboardPage`, `LenderApplicationsPage` | `GET/PATCH /api/finance/lender/*` — bank-scoped via user `metadata.bank_id` / `bank_slug` |
| 8 | Commission tracking | `CommissionLedger`, DSA commissions page | Align `finance_commissions` Prisma model with SQL; `GET /api/finance/commissions` |
| 9 | Loan status tracking | `ApplicationStatusTracker`, `VerificationTracker` | `GET /api/finance/applications/:id/timeline` (status history + verifications) |
| 10 | Document upload | `DocumentUpload`, storage bucket pattern | `POST /api/finance/applications/:id/documents` using existing `POST /api/upload` + `finance_application_documents` rows |

---

## Impact

### Positive

- Single REST surface for finance (easier mobile/partner integrations later).
- Customer applications readable by DSA/lender dashboards without JSON parsing hacks.
- Status/commission/soft-approval auditable for compliance demos.
- Eligibility and compare results stored for analytics and AI tuning.

### Scope of change (by layer)

| Layer | Impact |
|-------|--------|
| **Database** | Additive columns on `finance_applications`; new tables (offers, eligibility logs, documents, soft approvals); extend `finance_commissions`, `finance_leads`, `banks` |
| **Backend** | New `backend/src/app/api/finance/**` routes; extend `rpc-handlers.ts` to write aligned columns; `feature-flags` finance group |
| **Frontend** | **Service layer only** (`finance.service.ts`, optional thin `finance-api.service.ts`); existing pages/hooks call same functions |
| **Routes** | **None** — `/finance/*`, `/dashboard/dsa/*`, `/dashboard/customer/loans/*` unchanged |
| **UI** | **None** — no layout/CSS/component structure changes |

### Backward compatibility

| Path | Behavior when `FEATURE_FINANCE_MARKETPLACE=false` |
|------|---------------------------------------------------|
| Submit application | Current `supabase.rpc('submit_finance_application')` + mock |
| Lists / detail | Current `supabase.from('finance_applications')` + demo data |
| EMI / eligibility | Existing client-side `eligibility.ts` / `emi-utils.ts` |
| Documents | Supabase storage + JSON `documents` column |

When flag **true** and `VITE_API_URL` set: try REST first, fall back to Supabase/mock on error (same pattern as Phase B wishlist).

---

## Risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Prisma ↔ MySQL column drift** | High | C0 migration: add columns with defaults; dual-read `metadata` during transition; one-time backfill script optional |
| **Duplicate submission** (RPC + REST) | Med | Idempotency key header optional in C1; UI uses one code path based on flag |
| **Lender scope leakage** | High | Every lender route resolves `bank_id` from JWT user metadata; integration tests for `bank_nbfc` role |
| **DSA sees wrong leads** | Med | Filter strictly on `dsa_agent_id`; assign via existing round-robin logic in service |
| **Soft approval confused with final approval** | Med | Separate enum + UI copy unchanged but API returns both `status` and `soft_approval_status` |
| **PII in eligibility logs** | Med | Store hashed/reg truncated income band, not raw Aadhaar; documents via upload service only |
| **Commission double-pay** | Med | Unique constraint `(application_id)` on commissions; disburse handler checks existing row (mirror SQL migration) |
| **Breaking admin finance** | Low | Admin routes unchanged; extend `listFinanceApplicationsForAdmin` to read new columns |
| **No UI redesign pressure** | Low | Explicit rule in PR checklist; only `finance.service.ts` diffs in frontend feature folder |

---

## Database changes (review before `db push`)

Documented in detail in **[PHASE-C-DATABASE.md](./PHASE-C-DATABASE.md)** (create alongside approval).

### Summary

**A. Align `finance_applications` (additive columns, keep `amount`/`tenure` deprecated aliases optional)**

| Column | Type | Notes |
|--------|------|-------|
| `loan_amount` | DECIMAL(12,2) | Mirror `amount` or migrate |
| `tenure_months` | INT | Mirror `tenure` |
| `vehicle_id` | UUID NULL | |
| `dsa_agent_id` | UUID NULL | FK `dsa_agents` |
| `interest_rate`, `emi_amount` | DECIMAL | |
| `ai_eligibility_score`, `approval_probability` | INT NULL | |
| `cibil_score`, `monthly_income` | INT/BIGINT NULL | |
| `employment_type`, `application_type` | VARCHAR | |
| `applicant_metadata`, `documents` | JSON | |
| `notes` | TEXT NULL | |
| `soft_approval_status` | ENUM `none\|pending\|pre_approved\|declined\|expired` | Default `none` |
| `soft_approved_at` | DATETIME NULL | |
| `comparison_session_id` | UUID NULL | Groups multi-lender compare |

**B. New tables**

| Table | Purpose |
|-------|---------|
| `finance_lender_offers` | Per bank offer for an application/session (rate, EMI, prob, rank) |
| `finance_eligibility_checks` | Server eligibility run audit |
| `finance_application_documents` | Doc metadata linked to `uploaded_files` / URL |
| `finance_soft_approvals` | Soft approval events (who, when, note) |
| `finance_crm_tasks` | DSA/lender tasks (callback, doc chase) |

**C. Extend existing Prisma models (match SQL migrations)**

| Model | Changes |
|-------|---------|
| `FinanceCommission` | Add `applicationId`, `dsaAgentId`, `loanAmount`, `commissionRate`, `commissionAmount`, `paidAt` |
| `FinanceLead` | Add `assignedDsaId`, `applicationId`, phone, source, etc. per `00013` SQL |
| `FinanceVerification` | Add `checkType`, `from_status`/`to_status` on history if missing |
| `FinanceStatusHistory` | Add `fromStatus`, `changedBy` |
| `Bank` | Add `rankingScore`, `minCibil`, `shortCode` (SQL already has) |
| `DsaAgent` | Add `totalDisbursed` if used for round-robin |

**D. No drops, no enum removals**

Existing `FinanceStatus` values preserved: `draft`, `submitted`, `processing`, `approved`, `rejected`, `disbursed`.

---

## Proposed API surface (new routes only)

```
GET    /api/finance/lenders                    # active banks (public)
POST   /api/finance/eligibility               # body: income, cibil, amount, tenure
GET    /api/finance/emi/calculate             # query: principal, rate, tenure
POST   /api/finance/compare                   # multi-lender offers → session
POST   /api/finance/applications              # customer submit
GET    /api/finance/applications              # mine (customer) | role-scoped
GET    /api/finance/applications/:id
GET    /api/finance/applications/:id/timeline
GET    /api/finance/applications/:id/offers
POST   /api/finance/applications/:id/documents
PATCH  /api/finance/applications/:id/soft-approval   # lender only
PATCH  /api/finance/applications/:id/status            # advance workflow (staff)

GET    /api/finance/dsa/overview
GET    /api/finance/dsa/applications
GET    /api/finance/dsa/leads
GET    /api/finance/dsa/commissions

GET    /api/finance/lender/overview
GET    /api/finance/lender/applications
PATCH  /api/finance/lender/applications/:id

GET    /api/finance/commissions                # manager / admin
```

Existing routes **unchanged:** `/api/db/query`, `/api/db/rpc/*`, `/api/admin/finance/*`, `/api/upload`.

---

## Feature flags

| Backend env | Frontend env | Gates |
|-------------|--------------|-------|
| `FEATURE_FINANCE_MARKETPLACE` | `VITE_FEATURE_FINANCE_MARKETPLACE` | Master switch for REST finance APIs |
| `FEATURE_FINANCE_ELIGIBILITY_API` | `VITE_FEATURE_FINANCE_ELIGIBILITY_API` | Server eligibility + logging |
| `FEATURE_FINANCE_COMPARE_API` | `VITE_FEATURE_FINANCE_COMPARE_API` | Persisted multi-lender compare |
| `FEATURE_FINANCE_SOFT_APPROVAL` | `VITE_FEATURE_FINANCE_SOFT_APPROVAL` | Soft approval columns + lender PATCH |
| `FEATURE_FINANCE_DOCUMENTS_API` | `VITE_FEATURE_FINANCE_DOCUMENTS_API` | Document rows + upload linkage |

**Default when unset:** `true` in dev (match Phase B); production can set `false` until QA passes.

---

## Files (expected touch list)

### Documentation

| File | Action |
|------|--------|
| `PHASE-C-PLAN.md` | This file |
| `PHASE-C-DATABASE.md` | Full DDL / Prisma notes (created on approval) |

### Backend — schema & config

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Extend finance models + new tables |
| `backend/src/config/feature-flags.ts` | Add finance flags |
| `backend/src/lib/db/table-map.ts` | Map new table names |
| `backend/.env.example` | Document flags |

### Backend — services

| File | Action |
|------|--------|
| `backend/src/services/finance-marketplace.service.ts` | **New** — applications, compare, eligibility |
| `backend/src/services/finance-dsa.service.ts` | **New** — DSA CRM queries |
| `backend/src/services/finance-lender.service.ts` | **New** — lender CRM + soft approval |
| `backend/src/services/finance-commission.service.ts` | **New** — commission ledger |
| `backend/src/lib/db/rpc-handlers.ts` | Update `submitFinanceApplication` / `advanceFinanceApplication` to use columns |
| `backend/src/services/platform-admin.service.ts` | Read aligned fields (minor) |

### Backend — API routes (all new under `api/finance/`)

| Path | Action |
|------|--------|
| `backend/src/app/api/finance/lenders/route.ts` | |
| `backend/src/app/api/finance/eligibility/route.ts` | |
| `backend/src/app/api/finance/emi/calculate/route.ts` | |
| `backend/src/app/api/finance/compare/route.ts` | |
| `backend/src/app/api/finance/applications/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/timeline/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/offers/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/documents/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/soft-approval/route.ts` | |
| `backend/src/app/api/finance/applications/[id]/status/route.ts` | |
| `backend/src/app/api/finance/dsa/overview/route.ts` | |
| `backend/src/app/api/finance/dsa/applications/route.ts` | |
| `backend/src/app/api/finance/dsa/leads/route.ts` | |
| `backend/src/app/api/finance/dsa/commissions/route.ts` | |
| `backend/src/app/api/finance/lender/overview/route.ts` | |
| `backend/src/app/api/finance/lender/applications/route.ts` | |
| `backend/src/app/api/finance/lender/applications/[id]/route.ts` | |
| `backend/src/app/api/finance/commissions/route.ts` | |

### Frontend — service layer only (no page/route edits)

| File | Action |
|------|--------|
| `frontend/src/config/feature-flags.ts` | Finance flags |
| `frontend/.env.production.example` | VITE finance flags |
| `frontend/src/features/finance/services/finance.service.ts` | REST-first wrappers, keep signatures |
| `frontend/src/features/finance/services/finance-api.service.ts` | **New** optional — raw API calls |
| `frontend/src/types/database.ts` | Only if generated types drift (minimal) |

### Explicitly out of scope (Phase C)

- `frontend/src/router/index.tsx` — **no edits**
- Finance page/components CSS/layout — **no edits**
- Removing Supabase RPC or mock data — **no**

---

## Implementation packages (approve one at a time)

| Package | Contents | Depends on |
|---------|----------|------------|
| **C0** | `PHASE-C-DATABASE.md` + Prisma + `db push` + table-map + flags | Approval of DDL |
| **C1** | Customer application + timeline + status history alignment | C0 |
| **C2** | Eligibility API + EMI calculate API | C0 |
| **C3** | Multi-lender compare + `finance_lender_offers` | C0, C2 |
| **C4** | Soft approval workflow | C0, C1 |
| **C5** | Document upload API + `finance_application_documents` | C0, C1, `/api/upload` |
| **C6** | DSA CRM endpoints + wire `finance.service` DSA methods | C0, C1 |
| **C7** | Lender CRM + soft approval PATCH | C0, C4 |
| **C8** | Commission tracking alignment + endpoints | C0, C1 |
| **C9** | Frontend service fallbacks + smoke test checklist | C1–C8 |

---

## Rollback plan

| Step | Action |
|------|--------|
| 1 | Set `FEATURE_FINANCE_MARKETPLACE=false` and `VITE_FEATURE_FINANCE_MARKETPLACE=false` — instant revert to Supabase/RPC/mock |
| 2 | Redeploy previous backend build (no new routes required at runtime) |
| 3 | **DB:** Do not drop columns in production. If C0 was applied, leave columns in place (harmless). Dev-only: restore DB backup taken before `db push` |
| 4 | Remove or skip new Prisma models in code while keeping DB tables empty (optional cleanup later) |
| 5 | Git revert merge commit for Phase C branch |

**Safe point:** Flags off = identical behavior to pre–Phase C for end users.

---

## Verification checklist (post-implementation)

- [ ] Guest/customer: apply loan on `/finance/apply` — success with flag on/off
- [ ] Compare page returns ≥3 offers; persisted when compare API on
- [ ] Eligibility tool matches server within tolerance when API on
- [ ] Customer `/dashboard/customer/loans/:id` shows timeline from API
- [ ] DSA dashboard lists only assigned applications
- [ ] Lender dashboard scoped to one bank; soft approve does not set `status=approved`
- [ ] Disburse creates single commission row
- [ ] Document upload visible in application JSON + documents table
- [ ] `npm run build` (frontend) passes
- [ ] No router diff except accidental — CI grep `router/index.tsx`

---

## Approval requested

Reply with one of:

- **Approve C0** — publish `PHASE-C-DATABASE.md` and apply schema only  
- **Approve C0 + C1** — schema + customer application APIs  
- **Approve all packages** — full Phase C implementation sequence  

No code will be written until you approve at least **C0**.
