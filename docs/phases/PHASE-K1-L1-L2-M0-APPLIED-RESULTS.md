# Phase K1 + L1 + L2 + M0 — Applied Results

**Date:** 2026-06-03  
**Approval:** K1 Monetization · L1 WhatsApp architecture · L2 Social scheduler · M0 Founder dashboard

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push | ✅ |
| No Dealer / Broker / Auction / Finance / Insurance / Community / Marketplace module edits | ✅ |
| No payment gateway / billing / live WhatsApp / social APIs | ✅ |
| Feature flags (default OFF → 404) | ✅ |

---

## 2. K1 — Directory monetization

### 2.1 Product surfaces

| Surface | Metadata keys |
|---------|----------------|
| Featured business (dealer, broker, DSA, insurance, workshop, parts) | `featured`, `featured_category` |
| Sponsored business | `sponsored`, `sponsored_tier` |
| Verified badge | `verification_badge`, `isVerified` |
| Premium listing placeholder | `premium_listing`, `premium_tier` |

Stored on `community_business_profiles.metadata` (no schema change).

### 2.2 APIs (new)

| Method | Path | Auth | Flag |
|--------|------|------|------|
| GET | `/api/directory/monetization/config` | Public | `FEATURE_K1_DIRECTORY_MONETIZATION` + directory |
| GET | `/api/directory/featured` | Public | same |
| GET | `/api/directory/featured/:category` | Public | same |
| GET | `/api/directory/sponsored` | Public | same |
| GET | `/api/directory/premium` | Public | same |
| GET | `/api/directory/verified` | Public | same |
| PATCH | `/api/directory/monetization/business/:id` | Platform admin | same |

### 2.3 UI

| Route | Page |
|-------|------|
| `/dashboard/super-admin/directory-monetization` | Admin K1 overview |

Directory hub (`GET /api/directory`) includes `monetization_k1` when K1 flag is on.

---

## 3. L1 — WhatsApp provider architecture (Growth only)

### 3.1 Components

- Provider adapters: `meta_cloud`, `gupshup`, `twilio`, `mock` (stubs, no HTTP)
- Message queue in `growth_workspaces.metadata.whatsapp_architecture`
- Template approval flow (draft → pending_provider → approved)
- Opt-in records in workspace metadata
- Delivery tracking map + existing `growth_message_logs` on mock send

### 3.2 APIs (new)

| Method | Path | Flag slice |
|--------|------|------------|
| GET | `/api/growth/whatsapp/providers/config` | `FEATURE_GROWTH_WHATSAPP_PROVIDERS` |
| GET/PATCH | `/api/growth/whatsapp/providers` | same + workspace header |
| GET/POST | `/api/growth/whatsapp/queue` | same |
| POST | `/api/growth/whatsapp/opt-in` | same |
| GET/POST | `/api/growth/whatsapp/templates/:id/approval` | same |
| GET | `/api/growth/whatsapp/delivery/:messageId` | same |

Header: `X-Growth-Workspace-Id`

### 3.3 UI

| Route | Page |
|-------|------|
| `/dashboard/growth/whatsapp/architecture` | Provider config, queue, stub process |

---

## 4. L2 — Social scheduler architecture (Growth only)

### 4.1 Model (workspace metadata `social_scheduler`)

- Channels: Facebook, Instagram, LinkedIn, YouTube (disconnected placeholders)
- Schedules
- Publishing queue
- Analytics hooks (placeholder metrics)

### 4.2 APIs (new)

| Method | Path | Flag |
|--------|------|------|
| GET | `/api/growth/social/config` | `FEATURE_GROWTH_SOCIAL_SCHEDULER` |
| GET | `/api/growth/social/channels` | same |
| GET/POST | `/api/growth/social/schedules` | same |
| GET/POST | `/api/growth/social/queue` | same |
| GET | `/api/growth/social/analytics` | same |

### 4.3 UI

| Route | Page |
|-------|------|
| `/dashboard/growth/social` | Channels, schedules, queue, analytics stubs |

---

## 5. M0 — Founder / investor dashboard

### 5.1 Metrics (read-only counts)

- Total users, dealers, brokers
- Directory listings (`community_business_profiles`)
- Growth leads (`growth_lead_capture_events`)
- Campaigns (`growth_whatsapp_broadcasts`)
- Community posts (`social_posts`)
- Revenue placeholders (null + note)

