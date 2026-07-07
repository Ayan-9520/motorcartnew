# Phase I2 — Community Groups + Business Pages (applied)

**Status:** Implementation complete — **all flags remain OFF** (awaiting review).

**No** Prisma changes · **no** `db push` · **no** migrations · dealer/broker/auction/finance/insurance modules untouched · **no** billing/ads/monetization.

---

## 1. API list

Master: `FEATURE_COMMUNITY_V2` required for every route below.

### A. Groups (`FEATURE_COMMUNITY_GROUPS`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/community/groups?category=&visibility=&q=&cursor=&limit=` | Group listing |
| GET | `/api/community/groups/:slug` | Group detail + rules + membership state |
| POST | `/api/community/groups/:slug/join` | Join group |
| DELETE | `/api/community/groups/:slug/join` | Leave group |
| GET | `/api/community/groups/:slug/members?role=&cursor=&limit=` | Members list |
| GET | `/api/community/groups/:slug/feed` | Group feed alias (`FEATURE_COMMUNITY_GROUP_FEED`) |
| POST | `/api/community/groups/:slug/members/:userId/role` | Set mod/admin role (`FEATURE_COMMUNITY_GROUP_MODERATION`) |

**Roles:** `member`, `group_moderator` (API alias `moderator`), `admin` (assign admin requires `group_owner`).

**Categories:** `open`, `private`, `dealer`, `broker`, `dsa`, `insurance`, `ev`, `parts`, `workshop`.

**Private groups:** `metadata.visibility = "private"` · feed requires membership · join blocked when `metadata.join_policy = "closed"`.

### B. Feed extension (`FEATURE_COMMUNITY_FEED` or `FEATURE_COMMUNITY_GROUP_FEED`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/community/feed?type=group&group_slug=` | Group-scoped feed |

Returns **403** when private group and viewer is not a member.

### C. Posts (`FEATURE_COMMUNITY_POSTS`)

| Method | Path | I2 addition |
|--------|------|-------------|
| POST | `/api/community/posts` | Requires group membership when `group_id` set |

### D. Business pages

| Method | Path | Flag |
|--------|------|------|
| GET | `/api/community/business/:slug` | `FEATURE_COMMUNITY_BUSINESS_PAGES` → page DTO with `profile` + `viewer.is_following` |
| GET | `/api/community/business/:slug` | `FEATURE_COMMUNITY_BUSINESS_PROFILES` only → I1 flat profile (when business pages off) |
| GET | `/api/community/business/:slug/feed` | `FEATURE_COMMUNITY_BUSINESS_PAGES` |
| GET | `/api/community/business/by-entity?entity_type=&entity_id=` | `FEATURE_COMMUNITY_BUSINESS_PAGES` |

**Business `profile` fields:** all I1 fields plus `contact_email`, `verification_tier`, `verification_badge_placeholder`, `social_links`, `website`, `phone`.

**Follow:** unchanged I1 `POST/DELETE /api/community/follow` (`FEATURE_COMMUNITY_FOLLOW`).

**Entity types:** `dealer`, `broker`, `dsa`, `insurance_agent`, `workshop`, `parts_seller`, `influencer`.

---

## 2. Files added

### Backend

- `backend/src/lib/community/map-group.ts`
- `backend/src/services/community-group.service.ts`
- `backend/src/services/community-business-page.service.ts`
- `backend/src/app/api/community/groups/route.ts`
- `backend/src/app/api/community/groups/[slug]/route.ts`
- `backend/src/app/api/community/groups/[slug]/join/route.ts`
- `backend/src/app/api/community/groups/[slug]/members/route.ts`
- `backend/src/app/api/community/groups/[slug]/feed/route.ts`
- `backend/src/app/api/community/groups/[slug]/members/[userId]/role/route.ts`
- `backend/src/app/api/community/business/[slug]/feed/route.ts`
- `backend/src/app/api/community/business/by-entity/route.ts`

### Frontend

- `frontend/src/features/community/pages/CommunityBusinessPage.tsx`

### Docs

- `PHASE-I2-APPLIED-RESULTS.md`

---

## 3. Files modified

