# Phase J1 — Growth CRM MVP APIs Applied

**Date:** 2026-06-04  
**Approval:** J1 Growth CRM MVP implementation  
**References:** [PHASE-J1-MVP-BLUEPRINT.md](./PHASE-J1-MVP-BLUEPRINT.md), [PHASE-J0-MVP-APPLIED-RESULTS.md](./PHASE-J0-MVP-APPLIED-RESULTS.md)

---

## 1. Summary

| Rule | Status |
|------|--------|
| No Prisma / db push / migrations | ✅ |
| No Dealer / Broker / Auction / Finance / Insurance / Community / Marketplace code changes | ✅ |
| Growth APIs behind flags (default **OFF** → **404**) | ✅ |
| No UI, Razorpay, Meta, WhatsApp provider, AI, Canva | ✅ |
| Leads stored in `growth_lead_capture_events` only | ✅ |
| WhatsApp send = **mock** (`provider_id: mock-j1`) | ✅ |

---

## 2. Feature flags (all default `false`)

| Env variable | Slice |
|--------------|--------|
| `FEATURE_GROWTH_V2` | Master (required for any Growth route) |
| `FEATURE_GROWTH_WORKSPACES` | Workspaces + entitlements |
| `FEATURE_GROWTH_ASSETS` | Asset library |
| `FEATURE_GROWTH_POSTERS` | Designs / poster foundation |
| `FEATURE_GROWTH_WHATSAPP` | Templates, lists, broadcasts, logs |
| `FEATURE_GROWTH_LEADS` | Lead forms + public submit |

**Gate logic:** `FEATURE_GROWTH_V2` **and** the slice flag must be true. Otherwise → `404 Not found`.

**Workspace-scoped routes** require header:

```http
X-Growth-Workspace-Id: {uuid}
```

Documented in `backend/.env.example`.

---

## 3. API list

### A — Workspace management (`FEATURE_GROWTH_WORKSPACES`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/api/growth/workspaces` | JWT | List owned workspaces |
| POST | `/api/growth/workspaces` | JWT | Create workspace + entitlements |
| GET | `/api/growth/workspaces/:id` | JWT | Detail + entitlements |
| PATCH | `/api/growth/workspaces/:id` | JWT | Update name, metadata, plan slug |
| GET | `/api/growth/workspaces/:id/entitlements` | JWT | Entitlements row |
| PATCH | `/api/growth/workspaces/:id/entitlements` | JWT | Update limits / usage / plan |

**`business_type` values:** `dealer`, `broker`, `dsa`, `insurance_agent` (alias `insurance`), `workshop`, `parts_seller` (alias `parts`), `influencer`

### B — Asset library (`FEATURE_GROWTH_ASSETS`)

| Method | Path | Header | Notes |
|--------|------|--------|--------|
| GET | `/api/growth/assets?kind=image\|video\|logo` | Workspace | List (soft-delete aware) |
| POST | `/api/growth/assets` | Workspace | Multipart upload **or** JSON register |
| GET | `/api/growth/assets/:id` | Workspace | Detail |
| DELETE | `/api/growth/assets/:id` | Workspace | Soft delete (`deleted_at`) |

Upload path: `uploads/growth/{workspaceId}/assets/{timestamp}.{ext}` → `public_url` `/uploads/growth/...`

### C — Poster builder (`FEATURE_GROWTH_POSTERS`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/growth/designs` | List designs |
| POST | `/api/growth/designs` | Create draft (`canvas_json`) |
| GET | `/api/growth/designs/:id` | Get canvas |
| PATCH | `/api/growth/designs/:id` | Save canvas / name / status |
| DELETE | `/api/growth/designs/:id` | Archive |
| POST | `/api/growth/designs/:id/export` | Stub export (no renderer) |
| GET | `/api/growth/designs/:id/exports` | Export history |

### D — WhatsApp marketing (`FEATURE_GROWTH_WHATSAPP`)

| Method | Path |
|--------|------|
| GET/POST | `/api/growth/whatsapp/templates` |
| GET/PATCH/DELETE | `/api/growth/whatsapp/templates/:id` |
| GET/POST | `/api/growth/whatsapp/contact-lists` |
| GET/PATCH/DELETE | `/api/growth/whatsapp/contact-lists/:id` |
| POST | `/api/growth/whatsapp/contact-lists/:id/members` |
| DELETE | `/api/growth/whatsapp/contact-lists/:id/members/:memberId` |
| GET/POST | `/api/growth/whatsapp/broadcasts` |
| GET/PATCH | `/api/growth/whatsapp/broadcasts/:id` |
| POST | `/api/growth/whatsapp/broadcasts/:id/schedule` |
| POST | `/api/growth/whatsapp/broadcasts/:id/send` | **Mock send** |
| POST | `/api/growth/whatsapp/broadcasts/:id/cancel` |
| GET | `/api/growth/whatsapp/broadcasts/:id/recipients` |
| GET | `/api/growth/whatsapp/message-logs?broadcast_id=` |

**Mock send:** expands list members → `growth_whatsapp_broadcast_recipients` + `growth_message_logs` with `status: delivered`, `provider_id: mock-j1`. No external API.

