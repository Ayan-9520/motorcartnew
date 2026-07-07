# Phase I0 — Schema diff & pre-`db push` review (approval gate)

**Date:** 2026-06-04  
**Status:** ✅ Schema + **`db push` applied** — see [PHASE-I0-APPLIED-RESULTS.md](./PHASE-I0-APPLIED-RESULTS.md)

Awaiting review before I1.

**Scope:** Schema + flags + `table-map` only (no community APIs, no route changes, no UI rewrites in I0).

---

## 1. Exact Prisma schema diff (proposed — vs current repo)

### A. New enums (5)

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

---

### B. `User` — additive columns + relations

```diff
 model User {
   ...
+  communityHandle   String?   @unique @map("community_handle") @db.VarChar(32)
+  communityBio      String?   @map("community_bio") @db.Text
+  communityCoverUrl   String?   @map("community_cover_url") @db.VarChar(512)
   ...
   communityPosts    CommunityPost[]
+  communityProfile  CommunityUserProfile?
+  communityBusinessProfiles CommunityBusinessProfile[]
+  communityFollows    CommunityFollow[]     @relation("CommunityFollower")
+  communityGroupMembers CommunityGroupMember[]
+  communityRoleAssignments CommunityRoleAssignment[]
+  socialPosts       SocialPost[]
   ...
 }
```

---

### C. `SocialPost` — extended (canonical post table)

**Canonical rule:** all new post writes target `social_posts`. Column `content` **retained** (no rename to `body` in I0 — avoids data migration).

```diff
 model SocialPost {
   id           String    @id @default(uuid())
   authorId     String    @map("author_id")
   content      String    @db.Text
   media        Json      @default("[]")
-  postType     String    @default("text") @map("post_type")
+  postKind     SocialPostKind @default(discussion) @map("post_kind")
+  vehicleId    String?   @map("vehicle_id")
+  dealerId     String?   @map("dealer_id")
+  brokerId     String?   @map("broker_id")
+  groupId      String?   @map("group_id")
+  embedProvider String?  @map("embed_provider") @db.VarChar(16)
+  embedUrl     String?   @map("embed_url") @db.VarChar(512)
+  pollOptions  Json?     @map("poll_options")
+  pollEndsAt   DateTime? @map("poll_ends_at")
   likeCount    Int       @default(0) @map("like_count")
   commentCount Int       @default(0) @map("comment_count")
   shareCount   Int       @default(0) @map("share_count")
+  spamScore    Decimal   @default(0) @map("spam_score") @db.Decimal(5, 2)
+  moderationStatus SocialModerationStatus @default(approved) @map("moderation_status")
+  needsReview  Boolean   @default(false) @map("needs_review")
   metadata     Json      @default("{}")
   deletedAt    DateTime? @map("deleted_at")
   createdAt    DateTime  @default(now()) @map("created_at")
   updatedAt    DateTime  @updatedAt @map("updated_at")

+  author       User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
+  group        CommunityGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
+  likes        PostLike[]
+  comments     PostComment[]
+  shares       PostShare[]
+  hashtags     PostHashtag[]
+  pollVotes    PollVote[]

   @@index([authorId])
+  @@index([authorId, createdAt])
+  @@index([groupId, createdAt])
+  @@index([moderationStatus, createdAt])
+  @@index([createdAt])
   @@map("social_posts")
 }
```

*Note:* If `post_type` column already exists in MySQL, I0 keeps it and adds `post_kind` OR maps via `@map("post_type")` on `postKind` — implementer picks **one** column to avoid duplicate (review at apply time).

---

### D. `CommunityGroup` — extended

```diff
 model CommunityGroup {
   ...
+  groupType   String   @default("open") @map("group_type") @db.VarChar(24)
+  ruleKey     String?  @map("rule_key") @db.VarChar(64)
+  ruleValue   String?  @map("rule_value") @db.VarChar(128)
+  dealerId    String?  @map("dealer_id")
+  coverUrl    String?  @map("cover_url") @db.VarChar(512)
+  updatedAt   DateTime @updatedAt @map("updated_at")
+  posts       SocialPost[]
+  members     CommunityGroupMember[]
 }
```

---

### E. Engagement models — additive fields + FK relations to `SocialPost`

