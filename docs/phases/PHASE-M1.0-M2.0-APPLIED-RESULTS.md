# Phase M1.0 + M2.0 — Applied Results

**Date:** 2026-06-04  
**Approval:** M1.0 Unified Identity Context + M2.0 Business Hub  
**Reference:** [PHASE-M1-UNIFIED-ECOSYSTEM-PLAN.md](./PHASE-M1-UNIFIED-ECOSYSTEM-PLAN.md)

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push | ✅ |
| No breaking changes | ✅ (new routes only; `/community/business/:slug` unchanged) |
| No Dealer / Broker / Auction / Finance / Insurance module edits | ✅ |
| Feature flags default OFF → 404 | ✅ |

---

## 2. M1.0 — Unified Identity Context

### API

| Method | Path | Auth | Flag |
|--------|------|------|------|
| GET | `/api/ecosystem/context` | Bearer JWT required | `FEATURE_M1_UNIFIED_IDENTITY` |

### Response shape (`data`)

| Key | Source |
|-----|--------|
| `user` | `users` (formatAuthUser) |
| `roles` | `primary`, `app_role`, `community_role_assignments`, `business_entity_types` |
| `business_profiles` | `community_business_profiles` (owner) |
| `community_profiles` | `community_user_profiles` (0–1) |
| `growth_workspaces` | `growth_workspaces` (non-archived) |
| `directory_profiles` | Mapped directory view per business + `directory_path` |

### Frontend client

- `frontend/src/integrations/api/ecosystem.ts` — `fetchEcosystemContextApi()` (for post-login / switcher wiring later)

---

## 3. M2.0 — Business Hub

### API

| Method | Path | Auth | Flag |
|--------|------|------|------|
| GET | `/api/business-hub/:slug` | Optional Bearer (follow state) | `FEATURE_M2_UNIFIED_BUSINESS` |

### Response aggregate (`data`)

| Section | Content |
|---------|---------|
| `community_business_profile` | Community map |
| `directory_listing` | Full directory map + category path |
| `growth_workspace` | Linked workspace summary or null |
| `counts` | `vehicles`, `auctions`, `followers` |
| `read_only` | `true` |

**Counts logic (read-only queries):**

- **Vehicles:** `dealer` + `entity_id` → count by `dealer_id`; else count by `seller_id` = owner
- **Auctions:** `dealer` + `entity_id` → `dealer_auction_entries` count; else `0`
- **Followers:** `follower_count` on business profile

### UI

| Route | Page |
|-------|------|
| `/business/:slug` | `BusinessHubPage` (read-only hub) |

Does not replace `/community/business/:slug` or `/directory/:category/:slug`.

---

## 4. Feature flags

### Backend

```env
FEATURE_M1_UNIFIED_IDENTITY=false
FEATURE_M2_UNIFIED_BUSINESS=false
```

### Frontend

```env
VITE_FEATURE_M1_UNIFIED_IDENTITY=false
VITE_FEATURE_M2_UNIFIED_BUSINESS=false
```

---

## 5. Files added

### Backend

- `src/lib/ecosystem/guard.ts`
- `src/services/ecosystem-context.service.ts`
- `src/services/business-hub.service.ts`
- `src/app/api/ecosystem/context/route.ts`
- `src/app/api/business-hub/[slug]/route.ts`
- `scripts/smoke-m1-m2.ts`

### Frontend

- `src/integrations/api/ecosystem.ts`
- `src/features/business-hub/services/business-hub-api.service.ts`
- `src/features/business-hub/pages/BusinessHubPage.tsx`
- `src/features/business-hub/index.ts`

---

## 6. Files modified

- `backend/src/config/feature-flags.ts`
- `backend/.env.example`
- `frontend/src/config/feature-flags.ts`
- `frontend/.env.example`
- `frontend/src/router/index.tsx`
- `frontend/src/auth/workspace-redirect.ts`

---

## 7. Smoke tests

```bash
cd backend
npx tsx scripts/smoke-m1-m2.ts
```

**Flags OFF (default):**

| Path | Expected |
|------|----------|
| `/api/ecosystem/context` | 404 |
| `/api/business-hub/demo-dealer` | 404 |
| `/api/health` | 200 |

**Flags ON:** restart API; `context` needs valid JWT (401 without token); `business-hub/:slug` returns 200 or 404 if slug missing.

---

## 8. Rollback plan

1. Set `FEATURE_M1_UNIFIED_IDENTITY` and `FEATURE_M2_UNIFIED_BUSINESS` to `false` (and Vite equivalents).
2. Restart backend + frontend.
3. Routes return 404; remove nav links to `/business/:slug` if any were added manually.
4. No migration rollback required.

---

## 9. Next steps (not in this phase)

- M1.1 workspace switcher UI consuming `fetchEcosystemContextApi`
- M2.1 provisioning on business approval
- Link from directory profile → `/business/:slug` when M2 flag on

**Status:** Ready for review.