### E — Lead forms (`FEATURE_GROWTH_LEADS`)

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/growth/lead-forms` | JWT + workspace header |
| GET/PATCH | `/api/growth/lead-forms/:id` | JWT + workspace header |
| GET | `/api/growth/lead-forms/:id/events` | Lead listing (`growth_lead_capture_events`) |
| GET | `/api/growth/lead-forms/public/:workspaceSlug/:formSlug` | Public meta |
| POST | `/api/growth/lead-forms/public/:workspaceSlug/:formSlug/submit` | Public submit (rate limited) |

Submissions write **only** to `growth_lead_capture_events` (not `leads` / `dealer_leads`).

---

## 4. Files added

### `backend/src/lib/growth/`

| File | Role |
|------|------|
| `constants.ts` | Header name, business types, default limits |
| `slug.ts` | Workspace/form slug helpers |
| `entitlements.ts` | Quota checks, usage increments, 402 |
| `guard.ts` | Feature flags + workspace access |
| `http.ts` | Quota error mapping |

### `backend/src/services/`

| File | Role |
|------|------|
| `growth-workspace.service.ts` | Workspace CRUD + entitlements |
| `growth-asset.service.ts` | Assets + quotas |
| `growth-design.service.ts` | Designs + stub export |
| `growth-whatsapp.service.ts` | Templates, lists, members |
| `growth-broadcast.service.ts` | Broadcasts + mock send + logs |
| `growth-lead-form.service.ts` | Forms, events, public submit |

### `backend/src/app/api/growth/` (27 route files)

```
workspaces/route.ts
workspaces/[id]/route.ts
workspaces/[id]/entitlements/route.ts
assets/route.ts
assets/[id]/route.ts
designs/route.ts
designs/[id]/route.ts
designs/[id]/export/route.ts
designs/[id]/exports/route.ts
whatsapp/templates/route.ts
whatsapp/templates/[id]/route.ts
whatsapp/contact-lists/route.ts
whatsapp/contact-lists/[id]/route.ts
whatsapp/contact-lists/[id]/members/route.ts
whatsapp/contact-lists/[id]/members/[memberId]/route.ts
whatsapp/broadcasts/route.ts
whatsapp/broadcasts/[id]/route.ts
whatsapp/broadcasts/[id]/schedule/route.ts
whatsapp/broadcasts/[id]/send/route.ts
whatsapp/broadcasts/[id]/cancel/route.ts
whatsapp/broadcasts/[id]/recipients/route.ts
whatsapp/message-logs/route.ts
lead-forms/route.ts
lead-forms/[id]/route.ts
lead-forms/[id]/events/route.ts
lead-forms/public/[workspaceSlug]/[formSlug]/route.ts
lead-forms/public/[workspaceSlug]/[formSlug]/submit/route.ts
```

---

## 5. Files modified

| File | Change |
|------|--------|
| `backend/src/config/feature-flags.ts` | Added 6 Growth flags (default off) |
| `backend/.env.example` | Documented Growth env vars |

**Not modified:** `schema.prisma`, dealer/broker/community/auction/finance/insurance/marketplace routes, `table-map.ts`, frontend.

---

## 6. Smoke test report

**Environment:** `http://localhost:3001`, flags **unset** (default off)

### Growth (expect 404)

| Route | Status |
|-------|--------|
| GET `/api/growth/workspaces` | **404** |
| GET `/api/growth/assets` | **404** |
| GET `/api/growth/designs` | **404** |
| GET `/api/growth/whatsapp/templates` | **404** |
| GET `/api/growth/lead-forms` | **404** |
| GET `/api/growth/lead-forms/public/test-ws/test-form` | **404** |

### Existing domains (unchanged)

| Route | Status |
|-------|--------|
| GET `/api/health` | **200** |
| GET `/api/vehicles?limit=1` | **200** |
| GET `/api/auctions` | **200** |

### Enable Growth for staging (example)

```env
FEATURE_GROWTH_V2=true
FEATURE_GROWTH_WORKSPACES=true
FEATURE_GROWTH_ASSETS=true
FEATURE_GROWTH_POSTERS=true
FEATURE_GROWTH_WHATSAPP=true
FEATURE_GROWTH_LEADS=true
```

Restart backend, then call APIs with JWT + `X-Growth-Workspace-Id` after creating a workspace via POST `/api/growth/workspaces`.

---

## 7. Rollback plan

| Level | Action |
|-------|--------|
| **Runtime** | Remove or set all `FEATURE_GROWTH_*` to `false`; restart backend → all `/api/growth/*` return 404 |
| **Code** | Delete `backend/src/app/api/growth/`, `backend/src/lib/growth/`, `growth-*.service.ts`; revert `feature-flags.ts` and `.env.example` |
| **Data** | Growth tables remain in DB (J0); optional drop per [PHASE-J0-MVP-APPLIED-RESULTS.md](./PHASE-J0-MVP-APPLIED-RESULTS.md) §10.2 |

No migration rollback required for J1 (schema unchanged).

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Flag misconfiguration exposes APIs early | Med | All flags default off; 404 when off |
| Confusion with `broker_whatsapp_*` | Med | Separate `growth_whatsapp_*` tables and `/api/growth/whatsapp/*` prefix |
| Mock send mistaken for production | Med | `provider_id: mock-j1`, metadata `mock_send: true` |
| Public lead spam | Med | In-memory rate limit (10/min/IP); upgrade to Redis in J2 |
| Quota bypass | Low | `402 quota_exceeded` on entitlements enforcement |
| PII in `growth_lead_capture_events` | Med | Retention policy in J2+; no bridge to dealer CRM in MVP |
| `tsc` pre-existing errors in unrelated files | Low | Growth-only paths compile; repo has legacy TS issues |

---

## 9. Out of scope (confirmed)

- Frontend `growth-crm` module / routes
- Razorpay billing webhooks
- Meta / Twilio / Gupshup
- Canva editor / AI poster generation
- Community / marketplace integration
- `GET /api/growth/overview` hub (deferred)

---

## 10. Approval gates

| Gate | Status |
|------|--------|
| J0 MVP db push | ✅ |
| **J1 MVP APIs** | ✅ (this document) |
| J2 UI + billing + real WhatsApp | ⏸ Waiting |

**Review:** Awaiting operator sign-off before J2 UI or provider integrations.
