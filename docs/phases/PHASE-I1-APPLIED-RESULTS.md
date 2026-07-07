# Phase I1 — Community Profiles + Feed (applied)

**Status:** Implementation complete — **flags remain OFF** (awaiting review).

**No** Prisma changes, **no** `db push`, **no** migrations. Dealer / Broker / Auction / Finance / Insurance modules untouched.

---

## API list

All routes return **404** when the relevant `FEATURE_COMMUNITY_*` flag is off (master `FEATURE_COMMUNITY_V2` required for every route).

### A. Profiles

| Method | Path | Flag |
|--------|------|------|
| GET | `/api/community/profile/me` | `FEATURE_COMMUNITY_V2` + `FEATURE_COMMUNITY_PROFILES` |
| PATCH | `/api/community/profile/me` | same |
| GET | `/api/community/profile/:handle` | same |

### B. Business profiles

| Method | Path | Flag |
|--------|------|------|
| GET | `/api/community/business/me` | `FEATURE_COMMUNITY_V2` + `FEATURE_COMMUNITY_BUSINESS_PROFILES` |
| POST | `/api/community/business` | same |
| PATCH | `/api/community/business/:slug` | same |
| GET | `/api/community/business/:slug` | same |

### C. Feed & posts

| Method | Path | Flag |
|--------|------|------|
| GET | `/api/community/feed?type=global\|following\|user\|business&cursor=&limit=&handle=&business_slug=` | `FEATURE_COMMUNITY_V2` + `FEATURE_COMMUNITY_FEED` |
| POST | `/api/community/posts` | `FEATURE_COMMUNITY_V2` + `FEATURE_COMMUNITY_POSTS` |
| GET | `/api/community/posts/:id` | same |

Writes use **`social_posts`** only. **`community_posts`** is not written.

### D. Engagement

| Method | Path | Flag |
|--------|------|------|
| POST | `/api/community/posts/:id/like` | `FEATURE_COMMUNITY_POSTS` |
| DELETE | `/api/community/posts/:id/like` | same |
| GET | `/api/community/posts/:id/comments` | same |
| POST | `/api/community/posts/:id/comments` | same |
| POST | `/api/community/posts/:id/share` | same |
| POST | `/api/community/follow` | `FEATURE_COMMUNITY_FOLLOW` |
| DELETE | `/api/community/follow` | same |

**Follow body:** `{ "target_type": "user|business", "target_user_id"?, "target_business_id"? }`

---

## Files added

### Backend

- `backend/src/lib/community/guard.ts`
- `backend/src/lib/community/map-post.ts`
- `backend/src/lib/community/map-profile.ts`
- `backend/src/services/community-profile.service.ts`
- `backend/src/services/community-feed.service.ts`
- `backend/src/services/community-post.service.ts`
- `backend/src/services/community-engagement.service.ts`
- `backend/src/app/api/community/profile/me/route.ts`
- `backend/src/app/api/community/profile/[handle]/route.ts`
- `backend/src/app/api/community/business/route.ts`
- `backend/src/app/api/community/business/me/route.ts`
- `backend/src/app/api/community/business/[slug]/route.ts`
- `backend/src/app/api/community/feed/route.ts`
- `backend/src/app/api/community/posts/route.ts`
- `backend/src/app/api/community/posts/[id]/route.ts`
- `backend/src/app/api/community/posts/[id]/like/route.ts`
- `backend/src/app/api/community/posts/[id]/comments/route.ts`
- `backend/src/app/api/community/posts/[id]/share/route.ts`
- `backend/src/app/api/community/follow/route.ts`

### Frontend

- `frontend/src/features/community/services/community-api.service.ts` (REST client; inactive until flags + `VITE_API_URL`)

### Docs

- `PHASE-I1-APPLIED-RESULTS.md` (this file)

---

## Files modified

- `backend/src/config/feature-flags.ts`
- `backend/src/lib/db/table-map.ts`
- `backend/.env.example`
- `frontend/src/config/feature-flags.ts`

**Not modified:** dealer-crm, broker-crm, auctions, finance, insurance, `community.service.ts` (mock/localStorage path unchanged when flags off).

---

## Feature flags added

| Backend | Frontend | Default |
|---------|----------|---------|
| `FEATURE_COMMUNITY_V2` | `VITE_FEATURE_COMMUNITY_V2` | **false** |
| `FEATURE_COMMUNITY_PROFILES` | `VITE_FEATURE_COMMUNITY_PROFILES` | **false** |
| `FEATURE_COMMUNITY_BUSINESS_PROFILES` | `VITE_FEATURE_COMMUNITY_BUSINESS_PROFILES` | **false** |
| `FEATURE_COMMUNITY_FEED` | `VITE_FEATURE_COMMUNITY_FEED` | **false** |
| `FEATURE_COMMUNITY_POSTS` | `VITE_FEATURE_COMMUNITY_POSTS` | **false** |
| `FEATURE_COMMUNITY_FOLLOW` | `VITE_FEATURE_COMMUNITY_FOLLOW` | **false** |

---

## Smoke test report (flags OFF)

Run against `http://localhost:3001` on 2026-06-04:

| Endpoint | Expected | Actual |
|----------|----------|--------|
| `GET /api/health` | 200 | **200** |
| `GET /api/community/profile/me` | 404 | **404** |
| `GET /api/community/profile/testuser` | 404 | **404** |
| `GET /api/community/business/me` | 404 | **404** |
| `GET /api/community/business/acme-dealer` | 404 | **404** |
| `GET /api/community/feed` | 404 | **404** |
| `GET /api/community/posts` | 405 (POST only) | **405** |
| `GET /api/community/posts/:id` | 404 | **404** |
| `GET /api/community/follow` | 405 (POST/DELETE only) | **405** |
| `GET /api/broker/profile` | 404 | **404** |
| `GET /api/auctions` | 200 | **200** |

Existing `/community/*` UI continues to use mock/localStorage/Supabase because VITE community flags are off.

**Staging (flags ON):** enable master + slice flags in `.env` / `frontend/.env.local`, restart both servers, then exercise CRUD with a logged-in user.

---

## Rollback plan

| Level | Action |
|-------|--------|
| **Runtime** | Keep all `FEATURE_COMMUNITY_*` / `VITE_*` unset or `false` → APIs 404, UI unchanged |
| **Code** | Revert I1 commit/branch; I0 tables remain in DB |
| **DB** | No I1 schema — restore I0 backup only if needed: `backend/backups/motorcart-pre-i0-push-20260604-122652.sql` |

---

## Review notes

- Business `description` maps to Prisma `tagline`; `social_links` stored in `metadata`.
- Following feed dual-reads `community_follows` + legacy `user_follows`.
- New follows also upsert `user_follows` for compatibility.
- Enable flags only after review in staging (not enabled in this delivery).
