# Phase I — Database schema plan (I0 review)

**Status:** Architecture / schema plan only — **not applied** to `schema.prisma`, **no `db push`**.

Aligns Postgres reference (`00007_community_social.sql`, `00023_community_full_social.sql`) with proposed MySQL/Prisma target.

---

## 1. Existing tables (inventory)

| Table | In Prisma today | I0 role |
|-------|-----------------|---------|
| `community_posts` | Yes (`CommunityPost`) | Legacy — freeze new writes |
| `social_posts` | Yes (thin) | **Canonical posts** — extend |
| `community_groups` | Yes (thin) | Extend |
| `post_likes` | Yes | Keep + FK to `social_posts` |
| `post_comments` | Yes | Keep + FK |
| `post_shares` | Yes | Keep + FK |
| `post_hashtags` | Yes | Keep |
| `poll_votes` | Yes | Keep |
| `user_follows` | Yes | Keep or supersede by `community_follows` |
| `community_moderation_flags` | Yes | Keep |
| `users` | Yes | Add community columns (additive) |

**Not in MySQL Prisma yet:** `community_post_reviews`, rich `social_posts` columns, `community_group_members`.

---

## 2. `users` — additive columns

| Column | Type | Purpose |
|--------|------|---------|
| `community_handle` | VARCHAR(32) UNIQUE (nullable) | @handle |
| `community_bio` | TEXT NULL | Short bio |
| `community_cover_url` | VARCHAR(512) NULL | Cover image |

No changes to `role`, `password_hash`, or CRM fields.

---

## 3. New tables

### 3.1 `community_user_profiles` (Module 1 — User Profiles)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK → users | 1:1 |
| `persona` | ENUM CommunityPersona | Primary badge |
| `display_name` | VARCHAR(128) | |
| `handle` | VARCHAR(32) UNIQUE | May mirror `users.community_handle` |
| `avatar_url` | VARCHAR(512) NULL | |
| `cover_url` | VARCHAR(512) NULL | |
| `bio` | TEXT NULL | |
| `location_city` | VARCHAR(64) NULL | |
| `is_verified` | BOOLEAN DEFAULT false | |
| `is_private` | BOOLEAN DEFAULT false | |
| `follower_count` | INT DEFAULT 0 | Denormalized |
| `following_count` | INT DEFAULT 0 | Denormalized |
| `post_count` | INT DEFAULT 0 | Denormalized |
| `metadata` | JSON | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Indexes:** `(handle)`, `(persona)`, `(user_id)`.

---

### 3.2 `community_business_profiles` (Module 2 — Business Profiles)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `owner_user_id` | UUID FK → users | Who manages page |
| `entity_type` | ENUM CommunityBusinessEntityType | |
| `entity_id` | UUID NULL | Optional ref to dealer/broker org — **no FK required** |
| `slug` | VARCHAR(64) UNIQUE | |
| `name` | VARCHAR(128) | |
| `tagline` | VARCHAR(255) NULL | |
| `logo_url` | VARCHAR(512) NULL | |
| `cover_url` | VARCHAR(512) NULL | |
| `website` | VARCHAR(255) NULL | |
| `phone` | VARCHAR(20) NULL | |
| `city` | VARCHAR(64) NULL | |
| `state` | VARCHAR(64) NULL | |
| `follower_count` | INT DEFAULT 0 | |
| `is_verified` | BOOLEAN DEFAULT false | |
| `metadata` | JSON | storefront links, hours |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Indexes:** `(entity_type, entity_id)`, `(slug)`, `(owner_user_id)`.

**Rule:** Community service may **read** dealer/broker slug for display; never updates `dealers` / `brokers` rows.

---

### 3.3 `community_follows` (Module 3 — Follow System)

Polymorphic follow (cleaner than multiple tables):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `follower_user_id` | UUID FK → users | |
| `target_type` | VARCHAR(16) | `user`, `business` |
| `target_user_id` | UUID NULL | When following user profile |
| `target_business_id` | UUID NULL FK → community_business_profiles | |
| `created_at` | DATETIME | |

