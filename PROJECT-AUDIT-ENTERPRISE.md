# MotorCart — Enterprise Safe Enhancement Audit

**Role:** Principal Architect / CTO review  
**Date:** 2026-06-03  
**Constraint:** No rewrites. Extend only. Preserve routes, APIs, deployment, and working modules.

**Stack (actual):**

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, React Router 7, Zustand, TanStack Query |
| Backend | Next.js 15 API routes, custom `server.ts`, Socket.io |
| Database | PostgreSQL via Prisma (~78 models) |
| Auth | JWT (access + refresh), bcrypt |
| Legacy reference | `backend/supabase/migrations/*.sql` (historical — do not import) |

---

## Phase 1 — Full Project Audit

### 1.1 Repository structure

```
motorcart/
├── frontend/          SPA (Vite) — primary UI
├── backend/           API + Prisma + uploads
├── PROJECT-AUDIT.md   Prior technical audit
├── DEV-START.md       Dev runbook
├── MIGRATION.md       Migration notes
└── frontend/DEPLOY.md Static dist upload guide
```

### 1.2 Frontend audit

| Area | Status | Notes |
|------|--------|-------|
| Router | ✅ Large single router | `frontend/src/router/index.tsx` (~1100 lines) |
| Code splitting | ✅ Partial | `router/lazy-pages.tsx` for heavy dashboards |
| Auth | ✅ JWT session | `AuthProvider`, `useAuthBootstrap`, `ProtectedRoute` |
| Marketplace | ✅ Working | Mock catalog + DB merge in `vehicle.service.ts` |
| Dealer CRM | ✅ Partial real | Inventory, leads, enquiries; some mock calls |
| New-car OS | ⚠️ Mixed | Real insert paths; many `NcdModulePlaceholder` pages |
| Parts supplier ERP | ✅ UI complete | ~70 routes; mock-heavy services |
| Service partner ERP | ✅ UI complete | ~50 routes; mock-heavy services |
| Finance desks | ⚠️ Mixed | DSA/lender/manager UIs; RPC + mock fallbacks |
| Auctions | ⚠️ Mixed | Room UI + socket; mock hub data |
| Community | ⚠️ Partial | Feed UI; DB `social_posts` via generic query |
| Customer ecosystem | ⚠️ Mixed | Rich UI; mock snapshot fallbacks |
| Super-admin | ⚠️ Mixed | Full ERP nav; `VITE_ADMIN_DEMO_FALLBACK` |
| Build / deploy | ✅ Fixed | `npm run build` → `dist/`; `.htaccess` SPA |
| SEO | ⚠️ Basic | `setPageMeta`, static `index.html` meta |
| Mobile | ✅ Responsive | Tailwind + mobile nav components |

### 1.3 Backend audit

| Area | Status | Notes |
|------|--------|-------|
| Dedicated REST routes | 34 route files | Auth, vehicles, leads, auctions, upload, admin subset, health |
| Generic CRUD | ✅ Core pattern | `POST/GET/PATCH/DELETE /api/db/query` |
| RPC layer | ✅ 15+ handlers | `POST /api/db/rpc/[fn]` |
| Realtime | ⚠️ Basic | Socket.io join rooms; not full Supabase parity |
| File upload | ✅ | `POST /api/upload`, static `/uploads` |
| Prisma schema | ✅ 78 models | Source of truth for PostgreSQL |
| Migrations folder | Reference only | Postgres SQL — historical |

**Dedicated API map (high level):**

- **Auth:** login, register, refresh, logout, me, session, OTP, OAuth, forgot/reset, settings
- **Public/commerce:** vehicles, leads (POST public), auctions, notifications (auth)
- **Admin:** users, business-accounts approve/reject, dealers pending, finance applications, overview, flows
- **Infra:** health, upload, db/query, db/rpc

### 1.4 Database audit

| Item | Finding |
|------|---------|
| ORM | Prisma `schema.prisma` — apply via `npx prisma db push` |
| Table count | ~78 models (vehicles, dealers, leads, auctions, finance, parts, bookings, community, etc.) |
| Wishlists | `wishlists` table exists; frontend partially wired |
| Leads | `leads` + `dealer_leads` (new-car) — enquiry flow uses `leads` |
| Join queries | Not supported in API query builder — UI uses mocks when `select('*, dealers(...)')` fails |
| Legacy SQL | 33 files under `backend/supabase/migrations/` — documentation only |