- `backend/src/config/feature-flags.ts`
- `backend/src/lib/community/guard.ts`
- `backend/src/lib/community/map-profile.ts`
- `backend/src/services/community-profile.service.ts`
- `backend/src/services/community-feed.service.ts`
- `backend/src/services/community-post.service.ts`
- `backend/src/app/api/community/feed/route.ts`
- `backend/src/app/api/community/posts/route.ts`
- `backend/src/app/api/community/business/[slug]/route.ts`
- `backend/.env.example`
- `frontend/src/config/feature-flags.ts`
- `frontend/src/features/community/services/community-api.service.ts`
- `frontend/src/features/community/services/community.service.ts`
- `frontend/src/router/index.tsx`

---

## 4. Feature flags added (default **false**)

| Backend | Frontend |
|---------|----------|
| `FEATURE_COMMUNITY_GROUPS` | `VITE_FEATURE_COMMUNITY_GROUPS` |
| `FEATURE_COMMUNITY_GROUP_FEED` | `VITE_FEATURE_COMMUNITY_GROUP_FEED` |
| `FEATURE_COMMUNITY_GROUP_MODERATION` | `VITE_FEATURE_COMMUNITY_GROUP_MODERATION` |
| `FEATURE_COMMUNITY_BUSINESS_PAGES` | `VITE_FEATURE_COMMUNITY_BUSINESS_PAGES` |

I1 flags unchanged and still required for profiles/feed/posts/follow slices.

---

## 5. Smoke test report (flags OFF)

Run against `http://localhost:3001`:

| Endpoint | Expected | Result |
|----------|----------|--------|
| `GET /api/health` | 200 | **200** |
| `GET /api/community/groups` | 404 | **404** |
| `GET /api/community/groups/test-slug` | 404 | **404** |
| `GET /api/community/groups/test/join` | 404 | **404** |
| `GET /api/community/groups/test/feed` | 404 | **404** |
| `GET /api/community/business/acme/feed` | 404 | **404** |
| `GET /api/community/business/by-entity?entity_type=dealer&entity_id=x` | 404 | **404** |
| `GET /api/community/feed?type=group&group_slug=x` | 404 | **404** |
| `GET /api/community/profile/me` | 404 | **404** |
| `GET /api/broker/profile` | 404 | **404** |

Frontend `/community/*` continues mock/Supabase/localStorage when flags off.

**Staging checklist (flags ON):** enable `FEATURE_COMMUNITY_V2` + slice flags, restart backend, seed `community_groups` rows, test join/leave, private feed 403, business page GET.

---

## 6. Rollback plan

| Level | Action |
|-------|--------|
| **Runtime** | Unset all `FEATURE_COMMUNITY_*` / `VITE_*` → I2 APIs return 404; UI uses existing mock paths |
| **Partial** | Disable only `FEATURE_COMMUNITY_GROUPS` → groups 404; I1 APIs unaffected |
| **Code** | Revert I2 branch; I0/I1 code and schema remain |
| **DB** | No I2 schema — no DB rollback required |
| **Routes** | Remove `/community/business/:slug` optional; `/community/dealers/:slug` still works |

---

## 7. Risk review

| Risk | Severity | Mitigation |
|------|----------|------------|
| Private group feed leak | **High** | Server checks membership before returning posts; 403 on feed |
| Posting to group without join | **High** | `assertCanPostToGroup` on `POST /posts` with `group_id` |
| Member count drift | **Med** | Transactional join/leave increment/decrement |
| Role escalation | **Med** | Only `group_owner` assigns `admin`; mods cannot change owner |
| Flags-off UX regression | **High** | `community.service.ts` falls back to Supabase/mock when groups API off |
| Business page / dealer route duplication | **Low** | `/community/dealers/:slug` kept; `/community/business/:slug` additive |
| CRM accidental writes | **High** | No dealer/broker/finance/insurance service imports |
| Monetization scope creep | **Low** | No ad/billing code in I2 |
| Empty DB groups list | **Low** | Listing returns `[]`; mock UI still works flags-off |

---

## Approval

**Flags not enabled.** Enable in staging only after review.

| Gate | Action |
|------|--------|
| **Approve I2 staging flags** | Turn on `FEATURE_COMMUNITY_V2` + relevant slice flags in `.env` |
| **Approve I2 db push** | Not required for this delivery |
