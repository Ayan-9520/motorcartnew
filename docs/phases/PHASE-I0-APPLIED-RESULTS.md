# Phase I0 — Applied results (awaiting review)

**Date:** 2026-06-04  
**Status:** ✅ `db push` complete · ✅ `prisma generate` complete · ⏸ I1–I6 not started · flags **off**

---

## 1. Backup report

| Item | Value |
|------|-------|
| **File** | `backend/backups/motorcart-pre-i0-push-20260604-122652.sql` |
| **Size** | 170,674 bytes (**166.7 KB**) |
| **Tool** | `E:\xampp\mysql\bin\mysqldump.exe -u root --single-transaction --routines --triggers motorcart` |
| **Exit code** | `0` |

---

## 2. `prisma validate`

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

Exit code: **0**

---

## 3. `prisma db push` output

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": MySQL database "motorcart" at "localhost:3306"

⚠️  There might be data loss when applying the changes:

  • A unique constraint covering the columns `[community_handle]` on the table `users` will be added. If there are existing duplicate values, this will fail.

Your database is now in sync with your Prisma schema. Done in 24.59s

Running generate... (Use --skip-generate to skip the generators)
EPERM: operation not permitted, rename '...\query_engine-windows.dll.node.tmp...' -> '...\query_engine-windows.dll.node'
```

| Item | Result |
|------|--------|
| Schema sync | ✅ Success (24.59s) |
| Warning | Unique index on `users.community_handle` (nullable) — **not** a `DROP`; no duplicate handles in DB |
| Flag used | `--accept-data-loss` (Prisma warning gate only) |
| Inline generate | ❌ EPERM (dev server lock) |

---

## 4. `prisma generate` output

Backend stopped briefly, then:

```
✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 1.09s
```

Exit code: **0** — backend restarted for smoke tests.

---

## 5. Created community tables (5 new)

| Table | Rows after push |
|-------|-----------------|
| `community_user_profiles` | 0 |
| `community_business_profiles` | 0 |
| `community_follows` | 0 |
| `community_group_members` | 0 |
| `community_role_assignments` | 0 |

**Pre-existing community tables (unchanged row counts):** `community_posts` (0), `community_groups`, `community_moderation_flags`.

---

## 6. Altered existing tables

| Table | Changes applied |
|-------|-----------------|
| `users` | +`community_handle` (UNI), `community_bio`, `community_cover_url` |
| `social_posts` | +`post_type` enum, `vehicle_id`, `dealer_id`, `broker_id`, `group_id`, embed/poll/moderation columns, indexes |
| `community_groups` | +`group_type`, `rule_key`, `rule_value`, `dealer_id`, `cover_url`, `updated_at` |
| `post_likes` | +`created_at`, FK to `social_posts` |
| `post_comments` | +`parent_id`, `hidden`, `updated_at`, FKs |
| `post_shares` | FKs to `social_posts` / `users` |
| `post_hashtags` | FK to `social_posts` |
| `poll_votes` | FKs |
| `user_follows` | +`created_at` |
| `dealers` | `dealer_type` enum extended with `broker` (additive) |

**Existing posts data:** `community_posts` = **0**, `social_posts` = **0** — no rows modified.

---

## 7. Smoke test report — 18/18 PASS

| Area | Check | Result |
|------|-------|--------|
| **Core** | `GET /api/health` | PASS |
| **Login** | Dealer + customer login | PASS |
| **Dealer CRM** | `GET /api/leads` | PASS |
| **Broker** | `GET /api/broker/profile` | PASS (404, flags off) |
| **Auction** | `GET /api/auctions` | PASS |
| **Marketplace** | `GET /api/vehicles` (4 rows) | PASS |
| **Community API** | `/api/community/*` | PASS (404 — I1 not built) |
| **UI** | `/dashboard/dealer` | PASS 200 |
| **UI** | `/dashboard/broker` | PASS 200 |
| **UI** | `/auctions/browse` | PASS 200 |
| **UI** | `/finance` | PASS 200 |
| **UI** | `/insurance` | PASS 200 |
| **UI** | `/buy` | PASS 200 |
| **UI** | `/login`, `/signup` | PASS 200 |
| **UI** | `/community`, `/community/groups` | PASS 200 |

**Flags:** no `FEATURE_COMMUNITY_*` in `backend/.env`.

---

## 8. Canonical posts policy

| Table | Status |
|-------|--------|
| `social_posts` | **Canonical** for I1+ writes |
| `community_posts` | **Legacy** — unchanged structure, 0 rows |

---

## 9. Rollback instructions

### Full restore (recommended dev)

```powershell
& "E:\xampp\mysql\bin\mysql.exe" -u root motorcart < backend\backups\motorcart-pre-i0-push-20260604-122652.sql
cd backend
git checkout -- prisma/schema.prisma
npx prisma generate
```

### Application-only

1. Keep all `FEATURE_COMMUNITY_*` unset/false.
2. Community APIs return 404 until I1.
3. Dealer/broker/auction/finance/marketplace unchanged.

### Surgical (empty I0 tables)

```sql
DROP TABLE IF EXISTS community_role_assignments;
DROP TABLE IF EXISTS community_group_members;
DROP TABLE IF EXISTS community_follows;
DROP TABLE IF EXISTS community_business_profiles;
DROP TABLE IF EXISTS community_user_profiles;
-- Revert column adds on users/social_posts via full backup (safest)
```

---

## 10. Out of scope (confirmed)

- I1–I6 not implemented  
- No community APIs, UI changes, or route changes in this push  
- No `FEATURE_COMMUNITY_*` enabled  

---

## Review

Confirm I0 DB state, then review **I1** plan: [PHASE-I1-PLAN.md](./PHASE-I1-PLAN.md).