### 1.5 Authentication & roles

**Implemented `AppRole` values:** customer, dealer, used_car_dealer, new_car_dealer, bike_dealer, truck_dealer, dsa_agent, bank_nbfc, finance_manager, service_center, service_technician, parts_seller, admin, super_admin, auction_partner, service_partner (legacy), preowned_dealer (legacy).

**Vision roles not first-class yet:** Broker, Insurance Agent, Fleet Owner, Equipment Dealer, Auction Buyer/Seller (split), OEM, NBFC, Bank, Insurance Company (bank_nbfc partially covers lender).

**Guards:** `ProtectedRoute`, `workspace-role.ts`, `permissions/matrix.ts`, pending business approval gate.

### 1.6 Deployment configuration

| Item | Location | Status |
|------|----------|--------|
| Frontend build | `npm run build` in `frontend/` | ✅ Passes |
| Output | `frontend/dist/` | ✅ |
| Env (dev) | `frontend/.env.local` — `VITE_API_URL` | Required |
| Env (prod) | `frontend/.env.production.example` | Copy before build |
| Vite base | `VITE_BASE_PATH` for subfolder | Supported |
| Apache SPA | `frontend/public/.htaccess` | Included in dist |
| Backend port | 3001 (`server.ts`) | Default |
| CORS | `CORS_ORIGIN` in backend `.env` | Single origin |
| PostgreSQL | Docker / `DATABASE_URL` | Documented in `backend/docs/SETUP.md` |

---

## Existing Features (implemented)

### Pillar 1 — Marketplace

| Module | Existing capability |
|--------|---------------------|
| Vehicle hubs | Cars, bikes, trucks, buses, EV, auto (`VehicleHubPage`, ecosystem registry) |
| Buy / sell | Category listings, sell flow, vehicle detail, compare, wishlist |
| Catalog | Large mock catalog + DB vehicles merge |
| New / used hubs | `/new-cars`, `/used-cars`, preowned/new-car dealer OS |
| Auctions (public) | Hub, browse, room, bidding UI |
| Parts (consumer) | Hub, listing, cart, checkout, orders |
| Dealer network | Public dealer directory + profiles |
| Enquiries | Send enquiry, test drive → `POST /api/leads` |
| EMI / loan widgets | On listing pages (calculator components) |

### Pillar 2 — Commerce

| Module | Existing capability |
|--------|---------------------|
| Finance marketplace | Public hub, compare, apply; DSA/lender/manager dashboards |
| Insurance | Hub, compare, quote, apply; customer insurance page |
| Services | Public booking flow; service-partner ERP |
| Auctions | Admin desk, super-admin approvals |

### Pillar 3 — CRM (centralized fragments)

| CRM | Existing capability |
|-----|---------------------|
| Dealer CRM | Leads pipeline, enquiries, calls (mock), WhatsApp page, inventory CRM, team, analytics, storefront, verification |
| DSA desk | Applications, leads, team, commissions (UI) |
| Finance manager | Applications pipeline, integrations page |
| New-car dealer | Leads, inventory add, pipeline UI; placeholders for bookings/deliveries/marketing |
| Parts supplier | CRM-style subpages in ERP nav |
| Service partner | Bookings, jobs, CRM sections |
| Platform admin | User/dealer/KYC/vehicle moderation |

### Pillar 4 — Community

| Feature | Existing capability |
|---------|---------------------|
| Feed | `CommunityFeedPage`, posts, like UI |
| Groups | Groups list + group page |
| Profiles | Dealer page, influencer/u routes |
| Moderation | Super-admin + admin community route |

### Cross-cutting

| Feature | Status |
|---------|--------|
| Auth (email/password) | ✅ |
| Business signup + pending approval | ✅ |
| Role-based dashboards | ✅ |
| Notifications (DB + guest scoped) | ✅ Partial |
| AI control center page | ✅ UI / architecture |
| i18n-ready structure | English only |
| Theme (light/dark) | ✅ |

