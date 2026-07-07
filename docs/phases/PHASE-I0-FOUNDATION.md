# Phase I0 — Community Foundation (architecture review only)

**Status:** ✅ **I0 schema review approved** — see [PHASE-I0-SCHEMA-DIFF.md](./PHASE-I0-SCHEMA-DIFF.md) · ⏸ not applied to Prisma · ⏸ no `db push`

**Constraints:** Additive only · separate domain · do **not** modify dealer CRM, broker CRM, auction, finance, or insurance modules.

---

## 1. Why a separate community domain

Motorcart already has partial social tables (`social_posts`, `post_likes`, `community_groups`, etc.) and a legacy `community_posts` model. Phase I0 **unifies** community into one bounded context so CRM, broker OS, auctions, and fintech never share write paths with the feed.

```mermaid
flowchart TB
  subgraph isolated [Community domain - NEW write boundary]
    API["/api/community/*"]
    SVC["services/community-*"]
    DB["community_* + social_posts"]
  end

  subgraph readOnly [Read-only references - no CRM writes]
    U[(users)]
    V[(vehicles)]
  end

  subgraph forbidden [No Phase I writes]
    D[dealer CRM / leads]
    B[broker CRM]
    A[auctions]
    F[finance]
    I[insurance]
  end

  API --> SVC --> DB
  SVC -. optional slug/id .-> U
  SVC -. optional listing ref .-> V
  isolated -.x.- forbidden
```

**Hard rules (same spirit as Phase E broker isolation):**

| Rule | Detail |
|------|--------|
| No dealer CRM edits | `dealer-crm/**`, `leads`, `crm_tasks`, `dealer_leads` untouched |
| No broker CRM edits | `broker-crm/**`, `broker_*` services untouched |
| No auction / finance / insurance edits | Existing modules unchanged |
| No cross-domain writes | Community services never `INSERT/UPDATE` dealer/broker/auction/finance tables |
| Org linkage | Business profiles may **store** `dealer_id` / `broker_id` as optional metadata — **read-only** for display, not ownership mutation |

---

## 2. Community personas (8 types)

Personas are **community identity**, not replacements for `AppRole`. One `users` row can have one `community_user_profile` with a primary persona badge.

| Persona | Typical `AppRole` (workspace) | Business profile optional |
|---------|------------------------------|---------------------------|
| **Customer** | `customer` | No |
| **Dealer** | `dealer`, `used_car_dealer`, `new_car_dealer`, … | Yes → `entity_type: dealer` |
| **Broker** | `broker` | Yes → `entity_type: broker` |
| **DSA** | `dsa_agent` | Yes → `entity_type: dsa` |
| **Insurance Agent** | `customer` or future `insurance_agent` | Yes → `entity_type: insurance_agent` |
| **Workshop** | `service_center`, `service_partner` | Yes → `entity_type: workshop` |
| **Parts Seller** | `parts_seller` | Yes → `entity_type: parts_seller` |
| **Influencer** | `customer` (or dedicated metadata) | Yes → `entity_type: influencer` |

Stored as enum `CommunityPersona` on profile tables (app-enforced; not all need new `AppRole` values in I0).

---

## 3. Module map (10 requirements)

| # | Module | I0 schema / behavior | Canonical table(s) |
|---|--------|----------------------|-------------------|
| 1 | **User Profiles** | Handle, bio, avatar, cover, persona, visibility | `community_user_profiles` + optional `users` community columns |
| 2 | **Business Profiles** | Org-facing page separate from CRM profile | `community_business_profiles` |
| 3 | **Follow System** | Follow users + optional follow business profiles | `community_follows` (or extend `user_follows`) |
| 4 | **Feed Architecture** | Home, following, group, persona filters; cursor pagination | `social_posts` + `community_feed_cursors` (optional cache table) |
| 5 | **Posts** | Text, media, poll, embed; moderation fields | `social_posts` (canonical); legacy `community_posts` read-only |
| 6 | **Likes** | Idempotent like per user/post | `post_likes` |
| 7 | **Comments** | Threaded later; flat in I0 | `post_comments` |
| 8 | **Shares** | Share event + counter | `post_shares` |
| 9 | **Groups** | Open/topic/city/dealer-tagged groups | `community_groups` + `community_group_members` |
| 10 | **Community Roles** | Member, mod, admin, group owner | `community_role_assignments` |

---

## 4. Database schema plan

See **[PHASE-I-DATABASE.md](./PHASE-I-DATABASE.md)** for full column lists.

### 4.1 Consolidation strategy (additive)