**Unique:** `(follower_user_id, target_type, target_user_id, target_business_id)`  
**Indexes:** `(follower_user_id)`, `(target_user_id)`, `(target_business_id)`.

**Migration note:** Existing `user_follows` remains for backward compatibility; I1 may dual-read then deprecate.

---

### 3.4 `community_group_members` (Module 9 — Groups)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `group_id` | UUID FK → community_groups | |
| `user_id` | UUID FK → users | |
| `role` | ENUM CommunityMemberRole DEFAULT member | |
| `joined_at` | DATETIME | |

**Unique:** `(group_id, user_id)`

---

### 3.5 `community_role_assignments` (Module 10 — Community Roles)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `scope` | VARCHAR(16) | `platform`, `group` |
| `scope_id` | UUID NULL | group_id when scope=group |
| `role` | ENUM CommunityMemberRole | |
| `granted_by` | UUID NULL | |
| `created_at` | DATETIME | |

**Indexes:** `(user_id)`, `(scope, scope_id, role)`.

---

## 4. Extended tables

### 4.1 `social_posts` (Modules 4–8 — Feed + Posts + engagement)

**Canonical post model** — extend Prisma to match Postgres spec:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `author_id` | UUID FK → users | |
| `body` | TEXT | |
| `media_urls` | JSON | Array of URLs |
| `vehicle_id` | UUID NULL | Read-only listing ref |
| `dealer_id` | UUID NULL | Display/tag only — no CRM write |
| `broker_id` | UUID NULL | Display/tag only |
| `group_id` | UUID NULL FK → community_groups | |
| `post_kind` | ENUM SocialPostKind | |
| `embed_provider` | VARCHAR(16) NULL | youtube, linkedin, reel |
| `embed_url` | VARCHAR(512) NULL | |
| `poll_options` | JSON NULL | |
| `poll_ends_at` | DATETIME NULL | |
| `like_count` | INT DEFAULT 0 | |
| `comment_count` | INT DEFAULT 0 | |
| `share_count` | INT DEFAULT 0 | |
| `spam_score` | DECIMAL(5,2) DEFAULT 0 | |
| `moderation_status` | ENUM SocialModerationStatus | |
| `needs_review` | BOOLEAN DEFAULT false | |
| `metadata` | JSON | |
| `deleted_at` | DATETIME NULL | Soft delete |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Indexes:** `(author_id, created_at)`, `(group_id, created_at)`, `(moderation_status, created_at)`, `(created_at DESC)`.

---

### 4.2 `community_groups` — extend

| Column | Type | Notes |
|--------|------|-------|
| `group_type` | VARCHAR(24) | city, vehicle_topic, dealer, influencer, open, trending |
| `rule_key` | VARCHAR(64) NULL | |
| `rule_value` | VARCHAR(128) NULL | |
| `dealer_id` | UUID NULL | Tag only |
| `cover_url` | VARCHAR(512) NULL | |
| `updated_at` | DATETIME | |

---

### 4.3 Engagement tables — add FKs + timestamps

**`post_likes`:** add `created_at`, FK `post_id` → `social_posts`  
**`post_comments`:** add `author_id` alias, `parent_id` NULL (I2 threading), `hidden`, `updated_at`  
**`post_shares`:** unchanged structure  
**`post_hashtags`:** FK → `social_posts`  
**`poll_votes`:** FK → `social_posts`

---

## 5. Proposed Prisma models (reference)

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

model CommunityUserProfile {
  id             String           @id @default(uuid())
  userId         String           @unique @map("user_id")
  persona        CommunityPersona @default(customer)
  displayName    String           @map("display_name") @db.VarChar(128)
  handle         String           @unique @db.VarChar(32)
  avatarUrl      String?          @map("avatar_url")
  coverUrl       String?          @map("cover_url")
  bio            String?          @db.Text
  locationCity   String?          @map("location_city") @db.VarChar(64)
  isVerified     Boolean          @default(false) @map("is_verified")
  isPrivate      Boolean          @default(false) @map("is_private")
  followerCount  Int              @default(0) @map("follower_count")
  followingCount Int              @default(0) @map("following_count")
  postCount      Int              @default(0) @map("post_count")
  metadata       Json             @default("{}")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([persona])
  @@map("community_user_profiles")
}