---

## Missing Features (vs vision — safe to add later)

### Marketplace enhancements (do not replace listing flow)

- Used car sale modes: Direct Owner / Broker / Dealer Offer / Auction (metadata flags + filters only at first)
- New car: daily stock sync, brochure PDF, 360 viewer, waiting period field, offers engine
- Bike: dedicated loan/insurance/service sub-hubs (routes exist at category level; depth missing)
- Commercial: dedicated dealer workflows beyond generic trucks/buses hubs
- Equipment: rent + finance + auction modes
- Parts: VIN search, reg-no search, compatibility matrix API
- Vehicle comparison (page exists; deepen spec matrix)

### Commerce

- Finance: true multi-lender eligibility engine, soft pull, commission ledger (partial UI only)
- Insurance: policy vault sync, renewal cron, claims workflow
- Service: unified service history across vehicles
- Auction: proxy bid, auto-bid, bank/insurance/fleet/gov categories, KYC gate for bidders

### CRM (upgrade, not recreate)

- Broker CRM (role + pipeline) — **missing role**
- Insurance agent CRM — **missing**
- Fleet CRM — **missing**
- Auction CRM — partial (admin only)
- Community CRM / Growth CRM — **architecture only**
- WhatsApp template marketing, social builder, reel generator — **not implemented**
- Commission tracking across verticals — partial in finance UI only

### Community (`community.motorcart.in`)

- Separate deploy/subdomain config — **not configured** (same SPA today)
- Messaging, follow graph, video uploads, events, polls, jobs — **missing or stub**
- Business pages depth — partial

### AI (architecture only per prompt)

- Advisors exist as stubs/agents folder — not production LLM pipelines for all modules

### Roles

- Broker, OEM, Insurance Company, Fleet Owner, Equipment Dealer as distinct RBAC — **missing**

---

## Duplicate Features

| Duplicate | Canonical | Action |
|-----------|-----------|--------|
| `integrations/supabase/client` vs `motorcartApi` | Same REST client | Keep alias; document only |
| `features/parts/pages/PartsSupplier*` | `features/parts-supplier/` | Deprecate; do not route |
| `features/service-booking/ServiceHub*` | `features/service-partner/` | Deprecate; do not route |
| `dealer` vs `used_car_dealer` vs `preowned_dealer` | `workspace-role` normalizes | No schema change |
| `service_partner` vs `service_center` | Maps to service_center | Keep normalizer |
| Mock catalog + DB vehicles | `getVehiclePool()` merge | By design; not duplicate |
| `/dashboard/admin` vs `/dashboard/super-admin` | Both exist | Intentional aliases |
| Postgres migrations vs Prisma | Prisma only for MySQL | Do not dual-apply |

---

## Dead Code (candidates — do not delete without QA)

| Path | Reason |
|------|--------|
| `router/index.tsx` imports `NewCarsListingPage`, `PreownedCarsListingPage` | No routes |
| `pages/dashboard/DashboardHome.tsx`, `AdminOpsHomePage.tsx` | Orphan |
| `features/vehicles/pages/DealerInventoryPage.tsx` | Superseded by dealer-crm inventory |
| `features/parts/pages/PartsSupplier*.tsx` | Deprecated |
| `features/service-booking/pages/ServiceHub*.tsx` | Deprecated |
| `dealer-crm/services/crm-mock.ts` | Mock calls when DB empty |
| `frontend/AGENTS.md` | Next.js boilerplate — misleading |

**Policy:** Mark `@deprecated` and remove from router imports first; delete files only after one release cycle.

---

## Security Risks