```diff
 model PostLike {
   postId String @map("post_id")
   userId String @map("user_id")
+  createdAt DateTime @default(now()) @map("created_at")
+  post   SocialPost @relation(fields: [postId], references: [id], onDelete: Cascade)
 }

 model PostComment {
   ...
+  parentId  String?  @map("parent_id")
+  hidden    Boolean  @default(false)
+  updatedAt DateTime @updatedAt @map("updated_at")
+  post      SocialPost @relation(...)
+  author    User @relation(...)
 }

 model PostShare { + post relation, + user relation }
 model PostHashtag { + post relation }
 model PollVote { + post relation, + user relation }

 model UserFollow {
   ...
+  createdAt DateTime @default(now()) @map("created_at")
 }
```

---

### F. `CommunityPost` — unchanged (legacy)

```diff
 model CommunityPost {
   // NO field removals
   // NO renames
   // Optional doc comment: legacy — new writes use SocialPost when FEATURE_COMMUNITY_V2 on
 }
```

---

### G. New models (5)

Full field lists in [PHASE-I-DATABASE.md](./PHASE-I-DATABASE.md).

```prisma
model CommunityUserProfile { ... @@map("community_user_profiles") }
model CommunityBusinessProfile { ... @@map("community_business_profiles") }
model CommunityFollow { ... @@map("community_follows") }
model CommunityGroupMember { ... @@map("community_group_members") }
model CommunityRoleAssignment { ... @@map("community_role_assignments") }
```

---

## 2. Exact new `community_*` tables (5 CREATE)

| # | MySQL table | Prisma model |
|---|-------------|--------------|
| 1 | `community_user_profiles` | `CommunityUserProfile` |
| 2 | `community_business_profiles` | `CommunityBusinessProfile` |
| 3 | `community_follows` | `CommunityFollow` |
| 4 | `community_group_members` | `CommunityGroupMember` |
| 5 | `community_role_assignments` | `CommunityRoleAssignment` |

**Also extended (not new):** `community_groups` — `ALTER` only.

**Legacy (no CREATE):** `community_posts`, `community_moderation_flags` — already exist.

---

## 3. Exact existing tables to be extended (ALTER only)

| Table | Changes | Data impact |
|-------|---------|-------------|
| `users` | +`community_handle`, `community_bio`, `community_cover_url` | New columns NULL / empty on existing rows |
| `social_posts` | +kind, refs, moderation, poll, embed, indexes, FKs | **No row updates** — new columns get defaults |
| `community_groups` | +`group_type`, rules, `dealer_id`, `cover_url`, `updated_at` | Additive defaults |
| `post_likes` | +`created_at`, FK to `social_posts` | Existing likes preserved |
| `post_comments` | +`parent_id`, `hidden`, `updated_at`, FKs | Additive |
| `post_shares` | +FKs | Additive |
| `post_hashtags` | +FK to `social_posts` | Additive |
| `poll_votes` | +FKs | Additive |
| `user_follows` | +`created_at` | Additive |

**Not altered:** `leads`, `dealer_leads`, `crm_tasks`, `dealers` (except no structural dealer CRM change), `brokers`, `auctions`, `bids`, finance/insurance tables, `community_posts` rows.

---

## 4. All new enums (summary)

| Enum | Values count |
|------|-------------|
| `CommunityPersona` | 8 |
| `CommunityBusinessEntityType` | 7 |
| `CommunityMemberRole` | 5 |
| `SocialPostKind` | 4 |
| `SocialModerationStatus` | 4 |

---

## 5. Confirmations — no changes to

| Domain | Confirmed |
|--------|-----------|
| **Dealer CRM** | No edits to `dealer-crm/**`, `leads`, `crm_tasks`, `dealer_leads`, `/dashboard/dealer/*` |
| **Broker CRM** | No edits to `broker-crm/**`, `broker_*` services, `/dashboard/broker/*` (except unrelated prior E0 shell) |
| **Auction** | No `auctions` / `bids` schema or API changes |
| **Finance** | No finance schema or route changes |
| **Insurance** | No insurance schema or route changes |
| **Existing community routes** | `/community`, `/community/post/:id`, `/community/groups`, etc. — **no path changes in I0** |

---

## 6. No existing posts data modified

| Table | Migration behavior |
|-------|-------------------|
| `community_posts` | **No** `UPDATE` / `DELETE` / column drops |
| `social_posts` | **Only** `ADD COLUMN` + indexes; existing `content`, counts, timestamps **unchanged** |
| `post_likes`, `post_comments`, `post_shares` | Existing rows kept; new columns nullable/default |

**No data backfill or seed** in I0 schema migration.