model CommunityBusinessProfile {
  id            String                      @id @default(uuid())
  ownerUserId   String                      @map("owner_user_id")
  entityType    CommunityBusinessEntityType @map("entity_type")
  entityId      String?                     @map("entity_id")
  slug          String                      @unique @db.VarChar(64)
  name          String                      @db.VarChar(128)
  tagline       String?                     @db.VarChar(255)
  logoUrl       String?                     @map("logo_url")
  coverUrl      String?                     @map("cover_url")
  website       String?                     @db.VarChar(255)
  phone         String?                     @db.VarChar(20)
  city          String?                     @db.VarChar(64)
  state         String?                     @db.VarChar(64)
  followerCount Int                         @default(0) @map("follower_count")
  isVerified    Boolean                     @default(false) @map("is_verified")
  metadata      Json                        @default("{}")
  createdAt     DateTime                    @default(now()) @map("created_at")
  updatedAt     DateTime                    @updatedAt @map("updated_at")

  owner         User                        @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)

  @@index([entityType, entityId])
  @@index([ownerUserId])
  @@map("community_business_profiles")
}

model CommunityFollow {
  id                 String   @id @default(uuid())
  followerUserId     String   @map("follower_user_id")
  targetType         String   @db.VarChar(16)
  targetUserId       String?  @map("target_user_id")
  targetBusinessId   String?  @map("target_business_id")
  createdAt          DateTime @default(now()) @map("created_at")

  follower           User     @relation("CommunityFollower", fields: [followerUserId], references: [id], onDelete: Cascade)
  targetBusiness     CommunityBusinessProfile? @relation(fields: [targetBusinessId], references: [id], onDelete: Cascade)

  @@unique([followerUserId, targetType, targetUserId, targetBusinessId])
  @@index([followerUserId])
  @@map("community_follows")
}

model CommunityGroupMember {
  id        String              @id @default(uuid())
  groupId   String              @map("group_id")
  userId    String              @map("user_id")
  role      CommunityMemberRole @default(member)
  joinedAt  DateTime            @default(now()) @map("joined_at")

  group     CommunityGroup      @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@map("community_group_members")
}

model CommunityRoleAssignment {
  id         String              @id @default(uuid())
  userId     String              @map("user_id")
  scope      String              @db.VarChar(16)
  scopeId    String?             @map("scope_id")
  role       CommunityMemberRole
  grantedBy  String?             @map("granted_by")
  createdAt  DateTime            @default(now()) @map("created_at")

  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([scope, scopeId])
  @@map("community_role_assignments")
}

// SocialPost — replace thin model with extended fields (see §4.1)
// CommunityGroup — extend fields (see §4.2)
// PostLike, PostComment, PostShare — add relations to SocialPost
```

---

## 6. MySQL table count (on I0 `db push`)

| Action | Count |
|--------|------:|
| **CREATE** new tables | 5 (`community_user_profiles`, `community_business_profiles`, `community_follows`, `community_group_members`, `community_role_assignments`) |
| **ALTER** existing | ~6 (`users`, `social_posts`, `community_groups`, `post_*`, optional `user_follows`) |
| **CREATE** if missing in MySQL | engagement tables may already exist |
| **DROP** | **0** |

**New Prisma models (net):** ~5–6 new + 1 extended `SocialPost` + legacy `CommunityPost` frozen.

---

## 7. Persona → profile creation (logical)

| On signup / first visit | Auto-create |
|-------------------------|-------------|
| Any authenticated user | `community_user_profiles` with persona derived from `AppRole` map |
| Business workspace user | Optional `community_business_profiles` when flag on |

No auto-create from dealer/broker CRM hooks.

---

## 8. Rollback (schema)

1. Disable `FEATURE_COMMUNITY_*`.
2. Drop new `community_*` tables (if empty).
3. Revert `social_posts` column additions via backup restore (dev).
4. `community_posts` legacy data preserved.

---

## 9. Approval

Part of **Phase I0** — reply **Approve I0 schema** after reviewing [PHASE-I0-FOUNDATION.md](./PHASE-I0-FOUNDATION.md).