| Risk | Severity | Location | Safe fix (extension) |
|------|----------|----------|----------------------|
| Generic `/api/db/query` authenticated = broad table access | **High** | `db/query/route.ts` | Table allowlist per role; never remove route abruptly |
| Public `leads` insert | Low–Med | `leads/route.ts` | Rate limit + captcha |
| Dev unauthenticated write on vehicles/leads | Med (dev only) | `DEV_WRITE_TABLES` | Ensure `NODE_ENV=production` on live |
| JWT secrets placeholder | **High** prod | `.env.example` | Rotate secrets |
| Upload path traversal partial fix | Med | `upload/route.ts` | Sanitize `path` further |
| Tokens in localStorage | Med | `axios.ts` | Document; httpOnly cookie = future phase |
| Client-side OpenAI key possible | Med | `ai/services/openai.service.ts` | Keep blocked in prod |
| No RLS (MySQL) — app-layer only | Med | All | Enforce `account-access.ts` on every mutation |
| CORS single origin | OK | `server.ts` | Add prod domain to env |

---

## Performance Bottlenecks

| Bottleneck | Impact | Safe mitigation |
|------------|--------|-----------------|
| Main bundle ~1.4 MB (`index-*.js`) | Slow first load | More lazy routes; do not remove features |
| `xlsx` in main graph | Large chunk | Already `vendor-xlsx`; lazy-import in bulk upload only |
| Mock catalog size | Memory on browse | Pagination already; server-side search later |
| `getVehiclePool()` loads 500 DB rows | Slow hub | Cache + CDN for static catalog |
| No join in query API | Extra round trips / mocks | Add dedicated `/api/vehicles/:slug` with dealer embed |
| Socket reconnect storms | Auction room | Debounce subscribe in `useAuctionRoom` |
| Full table scans in admin | DB CPU | Indexes + dedicated list endpoints |

---

## Database Problems

| Issue | Detail | Safe approach |
|-------|--------|---------------|
| Dual schema sources | Prisma vs SQL migrations | Prisma only; migrations as docs |
| `vehicle_id` on leads optional | Fixed in Prisma recently | `db push` on deploy |
| Mock vehicle IDs not in DB | FK fails if forced | Store `vehicle_interest` text (done) |
| `part_order_items` FK history | Noted in PROJECT-AUDIT.md | Verify `db push` applied |
| Missing broker/OEM tables | Vision only | New tables via additive migrations |
| Analytics mapped to `activity_logs` | Semantic drift | Alias view or rename in Prisma only with migration plan |

---

## Scalability Risks

| Risk | Future impact | Direction |
|------|---------------|-----------|
| Monolithic SPA router | Hard to split teams | Feature flags + lazy modules (current path) |
| Generic DB proxy | Hard to audit | Gradual dedicated APIs per domain |
| Local file uploads | Not multi-instance | S3-compatible storage adapter |
| Socket.io on same process | Limits horizontal scale | Redis adapter for io |
| Single MySQL instance | Write ceiling | Read replicas + Prisma read routing later |
| No CDN for `dist` | Global latency | CloudFront/Cloudflare in front of static |
| community subdomain | Brand/SEO | Separate `VITE_SITE_URL` build or reverse proxy |

---

## Technical Debt Summary

1. **Mock-first services** — auctions, finance, parts-supplier, new-car subpages, platform-admin fallback.
2. **API compatibility layer** — `@/integrations/supabase/client` naming confuses new devs.
3. **No relational select** in query builder — forces mocks for dealer+vehicle cards.
4. **Incomplete new-car OS** — 14+ placeholder pages.
5. **Role model vs vision** — 6+ roles in docs not in `AppRole`.
6. **Growth CRM / video AI** — not started (correct for phase 3).
7. **Tests** — minimal automated coverage (assume none in CI).

---

## Safe Enhancement Roadmap

### Principles

1. **Extend** tables and routes; never rename public URLs.
2. **Feature flags** for new sale modes and auction types.
3. **Additive Prisma** migrations only.
4. **Dedicated endpoints** beside `/api/db/query` for hot paths (vehicles, leads, finance apply).
5. **One pillar per quarter** — Marketplace → Commerce → CRM → Community.

### Phase A — Stabilize (0–4 weeks) — **no vision features**

| # | Task | Risk | Rollback |
|---|------|------|----------|
| A1 | Production env checklist (`DEPLOY.md` + backend CORS) | Low | Revert env |
| A2 | Rate limit auth + leads POST | Low | Disable middleware |
| A3 | Role-based table allowlist on `db/query` | Med | Feature flag `STRICT_DB_QUERY` |
| A4 | Vehicle detail API with dealer join | Low | Keep old query path |
| A5 | Remove dead router imports | Low | Git revert |
| A6 | Document mock vs real matrix per page | None | N/A |

