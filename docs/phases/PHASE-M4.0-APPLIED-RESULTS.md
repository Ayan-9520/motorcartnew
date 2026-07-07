# Phase M4.0 — Unified Notification Center — Applied Results

**Date:** 2026-06-04  
**Approval:** M4.0 Unified Notification Center  
**References:** [PHASE-M1-UNIFIED-ECOSYSTEM-PLAN.md](./PHASE-M1-UNIFIED-ECOSYSTEM-PLAN.md), [PHASE-M3.0-APPLIED-RESULTS.md](./PHASE-M3.0-APPLIED-RESULTS.md)

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push | ✅ |
| No breaking changes | ✅ (`GET /api/notifications` legacy unchanged) |
| No Dealer / Broker / Auction / Finance / Insurance module edits | ✅ |
| Aggregation only — no source record moves | ✅ |
| Mark read via overlay only | ✅ |
| Feature flag default OFF → 404 | ✅ |

**Read overlay:** `backend/.data/unified-notifications/read-state.json` (gitignored). PATCH does **not** update `notifications`, `auction_notifications`, or other source tables.

---

## 2. APIs added

| Method | Path | Auth | Flag |
|--------|------|------|------|
| GET | `/api/notifications/overview` | JWT | `FEATURE_M4_NOTIFICATIONS` |
| GET | `/api/notifications/list` | JWT | same |
| PATCH | `/api/notifications/:id/read` | JWT | same (`id` = unified id, URL-encoded) |
| PATCH | `/api/notifications/read-all` | JWT | same |

**Query params (`/list`):** `unread_only`, `source`, `limit`, `offset`

**Unified id format:** `{source}:{native_id}` (e.g. `auction:uuid`, `community:uuid`)

### Aggregation sources (read-only)

| Source | Origin |
|--------|--------|
| `community` | `notifications` (user rows, non-system kind) |
| `auction` | `auction_notifications` |
| `growth` | `growth_message_logs` (owner workspaces, outbound) |
| `system` | `notification_logs` + recent `platform_notifications` |
| `lead_router` | M3 `.data/lead-router/leads.json` (owner match) |
| `directory` | `community_follow` on owned business profiles |

Each item includes: `title`, `body`, `created_at`, `deep_link`, `is_read` (native + overlay), `native_id`.

---

## 3. Notification flow diagram

```mermaid
flowchart TB
  subgraph Sources["Source tables / stores — not modified"]
    N[notifications]
    AN[auction_notifications]
    GL[growth_message_logs]
    NL[notification_logs]
    PN[platform_notifications]
    LR[lead-router JSON]
    CF[community_follow]
  end

  subgraph M4["M4 Aggregation layer"]
    AGG[unified-notifications.service]
    RS[(read-state.json overlay)]
  end

  subgraph API["APIs"]
    OV[GET /overview]
    LS[GET /list]
    MR[PATCH /:id/read]
    MA[PATCH /read-all]
  end

  subgraph UI["Frontend"]
    PAGE[/notifications]
  end

  N & AN & GL & NL & PN & LR & CF --> AGG
  AGG --> OV & LS
  MR & MA --> RS
  RS -.->|is_read overlay| AGG
  OV & LS --> PAGE
  MR & MA --> PAGE
```

---

## 4. Frontend

| Route | Page |
|-------|------|
| `/notifications` | `UnifiedNotificationsPage` |

**Features:** All / Unread only, source filter, mark read, mark all read, deep links.

Flag: `VITE_FEATURE_M4_NOTIFICATIONS`

---

## 5. Files added

### Backend

- `src/lib/unified-notifications/types.ts`
- `src/lib/unified-notifications/guard.ts`
- `src/lib/unified-notifications/read-state.ts`
- `src/services/unified-notifications.service.ts`
- `src/app/api/notifications/overview/route.ts`
- `src/app/api/notifications/list/route.ts`
- `src/app/api/notifications/read-all/route.ts`
- `src/app/api/notifications/[id]/read/route.ts`
- `scripts/smoke-m4-notifications.ts`

### Frontend

- `src/integrations/api/unified-notifications.ts`
- `src/features/notifications-center/pages/UnifiedNotificationsPage.tsx`
- `src/features/notifications-center/index.ts`

---

## 6. Files modified

- `backend/src/config/feature-flags.ts`
- `backend/.env.example`
- `.gitignore`
- `frontend/src/config/feature-flags.ts`
- `frontend/.env.example`
- `frontend/src/router/index.tsx`
- `frontend/src/auth/workspace-redirect.ts`

---

## 7. Feature flags

```env
FEATURE_M4_NOTIFICATIONS=false
VITE_FEATURE_M4_NOTIFICATIONS=false
```

---

## 8. Smoke tests

```bash
cd backend
npx tsx scripts/smoke-m4-notifications.ts
```

**Flags OFF:** M4 routes → **404**; legacy `GET /api/notifications` → **401** without token (unchanged).

---

## 9. Rollback plan

1. Set M4 flags to `false` on API and Vite; restart.
2. M4 endpoints return 404; legacy `/api/notifications` unchanged.
3. Optional: delete `backend/.data/unified-notifications/`.
4. No DB rollback.

---

**Status:** Ready for review.
