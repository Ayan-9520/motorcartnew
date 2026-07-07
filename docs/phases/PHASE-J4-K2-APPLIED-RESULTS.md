# Phase J4 + K2 — Applied Results

**Date:** 2026-06-04  
**Approval:** J4 Advanced Lead Engine + K2 Automotive Business Directory  
**References:** [PHASE-J1-APPLIED-RESULTS.md](./PHASE-J1-APPLIED-RESULTS.md), [PHASE-J2-J3-APPLIED-RESULTS.md](./PHASE-J2-J3-APPLIED-RESULTS.md)

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push | ✅ |
| No Dealer / Broker / Auction / Finance / Insurance / Community / Marketplace **module** edits | ✅ |
| No Razorpay / Meta / real WhatsApp | ✅ |
| J4 Growth-only lead engine (JSON CRM on `growth_lead_capture_events`) | ✅ |
| K2 Directory reads `community_business_profiles` via **new** `/api/directory/*` | ✅ |
| Monetization placeholders only (no billing) | ✅ |

**Note:** K2 **does not modify** files under `backend/src/app/api/community/` or `community/*.service.ts`. Directory uses isolated services that query the same tables.

---

## 2. J4 — Advanced Lead Engine

### 2.1 Pipeline stages

`new` · `contacted` · `qualified` · `interested` · `follow_up` · `won` · `lost`

Stored in `growth_lead_capture_events.payload._crm` (no schema change). Coarse `status` column maps `won`→`qualified`, `lost`→`archived`.

### 2.2 Features

| Feature | Implementation |
|---------|----------------|
| Lead pipeline | List/filter by stage, assignee, source, campaign, search |
| Activities | Notes + typed activities in `_crm` |
| Status history | Append on stage change |
| Follow-up dates | `_crm.follow_up_at` |
| Analytics | Aggregates by stage, source, campaign, form |
| Assignment | `assignee_user_id` / `assignee_name` in `_crm` |

### 2.3 Growth APIs (new)

| Method | Path | Flag slice |
|--------|------|------------|
| GET | `/api/growth/leads/pipeline` | `FEATURE_GROWTH_V2` + `FEATURE_GROWTH_LEADS` + `FEATURE_GROWTH_LEAD_PIPELINE` |
| GET | `/api/growth/leads/analytics` | same |
| GET | `/api/growth/leads/:eventId` | same |
| PATCH | `/api/growth/leads/:eventId` | same |
| POST | `/api/growth/leads/:eventId/notes` | same |
| POST | `/api/growth/leads/:eventId/activities` | same |

Header: `X-Growth-Workspace-Id`

### 2.4 Growth UI pages

| Route | Page |
|-------|------|
| `/dashboard/growth/leads/pipeline` | Pipeline list + stage filters |
| `/dashboard/growth/leads/pipeline/:eventId` | Detail, notes, activities, assignment |
| `/dashboard/growth/leads/analytics` | Source / campaign / stage charts |

---

## 3. K2 — Automotive Business Directory

### 3.1 Categories

| URL segment | Entity type |
|-------------|-------------|
| `/directory/dealers` | `dealer` |
| `/directory/brokers` | `broker` |
| `/directory/dsa` | `dsa` |
| `/directory/insurance` | `insurance_agent` |
| `/directory/workshops` | `workshop` |
| `/directory/parts` | `parts_seller` |
| `/directory/influencers` | `influencer` |

### 3.2 Directory APIs (new)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/directory` | Public — hub + monetization placeholders |
| GET | `/api/directory/search` | Public — `q`, `city`, `state`, `category`, `verified` |
| GET | `/api/directory/:category` | Public — list with filters |
| GET | `/api/directory/:category/:slug` | Public — enhanced profile |
| GET | `/api/directory/business/:slug/feed` | Public — posts by owner |
| POST/DELETE | `/api/directory/business/:slug/follow` | JWT — follow business |
| PATCH | `/api/directory/business/:slug/profile` | JWT — owner metadata (about, services, contact, social) |

Flag: `FEATURE_BUSINESS_DIRECTORY_V2` (default **off** → **404**)

### 3.3 Profile enhancements (metadata + links)

- About, services, contact (in `metadata` JSON)
- Website, phone (columns)
- Social links (`metadata.social_links`)
- Followers (`follower_count` + follow API)
- Business feed (`social_posts` by owner)
- Growth workspace link (`growth_workspaces` matched by `entity_id` + `business_type`)

### 3.4 Future-ready (architecture only)

`DIRECTORY_MONETIZATION_PLACEHOLDERS` in API hub response:

- Featured businesses (disabled)
- Sponsored businesses (disabled)
- Premium listings (disabled)

No Razorpay or listing purchase flows.

### 3.5 Public UI pages

| Route | Page |
|-------|------|
| `/directory` | Hub + cross-search |
| `/directory/:category` | Filtered directory list |
| `/directory/:category/:slug` | Enhanced business profile |

---

## 4. Feature flags

### Backend