### Phase B — Marketplace depth (4–10 weeks)

| # | Task | Risk |
|---|------|------|
| B1 | Listing `sale_mode` enum (owner/broker/dealer/auction) — optional field | Low |
| B2 | New car: brochure URL, waiting_days, offer JSON on inventory | Low |
| B3 | Parts: compatibility table + search API | Med |
| B4 | Wishlist fully on DB for logged-in users | Low |
| B5 | SEO: sitemap script from slugs | Low |

### Phase C — Commerce (10–18 weeks)

| # | Task | Risk |
|---|------|------|
| C1 | Finance: application router + lender status webhooks (architecture) | Med |
| C2 | Insurance: renewal reminder job | Med |
| C3 | Auction: bid history table + proxy bid API | Med |

### Phase D — CRM unify (18–28 weeks)

| # | Task | Risk |
|---|------|------|
| D1 | Shared `crm_activities` table (polymorphic lead_id) | Med |
| D2 | Broker role + dashboard shell (new routes only) | Low |
| D3 | WhatsApp template storage (no send yet) | Low |

### Phase E — Community + Growth (28+ weeks)

| # | Task | Risk |
|---|------|------|
| E1 | `community.motorcart.in` build arg + DNS | Low |
| E2 | Messaging schema + API | High |
| E3 | Growth CRM architecture doc + queue stubs | Low |

---

## Feature Priority Matrix

| Feature | Business value | Effort | Risk | Priority |
|---------|----------------|--------|------|----------|
| Fix prod API URL / CORS / dist deploy | Critical | S | Low | **P0** |
| Enquiry → dealer CRM (real leads) | Critical | S | Low | **P0** |
| Per-user wishlist/notifications | High | S | Low | **P0** |
| DB query hardening | Critical | M | Med | **P0** |
| Vehicle+dealer API | High | M | Low | **P1** |
| Used car sale modes (metadata) | High | M | Low | **P1** |
| New car inventory depth | High | L | Med | **P1** |
| Finance multi-lender | High | XL | Med | **P2** |
| Auction proxy/KYC | Med | L | Med | **P2** |
| Broker CRM role | Med | L | Low | **P2** |
| Parts VIN search | Med | L | Med | **P2** |
| Growth CRM / reels | High (USP) | XL | Low | **P3** |
| AI advisors production | Med | XL | Med | **P3** |

---

## Folder Structure Recommendations (extension only)

**Do not move existing features.** Add parallel folders:

```
frontend/src/
  domains/                    # NEW (optional gradual)
    marketplace/
    commerce/
    crm/
    community/
  features/                   # KEEP — migrate file-by-file over years
backend/src/
  domains/                    # NEW
    marketplace/
    commerce/
    crm/
  app/api/                    # KEEP — add route groups
    v2/                       # NEW versioned APIs when needed
```

---

## CRM Enhancement Plan (preserve existing)

### Current assets

- `dealer-crm`: leads, pipeline, inventory, calls, WhatsApp UI
- `new-car-dealer`: dealer_leads, inventory
- `finance`: DSA/manager pipelines
- `parts-supplier` / `service-partner`: embedded CRM nav items

### Upgrade path

1. **Unified lead model (logical)** — `leads` stays; add `source_channel`, `vertical`, `assigned_team`.
2. **Activity timeline** — new table `crm_activities` (lead_id, type, payload) — optional FK to existing leads.
3. **Cross-workspace dashboard** — super-admin only; no dealer route changes.
4. **WhatsApp** — template table + deep link; integrate provider later.
5. **Commission** — extend finance `commission` tables; link from dealer CRM read-only view.

**Do not** merge dealer-crm and new-car-dealer UIs — keep shells; share services.

---

## Community Enhancement Plan

1. **Phase 1:** Harden `social_posts`, comments, likes (DB-backed; remove mock when rows exist).
2. **Phase 2:** `community.motorcart.in` → same `dist`, `VITE_SITE_URL` + router basename or separate build.
3. **Phase 3:** Follow/messaging (new tables `conversations`, `messages`).
4. **Phase 4:** Marketplace posts linked to `vehicles.id`.
5. **Phase 5:** Events, polls, jobs — separate modules under `features/community/`.