---

## 7. `social_posts` remains canonical

| Rule | I0 |
|------|-----|
| New post writes (when flags on, I1+) | `social_posts` only |
| `community_posts` | Legacy read-only; frozen for new writes |
| Engagement FKs | Point to `social_posts.id` |
| Feed queries | `social_posts` + moderation filter |

---

## 8. Rollback plan

### A — Application

1. All `FEATURE_COMMUNITY_*` / `VITE_FEATURE_COMMUNITY_*` remain **false**.
2. No community API routes required in I0.
3. Existing community UI continues on current/mock paths.

### B — Database (dev)

```powershell
# Before push (when approved):
E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction motorcart > backend\backups\motorcart-pre-i0-YYYYMMDD.sql

# Rollback:
E:\xampp\mysql\bin\mysql.exe -u root motorcart < backend\backups\motorcart-pre-i0-YYYYMMDD.sql
cd backend
git checkout -- prisma/schema.prisma
npx prisma generate
```

### C — Surgical (empty community I0 tables)

```sql
DROP TABLE IF EXISTS community_role_assignments;
DROP TABLE IF EXISTS community_group_members;
DROP TABLE IF EXISTS community_follows;
DROP TABLE IF EXISTS community_business_profiles;
DROP TABLE IF EXISTS community_user_profiles;
-- Revert social_posts / users / community_groups column adds via full restore (safest)
```

**CRM / broker / auction / finance data:** never touched.

### D — Destructive check

- Expected: **zero** `DROP TABLE`, **zero** `DROP COLUMN`
- Do **not** use `--force-reset`

---

## 9. Affected files list (on I0 implementation — not yet changed)

### Will change at “Apply I0 schema” (before `db push`)

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Full I0 diff above |
| `backend/src/lib/db/table-map.ts` | +5 delegates (`community_user_profiles`, …) |
| `backend/src/config/feature-flags.ts` | +9 `FEATURE_COMMUNITY_*`, default `false` |
| `frontend/src/config/feature-flags.ts` | +9 `VITE_FEATURE_COMMUNITY_*`, default `false` |
| `backend/.env.example` | Commented community flags |

### Documentation (this review)

| File |
|------|
| `PHASE-I0-FOUNDATION.md` |
| `PHASE-I-DATABASE.md` |
| `PHASE-I0-SCHEMA-DIFF.md` |

### Will NOT change in I0

| Area | Paths |
|------|--------|
| Dealer CRM | `frontend/src/features/dealer-crm/**` |
| Broker CRM | `backend/src/app/api/broker/**`, `broker-crm/**` |
| Auction | `features/auctions/**`, auction APIs |
| Finance / Insurance | respective feature folders + APIs |
| Community routes | `frontend/src/router/index.tsx` community block |
| Community UI | `frontend/src/features/community/**` (no I0 edits) |
| Marketplace / leads | `api/leads`, `marketplace-lead.service.ts` |
| New community APIs | `api/community/**` — **I1+** |

---

## 10. Feature flags (I0 — schema/config only)

| Flag | Default |
|------|---------|
| `FEATURE_COMMUNITY_V2` | `false` |
| `FEATURE_COMMUNITY_PROFILES` | `false` |
| `FEATURE_COMMUNITY_BUSINESS_PROFILES` | `false` |
| `FEATURE_COMMUNITY_FOLLOW` | `false` |
| `FEATURE_COMMUNITY_FEED` | `false` |
| `FEATURE_COMMUNITY_POSTS` | `false` |
| `FEATURE_COMMUNITY_GROUPS` | `false` |
| `FEATURE_COMMUNITY_ROLES` | `false` |
| `FEATURE_COMMUNITY_MODERATION` | `false` |

---

## 11. Counts summary

| Metric | Count |
|--------|------:|
| New enums | **5** |
| New Prisma models | **5** |
| New MySQL tables (`community_*` CREATE) | **5** |
| Extended existing tables | **9** |
| New `social_posts` replaces `community_posts` for writes | **Yes (policy)** |
| `community_posts` dropped | **No** |
| Dealer/broker/auction/finance models touched | **0** |

---

## Approval gates

| Gate | Status |
|------|--------|
| **I0 schema review** | ✅ Approved (this document) |
| **Apply diff to `schema.prisma`** | ✅ Done |
| **`prisma db push`** | ⏸ Pending — say **Approve I0 db push** |

**No `db push` until explicitly approved.**