| Current state | I0 decision |
|---------------|-------------|
| `community_posts` (Prisma, simple) | **Freeze** — no new writes when `FEATURE_COMMUNITY_V2` on; migrate read path to `social_posts` in I1+ |
| `social_posts` (Prisma thin; Postgres rich) | **Canonical post** — extend Prisma to match Postgres capabilities in I0 schema approval |
| `community_groups` (minimal Prisma) | **Extend** — add `group_type`, rules, cover, dealer ref (nullable, no FK enforce optional) |
| `user_follows` | **Keep** — add `created_at`, indexes if missing in MySQL |
| `users.community_*` (Postgres migration only) | **Add to Prisma/MySQL** in I0 — `community_handle`, `community_bio`, `community_cover_url` |

### 4.2 New `community_*` tables (I0)

| Table | Purpose |
|-------|---------|
| `community_user_profiles` | 1:1 with `users` — persona, handle uniqueness, stats |
| `community_business_profiles` | 1:1 optional org identity — links via `entity_type` + `entity_id` |
| `community_follows` | Polymorphic follow (user or business profile) — *or* keep `user_follows` + add `community_business_follows` |
| `community_group_members` | Membership + role in group |
| `community_role_assignments` | Platform/group roles |
| `community_feed_pins` | Optional featured posts (later) |

**No new tables** in dealer/broker/auction/finance schemas.

### 4.3 Feed architecture (logical, minimal I0 tables)

**I0:** feed is **query-based** (no fan-out table required):

```
Feed types:
  - global      → social_posts WHERE moderation_status = approved ORDER BY created_at DESC
  - following   → posts WHERE author_id IN (SELECT following_id FROM community_follows ...)
  - group       → posts WHERE group_id = ?
  - persona     → posts JOIN community_user_profiles ON author persona filter
```

**I1+ optional:** `community_feed_entries` (materialized) for scale.

Indexes (additive): `(created_at DESC)`, `(author_id, created_at)`, `(group_id, created_at)`, `(moderation_status, created_at)`.

---

## 5. Prisma models (proposed — not applied)

Full model definitions: **[PHASE-I-DATABASE.md](./PHASE-I-DATABASE.md)**.

### New enums

```prisma
enum CommunityPersona {
  customer
  dealer
  broker
  dsa
  insurance_agent
  workshop
  parts_seller
  influencer
}

enum CommunityBusinessEntityType {
  dealer
  broker
  dsa
  insurance_agent
  workshop
  parts_seller
  influencer
}

enum CommunityMemberRole {
  member
  moderator
  admin
  group_owner
  group_moderator
}

enum SocialPostKind {
  discussion
  review
  poll
  embed
}

enum SocialModerationStatus {
  pending
  approved
  rejected
  hidden
}
```

### Model count summary (I0 target)

| Category | Count |
|----------|------:|
| New models | 6–8 |
| Extended models | 4 (`User`, `SocialPost`, `CommunityGroup`, engagement tables) |
| Deprecated for new writes | 1 (`CommunityPost` — legacy) |
| Untouched CRM models | All dealer/broker/auction/finance |

---

## 6. API architecture

**Namespace:** `backend/src/app/api/community/**`  
**Services:** `backend/src/services/community-*.ts`  
**Never import:** `dealer-enterprise.service`, `broker-*.service`, auction RPC, finance services.

### 6.1 Layering

```
HTTP Route → community/guard.ts → community-*.service → Prisma (community/social tables only)
                    ↓
            featureFlags.community*
```

### 6.2 Endpoint map (I0 contract — implement I1+)

| Area | Methods | Path |
|------|---------|------|
| **Profiles** | GET, PATCH | `/api/community/profile/me` |
| | GET | `/api/community/profile/:handle` |
| **Business** | GET, POST, PATCH | `/api/community/business` |
| | GET | `/api/community/business/:slug` |
| **Follow** | POST, DELETE | `/api/community/follow/:targetType/:targetId` |
| | GET | `/api/community/followers`, `/following` |
| **Feed** | GET | `/api/community/feed?type=global\|following\|group\|persona` |
| **Posts** | GET, POST | `/api/community/posts` |
| | GET, PATCH, DELETE | `/api/community/posts/:id` |
| **Likes** | POST, DELETE | `/api/community/posts/:id/like` |
| **Comments** | GET, POST | `/api/community/posts/:id/comments` |
| **Shares** | POST | `/api/community/posts/:id/share` |
| **Groups** | GET, POST | `/api/community/groups` |
| | GET, POST, DELETE | `/api/community/groups/:slug/members` |
| **Roles** | GET | `/api/community/roles/me` |
| | POST | `/api/community/roles/assign` (admin/mod only) |
| **Moderation** | POST | `/api/community/moderation/flag` |

Generic `POST /api/db/query` on community tables: allowlist only when `FEATURE_COMMUNITY_V2` on — separate from CRM tables.

---

## 7. Route structure (frontend)

**Existing public shell (keep paths, gate behind flags in I1+):**