---

## Revenue Feature Implementation Plan

| Revenue stream | Existing hook | Next safe step |
|----------------|---------------|----------------|
| Dealer subscriptions | `DealerSubscriptionPage` | Stripe/Razorpay webhook route (new) |
| Featured listings | `FeaturedInventoryPage` (admin) | `vehicles.is_featured` already |
| Finance commission | Finance manager UI | Ledger table + DSA attribution |
| Insurance commission | Insurance apply | Policy ID + agent_id on application |
| Auction fees | Auction room | `auction_entries.fee` column |
| Parts margin | Parts supplier ERP | Order line profit field |
| Lead gen (enquiry) | `/api/leads` | Billing per lead tier (future) |

---

## Deployment Validation Checklist

- [ ] `frontend/.env.production` has live `VITE_API_URL`, `VITE_SITE_URL`
- [ ] `npm run build` succeeds; `dist/index.html` exists
- [ ] `.htaccess` present in dist for Apache
- [ ] Backend `NODE_ENV=production`, strong JWT secrets
- [ ] `DATABASE_URL` production MySQL; `npx prisma db push` applied
- [ ] `CORS_ORIGIN` = production frontend origin
- [ ] `POST /api/leads` works from production origin
- [ ] Uploads directory writable or S3 planned
- [ ] Health: `GET /api/health` 200
- [ ] Login + dealer CRM load on production
- [ ] No `DEV_WRITE_TABLES` bypass in production
- [ ] SSL on API and site
- [ ] Socket URL wss:// matches API host

---

## Step-by-Step Implementation Plan (safe order)

1. **Audit sign-off** — stakeholder agrees P0 list only for sprint 1.
2. **Backup** — DB dump + `dist` artifact + env snapshot before any prod change.
3. **P0 security** — env, CORS, rate limits, production `NODE_ENV`.
4. **P0 commerce path** — leads, enquiries, notifications (already extended — verify prod).
5. **P1 vehicle API** — dedicated slug endpoint; frontend switches with fallback to query.
6. **P1 mock matrix doc** — each page: Real / Mock / Hybrid.
7. **P1 sale_mode** — additive column + filter UI.
8. **P2 finance architecture** — design doc only until lender API contracts exist.
9. **P2 broker role** — additive enum + routes behind flag.
10. **P3 community subdomain** — infra + build pipeline.
11. **P3 growth CRM** — architecture + stub queues (no WhatsApp API yet).

---

## Change Protocol (required before any file edit)

For every change, document:

| Field | Content |
|-------|---------|
| **Why** | Business/tech reason |
| **Impact** | Routes/APIs/tables affected |
| **Risk** | Low / Med / High |
| **Files** | Explicit list |
| **Rollback** | Git revert, env toggle, or DB migration down |
| **Test** | Manual checklist paths |

**Never:** drop columns, rename routes, remove modules, or force `prisma migrate reset` on production.

---

## Backup Strategy

| Asset | Method | Frequency |
|-------|--------|-----------|
| MySQL | `mysqldump motorcart` | Daily before deploy |
| Uploads | Copy `backend/uploads` | With deploy |
| Env | Secure vault copy | On change |
| `dist` | CI artifact versioned | Each release |
| Git | Tag `release-YYYY-MM-DD` | Each production push |

---

## Conclusion

MotorCart is a **broad, production-shaped monolith** with a working auth layer, marketplace UI, multiple ERP dashboards, and a Prisma-backed API. The correct evolution path is **stabilize → harden → extend by metadata and new routes**, not rewrite. Vision pillars (Growth CRM, AI video, full multi-lender) are **Phase C–E** items; existing modules must keep working throughout.

**Next recommended action (no code until approved):** Execute Phase A checklist in a single sprint with QA on dealer CRM + customer enquiry + static deploy.

---

*This document is read-only audit output. Supersedes nothing in `PROJECT-AUDIT.md`; complements it for enterprise planning.*
