# Phase J2 + J3 — Growth CRM UI & Poster Builder Applied

**Date:** 2026-06-04  
**Approval:** J2 Growth Dashboard UI + J3 Automotive Poster Builder MVP  
**References:** [PHASE-J1-MVP-BLUEPRINT.md](./PHASE-J1-MVP-BLUEPRINT.md), [PHASE-J1-APPLIED-RESULTS.md](./PHASE-J1-APPLIED-RESULTS.md)

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push | ✅ |
| No Dealer / Broker / Auction / Finance / Insurance / Community / Marketplace module changes | ✅ |
| No Razorpay / Meta / WhatsApp provider | ✅ |
| UI behind `FEATURE_GROWTH_V2` (Vite: `VITE_FEATURE_GROWTH_V2`, default off) | ✅ |
| J1 APIs consumed; mock WhatsApp send preserved | ✅ |
| Template-driven poster PNG export (no Canva editor) | ✅ |

**Additive backend (Growth-only):** `PATCH /api/growth/lead-forms/:id/events/:eventId` for lead status updates (no schema change).

**Additive auth:** `workspace-redirect.ts` allows `/dashboard/growth` for all signed-in roles.

---

## 2. Pages created

| Route | Page | Module |
|-------|------|--------|
| `/dashboard/growth` | Overview | J2 |
| `/dashboard/growth/workspaces` | Workspaces | J2 |
| `/dashboard/growth/assets` | Asset library | J2 |
| `/dashboard/growth/designs` | Designs list | J2 / J3 |
| `/dashboard/growth/designs/new` | Poster builder (new) | J3 |
| `/dashboard/growth/designs/:id` | Poster builder (edit) | J3 |
| `/dashboard/growth/whatsapp` | WhatsApp dashboard (tabs) | J2 |
| `/dashboard/growth/leads` | Lead forms list | J2 |
| `/dashboard/growth/leads/:formId` | Lead list + detail + filters | J2 |

When `VITE_FEATURE_GROWTH_V2` is off, layout shows a single “not enabled” message (no CRM data loaded).

---

## 3. Components created

| Component | Purpose |
|-----------|---------|
| `GrowthDashboardLayout` | Shell + flag gate + mobile nav |
| `GrowthSidebar` | Desktop sidebar navigation |
| `GrowthWorkspaceSwitcher` | Persisted workspace selector |
| `GrowthEmptyState` | Empty states |
| `GrowthLoadingState` | Skeleton loading |

**J3 libs**

| File | Purpose |
|------|---------|
| `config/poster-templates.ts` | 7 automotive templates |
| `lib/poster-canvas.ts` | Canvas render + PNG blob |

---

## 4. Poster templates (J3)

| Template ID | Name |
|-------------|------|
| `new_car_offer` | New Car Offer |
| `used_car_offer` | Used Car Offer |
| `exchange_bonus` | Exchange Bonus |
| `insurance_offer` | Insurance Offer |
| `finance_offer` | Finance Offer |
| `workshop_offer` | Workshop Offer |
| `parts_offer` | Parts Offer |

**Editor fields:** logo, vehicle image (from assets), offer title, description, price, CTA.  
**Actions:** Save design (`canvas_json`), Export PNG (client render → upload asset → `POST .../export`).

---

## 5. APIs consumed

| Area | Endpoints |
|------|-----------|
| Workspaces | `GET/POST /api/growth/workspaces`, `GET/PATCH .../:id`, `GET/PATCH .../entitlements` |
| Assets | `GET/POST /api/growth/assets`, `DELETE .../:id` |
| Designs | `GET/POST /api/growth/designs`, `GET/PATCH .../:id`, `POST .../export`, `GET .../exports` |
| WhatsApp | templates, contact-lists, members, broadcasts, `POST .../send` (mock) |
| Leads | `GET/POST lead-forms`, `GET events`, `PATCH events/:eventId` |