### 5.2 API

| Method | Path | Auth | Flag |
|--------|------|------|------|
| GET | `/api/founder/overview` | Platform admin | `FEATURE_M0_FOUNDER_DASHBOARD` |

### 5.3 UI

| Route | Page |
|-------|------|
| `/dashboard/super-admin/founder` | Founder dashboard |
| `/dashboard/founder` | Alias (super_admin layout) |

---

## 6. Feature flags

### Backend (`backend/.env`)

```env
FEATURE_K1_DIRECTORY_MONETIZATION=false   # requires FEATURE_BUSINESS_DIRECTORY_V2
FEATURE_GROWTH_WHATSAPP_PROVIDERS=false   # requires FEATURE_GROWTH_WHATSAPP
FEATURE_GROWTH_SOCIAL_SCHEDULER=false     # requires FEATURE_GROWTH_WORKSPACES
FEATURE_M0_FOUNDER_DASHBOARD=false
```

### Frontend (`frontend/.env.local`)

```env
VITE_FEATURE_K1_DIRECTORY_MONETIZATION=false
VITE_FEATURE_GROWTH_WHATSAPP_PROVIDERS=false
VITE_FEATURE_GROWTH_SOCIAL_SCHEDULER=false
VITE_FEATURE_M0_FOUNDER_DASHBOARD=false
```

---

## 7. Smoke tests

```bash
cd backend
npx tsx scripts/smoke-k1-l1-l2-m0.ts
```

**Flags OFF (default):** listed routes → **404**; `/api/health` → **200**.

**Flags ON:** enable parent flags + phase flags, restart API, re-run smoke expecting **200** (founder requires admin JWT — test manually).

---

## 8. Rollback plan

1. Set all four phase flags to `false` (backend + frontend).
2. Restart backend and rebuild frontend.
3. New routes return **404**; existing Growth/Directory J-flows unchanged.
4. Metadata written under K1/L1/L2 remains in DB but is ignored when flags are off.
5. No migration to revert.

---

## 9. Revenue model readiness

| Layer | Ready for |
|-------|-----------|
| K1 | Razorpay/Stripe product SKUs for featured/sponsored/premium; admin PATCH already sets metadata |
| L1 | Provider credentials + webhook ingress; queue → worker; template sync with Meta/Gupshup/Twilio |
| L2 | OAuth channel connect + publish workers; analytics from platform APIs |
| M0 | Wire MRR/ARR from subscriptions table when billing exists |

**Not implemented:** payments, invoices, provider credentials, external API calls.

---

## 10. Files added / modified (high level)

### Backend — added

- `src/lib/directory/monetization-meta.ts`, `src/services/directory-monetization.service.ts`
- `src/app/api/directory/monetization/**`, `featured/**`, `sponsored`, `premium`, `verified`
- `src/lib/growth/whatsapp/**`, `src/services/growth-whatsapp-architecture.service.ts`
- `src/app/api/growth/whatsapp/providers/**`, `queue`, `opt-in`, `templates/[id]/approval`, `delivery/[messageId]`
- `src/lib/growth/social-scheduler/**`, `src/services/growth-social-scheduler.service.ts`
- `src/app/api/growth/social/**`
- `src/lib/founder/guard.ts`, `src/services/founder-dashboard.service.ts`, `src/app/api/founder/overview`
- `scripts/smoke-k1-l1-l2-m0.ts`

### Frontend — added

- `features/founder-dashboard/`
- `features/growth-crm/pages/GrowthWhatsappArchitecturePage.tsx`
- `features/growth-crm/pages/GrowthSocialSchedulerPage.tsx`
- `features/platform-admin/pages/DirectoryMonetizationPage.tsx`
- `integrations/api/founder.ts`

### Modified

- `backend/src/config/feature-flags.ts`, `backend/.env.example`
- `backend/src/lib/directory/guard.ts`, `map-business.ts`, `app/api/directory/route.ts`
- `backend/src/lib/growth/guard.ts`
- `frontend/src/config/feature-flags.ts`, `.env.example`
- Router, growth nav, admin ERP nav, workspace redirect, API clients

---

**Status:** Ready for review. Enable flags per environment to activate.
