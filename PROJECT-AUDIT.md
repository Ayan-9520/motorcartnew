# Motorcart Project Audit Report

**Date:** 2026-05-23  
**Stack:** React/Vite frontend + Next.js/Prisma/MySQL backend

---

## Executive summary

| Area | Status |
|------|--------|
| UI / layout / routes | ✅ Unchanged (as required) |
| Supabase npm package | ✅ Removed from frontend |
| API compatibility layer | ✅ `integrations/api/*` replaces SDK |
| MySQL + Prisma (70 tables) | ✅ Synced |
| Auth (JWT) | ✅ Working when backend runs |
| Generic CRUD `/api/db/query` | ✅ Core path for dashboards |
| Dedicated REST routes | ⚠️ Partial (auth, vehicles, leads, auctions, notifications, upload) |
| RPC functions | ✅ Expanded (was 2, now 15+) |
| Socket.io realtime | ⚠️ Basic (join + db events); not all Supabase channels replicated |
| File uploads | ✅ `/api/upload` + `/uploads` static |

---

## Working modules

- **Auth:** login, register, refresh, logout, me, session, OTP, forgot/reset password
- **Public browse:** vehicles list, dealers (via db query), parts catalog (with mock fallback)
- **Customer dashboard:** loads via db query + mock snapshot fallback
- **Dealer CRM:** leads insert/select, vehicles CRUD (authenticated)
- **Auctions:** list, bid RPC, realtime channel scaffold
- **Parts:** catalog query, orders RPC + localStorage fallback
- **Finance / Insurance:** applications via db query + RPC stubs
- **Platform admin:** users/dealers/vehicles queries (mock fallback on errors)
- **Community:** social_posts, groups (db query)
- **Service booking:** centers, services, bookings tables

---

## Broken / partial modules

| Module | Issue | Mitigation |
|--------|-------|------------|
| Parts checkout | `part_order_items` FK was `part_products`; fixed to `parts` | Run `npx prisma db push` |
| Finance pipeline | Some RPC return stubs only | Mock data still used in UI |
| Service booking OTP/invoice | RPC stubs return `ok` | UI may use mock flow |
| Insurance submit | RPC creates row; complex Postgres RPC logic not ported | Fallback in service |
| Realtime notifications | `postgres_changes` `*` event | Patched in api/realtime.ts |
| Join queries | `select('*, dealers(...)')` not supported | Falls back to mock vehicles |
| Analytics table | Mapped to `activity_logs` | Inserts use activityLog shape |

---

## Missing APIs (optional dedicated routes)

These work via `/api/db/query` but lack dedicated controllers:

- `/api/finance/*`
- `/api/insurance/*`
- `/api/community/*`
- `/api/admin/*` (bulk)
- `/api/services/*`

Not required if db query + RPC cover frontend calls.

---

## Remaining “Supabase” usage

**Not the Supabase SDK** — only import path name:

- `@/integrations/supabase/client` → re-exports REST API client
- `@/shared/api/client` → same
- Comments in `types/database.ts`

**Scripts fixed:** `seed-vehicles.ts`, `confirm-user-email.ts` use MySQL backend.

---

## Security notes

| Item | Severity | Note |
|------|----------|------|
| JWT secrets in `.env` | Medium | Change for production |
| Dev write on `vehicles`/`leads` without auth | Low | Only `NODE_ENV !== production` |
| No rate limit on auth | Medium | Add express-rate-limit on `/api/auth/*` |
| CORS single origin | OK | `localhost:3000` configured |
| Password bcrypt | OK | 12 rounds |

---

## Required user actions

1. **Start backend** (frontend alone is not enough):
   ```powershell
   cd backend
   npm run dev
   ```
2. **Apply schema fix** (PartOrderItem):
   ```powershell
   npx prisma db push
   ```
3. **Verify health:** http://localhost:3001/api/health
4. **Login test:** customer@motorcart.in / Customer@123

---

## Runtime checklist

- [ ] Backend on :3001
- [ ] Frontend on :3000
- [ ] `VITE_API_URL=http://localhost:3001` in `frontend/.env.local`
- [ ] MySQL running (XAMPP)
- [ ] `npx prisma db push` after schema updates

---

## Fixes applied in this audit

1. Expanded RPC handlers (auctions, parts orders, finance, insurance, bookings)
2. `analytics` → `activity_log` table mapping
3. Auth login returns `user_metadata.role` for frontend hydration
4. Realtime `*` event support for notifications
5. `PartOrderItem` FK → `parts` table
6. `/api/health` endpoint
7. Query handler `not.is` filter support
8. Socket emit helper for auction bids

---

## Production readiness

| Ready | Not yet |
|-------|---------|
| Monorepo structure | E2E tests |
| JWT auth | Email SMTP |
| Prisma schema | Redis cache |
| CORS | Payment gateway |
| Uploads folder | Full RPC parity with Postgres functions |

**Verdict:** Stable for **local dev** with mock fallbacks. Production needs hardening (secrets, rate limits, email, payment) without UI changes.