Header: `X-Growth-Workspace-Id` on workspace-scoped calls (via `growthWorkspaceStore`).

---

## 6. Files added

### Frontend `frontend/src/features/growth-crm/`

- `components/` — 5 files  
- `config/` — `growth-nav.ts`, `poster-templates.ts`  
- `lib/` — `poster-canvas.ts`  
- `pages/` — 8 pages  
- `services/` — `growth-api.service.ts`  
- `store/` — `growthWorkspaceStore.ts`  
- `index.ts`

### Backend (Growth-only)

- `backend/src/app/api/growth/lead-forms/[id]/events/[eventId]/route.ts`

---

## 7. Files modified

| File | Change |
|------|--------|
| `frontend/src/config/feature-flags.ts` | Growth Vite flags + `isGrowthUiEnabled()` |
| `frontend/src/auth/workspace-redirect.ts` | Allow `/dashboard/growth` paths |
| `frontend/src/router/index.tsx` | Growth route group |
| `frontend/src/router/lazy-pages.tsx` | Lazy Growth pages |
| `frontend/.env.example` | Growth flag docs |
| `backend/src/services/growth-lead-form.service.ts` | `updateLeadEventStatus` |

**Not modified:** Prisma, dealer/broker/community/marketplace feature code.

---

## 8. Feature flags (default OFF)

**Frontend (Vite):**

```env
VITE_FEATURE_GROWTH_V2=false
VITE_FEATURE_GROWTH_WORKSPACES=false
VITE_FEATURE_GROWTH_ASSETS=false
VITE_FEATURE_GROWTH_POSTERS=false
VITE_FEATURE_GROWTH_WHATSAPP=false
VITE_FEATURE_GROWTH_LEADS=false
```

**Backend (must match for API calls):** `FEATURE_GROWTH_*` per [PHASE-J1-APPLIED-RESULTS.md](./PHASE-J1-APPLIED-RESULTS.md).

Enable **both** frontend and backend flags for end-to-end testing.

---

## 9. Smoke tests

| Check | Expected |
|-------|----------|
| `VITE_FEATURE_GROWTH_V2` unset | Visit `/dashboard/growth` → “not enabled” message |
| Flags off | No Growth API traffic from UI |
| `GET /api/health` | Still 200 (unchanged) |
| Flags on + login | Create workspace → select in sidebar → assets/designs/whatsapp/leads |
| Poster export | Save → Export PNG → export row via J1 stub API |
| WhatsApp | Mock send on draft broadcast |
| Leads | Filter by status, search payload, PATCH status buttons |

**Note:** Full `npm run build` may fail on pre-existing `broker` `AppRole` typing in `constants.ts` / `permissions/matrix.ts` (unrelated to Growth).

---

## 10. Rollback plan

| Level | Action |
|-------|--------|
| **Runtime** | Keep `VITE_FEATURE_GROWTH_V2=false` → UI disabled |
| **Routes** | Remove Growth block from `router/index.tsx` + lazy exports |
| **Code** | Delete `frontend/src/features/growth-crm/` |
| **Auth** | Revert `workspace-redirect.ts` growth path exception |
| **API** | Delete `lead-forms/.../events/[eventId]/route.ts` if reverting status PATCH |

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Flags on in FE but off in BE | Document paired env vars; API returns 404 |
| Canvas CORS on external image URLs | Use uploaded assets (`/uploads/...`) |
| In-memory public lead rate limit | J1 service; Redis in later phase |
| Poster quality vs Canva | MVP template renderer only; J4+ editor |
| Workspace not selected | UI prompts + switcher in sidebar |

---

## 12. Approval gates

| Gate | Status |
|------|--------|
| J0 db | ✅ |
| J1 APIs | ✅ |
| **J2 UI + J3 poster MVP** | ✅ (this document) |
| J4 billing / real WhatsApp / advanced editor | ⏸ Waiting |

**Review:** Awaiting operator sign-off.