```env
FEATURE_GROWTH_LEAD_PIPELINE=false
FEATURE_BUSINESS_DIRECTORY_V2=false
```

Requires existing `FEATURE_GROWTH_V2`, `FEATURE_GROWTH_LEADS`, and `FEATURE_GROWTH_LEAD_PIPELINE` for J4 APIs.

### Frontend

```env
VITE_FEATURE_GROWTH_LEAD_PIPELINE=false
VITE_FEATURE_BUSINESS_DIRECTORY_V2=false
```

---

## 5. Files added

### Backend — J4

- `backend/src/lib/growth/lead-pipeline.ts`
- `backend/src/services/growth-lead-pipeline.service.ts`
- `backend/src/app/api/growth/leads/pipeline/route.ts`
- `backend/src/app/api/growth/leads/analytics/route.ts`
- `backend/src/app/api/growth/leads/[eventId]/route.ts`
- `backend/src/app/api/growth/leads/[eventId]/notes/route.ts`
- `backend/src/app/api/growth/leads/[eventId]/activities/route.ts`

### Backend — K2

- `backend/src/lib/directory/constants.ts`
- `backend/src/lib/directory/guard.ts`
- `backend/src/lib/directory/map-business.ts`
- `backend/src/services/directory-profile.service.ts`
- `backend/src/services/directory-follow.service.ts`
- `backend/src/services/directory-feed.service.ts`
- `backend/src/app/api/directory/**` (8 route files)

### Frontend — J4

- `frontend/src/features/growth-crm/pages/GrowthLeadPipelinePage.tsx`
- `frontend/src/features/growth-crm/pages/GrowthLeadPipelineDetailPage.tsx`
- `frontend/src/features/growth-crm/pages/GrowthLeadAnalyticsPage.tsx`

### Frontend — K2

- `frontend/src/features/business-directory/**` (service + 3 pages)

---

## 6. Files modified

| File | Change |
|------|--------|
| `backend/src/config/feature-flags.ts` | `growthLeadPipeline`, `businessDirectoryV2` |
| `backend/src/lib/growth/guard.ts` | `leadPipeline` slice |
| `frontend/src/config/feature-flags.ts` | Matching Vite flags |
| `frontend/src/features/growth-crm/config/growth-nav.ts` | Pipeline + analytics nav |
| `frontend/src/features/growth-crm/services/growth-api.service.ts` | J4 client methods |
| `frontend/src/router/index.tsx` | Growth + directory routes |
| `frontend/src/router/lazy-pages.tsx` | Lazy Growth pipeline pages |
| `frontend/src/auth/workspace-redirect.ts` | Allow `/directory` paths |
| `backend/.env.example`, `frontend/.env.example` | Flag docs |

---

## 7. Smoke tests (flags default OFF)

| Endpoint | Expected |
|----------|----------|
| `GET /api/growth/leads/pipeline` | **404** |
| `GET /api/growth/leads/analytics` | **404** |
| `GET /api/directory` | **404** |
| `GET /api/directory/dealers` | **404** |
| `GET /api/directory/search?q=test` | **404** |
| `GET /api/health` | **200** (unchanged) |

---

## 8. Rollback plan

| Level | Action |
|-------|--------|
| **Runtime** | Keep new flags `false`; restart servers |
| **J4 code** | Remove `api/growth/leads/*` (pipeline tree), `growth-lead-pipeline.*`, pipeline pages |
| **K2 code** | Remove `api/directory/**`, `directory-*` services, `business-directory/` feature |
| **Routes** | Revert `router/index.tsx` directory + pipeline entries |
| **Data** | `_crm` JSON in payloads is optional; no migration rollback |

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| CRM data in JSON payload | Documented `_crm` shape; no cross-write to `leads` / `dealer_leads` |
| Directory vs Community duplication | Separate APIs; community routes untouched |
| Follow count drift | Same transaction pattern as community engagement |
| Large pipeline list (500 cap) | Pagination in J5 |
| Route order `leads/pipeline` vs `:formId` | Specific routes registered **before** `:formId` |

---

## 10. Revenue opportunities (future)

| Opportunity | Module | Notes |
|-------------|--------|-------|
| Growth CRM Pro | J4+ | Pipeline + analytics + assignment seats |
| Directory premium listing | K2 | `premium_listings` tier (placeholder ready) |
| Sponsored search rank | K2 | `sponsored_businesses` (placeholder ready) |
| Featured homepage carousel | K2 | `featured_businesses` slots |
| Lead routing to dealer CRM | Future bridge | **Not implemented** — would need explicit approval |
| WhatsApp nurture from pipeline | Growth J1 | Mock send today; provider in later phase |

---

## 11. Approval gates

| Gate | Status |
|------|--------|
| J4 Lead engine | ✅ |
| K2 Business directory | ✅ |
| Monetization implementation | ⏸ Not in scope |
| Prisma team members / lead bridge | ⏸ Future |

**Review:** Awaiting operator sign-off.