| Path | Page | I0 |
|------|------|-----|
| `/community` | Feed | Exists |
| `/community/post/:id` | Post detail | Exists |
| `/community/groups` | Groups list | Exists |
| `/community/groups/:slug` | Group feed | Exists |
| `/community/u/:userId` | User profile | Exists |
| `/community/dealers/:slug` | Dealer community view | Exists — **read-only**, no dealer CRM |

**Proposed additive routes (I2+):**

| Path | Purpose |
|------|---------|
| `/community/business/:slug` | Business profile |
| `/community/persona/:persona` | Persona-filtered feed |
| `/community/me/settings` | Community profile settings |

**No new routes under** `/dashboard/dealer`, `/dashboard/broker`, `/auctions`, `/finance`, `/insurance`.

---

## 8. Feature flags

All default **`false`** (explicit opt-in, same as broker/auction phases).

| Backend | Frontend | Gates |
|---------|----------|-------|
| `FEATURE_COMMUNITY_V2` | `VITE_FEATURE_COMMUNITY_V2` | Master switch |
| `FEATURE_COMMUNITY_PROFILES` | `VITE_FEATURE_COMMUNITY_PROFILES` | User profiles |
| `FEATURE_COMMUNITY_BUSINESS_PROFILES` | `VITE_FEATURE_COMMUNITY_BUSINESS_PROFILES` | Business profiles |
| `FEATURE_COMMUNITY_FOLLOW` | `VITE_FEATURE_COMMUNITY_FOLLOW` | Follow graph |
| `FEATURE_COMMUNITY_FEED` | `VITE_FEATURE_COMMUNITY_FEED` | Feed API |
| `FEATURE_COMMUNITY_POSTS` | `VITE_FEATURE_COMMUNITY_POSTS` | Post CRUD |
| `FEATURE_COMMUNITY_GROUPS` | `VITE_FEATURE_COMMUNITY_GROUPS` | Groups + membership |
| `FEATURE_COMMUNITY_ROLES` | `VITE_FEATURE_COMMUNITY_ROLES` | Role assignments |
| `FEATURE_COMMUNITY_MODERATION` | `VITE_FEATURE_COMMUNITY_MODERATION` | Flags + mod queue |

**When master flag off:** existing community UI may use mocks/legacy paths; CRM and marketplace unchanged.

---

## 9. Rollout phases (after I0 approval)

| Phase | Scope |
|-------|--------|
| **I0** | Schema + flags + table-map + docs (this review) |
| **I1** | Align `social_posts` Prisma; profiles; `db push` |
| **I2** | Follow + feed APIs |
| **I3** | Posts, likes, comments, shares |
| **I4** | Groups + roles |
| **I5** | Business profiles + persona badges |
| **I6** | Moderation + notifications bridge |

---

## 10. Rollback plan

| Level | Action |
|-------|--------|
| **App** | Set all `FEATURE_COMMUNITY_*` to `false` |
| **API** | Community routes return 404 |
| **DB (dev)** | Restore pre-I backup; new `community_*` tables empty → safe to drop |
| **Legacy** | `community_posts` + existing UI continue if never migrated |
| **CRM** | Unaffected — no rollback needed for dealer/broker |

---

## 11. Risk analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate post tables (`community_posts` vs `social_posts`) | **High** | I0 declares canonical table; dual-write forbidden; migration plan in I1 |
| Accidental CRM coupling (dealer_id on posts mutating dealer) | **High** | No FK writes to `dealers`; optional UUID refs only |
| Persona / AppRole drift | **Med** | Persona on `community_user_profiles`; map at display time |
| Feed scale (following graph) | **Med** | Cursor pagination; materialized feed deferred to I1+ |
| Moderation / spam | **Med** | `moderation_status`, `spam_score`, `community_moderation_flags` |
| Insurance agent not in `AppRole` | **Low** | Use `CommunityPersona.insurance_agent` without new workspace role in I0 |
| Generic `/api/db/query` exposure | **Med** | Separate allowlist; master flag off by default |
| Influencer impersonation | **Med** | Verified badge field on business profile (I5+) |

---

## 12. Files expected at implementation (not touched in I0 review)

| Layer | Paths |
|-------|--------|
| Docs | `PHASE-I0-FOUNDATION.md`, `PHASE-I-DATABASE.md` |
| Schema | `backend/prisma/schema.prisma` |
| Config | `feature-flags.ts`, `table-map.ts`, `.env.example` |
| Backend | `src/lib/community/*`, `src/services/community-*.ts`, `src/app/api/community/**` |
| Frontend | `src/features/community/**` (extend only), `src/services/community.service.ts` |

**Explicitly not in scope:** `dealer-crm/**`, `broker-crm/**`, `features/auctions/**`, finance/insurance feature folders.

---

## Approval

Reply **Approve I0 schema** to proceed with Prisma diff + pre-`db push` package (same gate as Phase E/F).

**No `db push` until separately approved.**
