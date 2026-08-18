# MotorCart — Current Architecture

**Date:** 2026-08-18  
**Source of truth for code:** this repo. Directives: `cursor/02_System_Architecture.md`.  
**Phase 1:** documentation only.

---

## 1. System context

MotorCart is a **monorepo automotive operating system**, not a single listing site. The running shape is:

```
Browser / Expo web
        │
        ▼
   Nginx :3000          (Docker)
    ├─ /            → frontend static (Vite build)
    ├─ /api/*       → backend :3001
    └─ (optional) mobile static :8090 separately
        │
        ▼
  Next.js API + server.ts
    ├─ Prisma → PostgreSQL
    ├─ Redis (Compose service; app does not call getRedis)
    ├─ Socket.io (auctions / notifications — partial)
    └─ catalog-master-mock :3099 (dev fixtures only)
```

Host Vite+tsx `npm run dev` is an alternate path (frontend `:3000`, API `:3001`) documented in `DEV-START.md`.

---

## 2. Application layers

### Web SPA (`frontend/`)

- Single React 19 tree, lazy dashboard pages.
- Layouts: `PublicLayout`, role dashboards, `CommunityLayout`.
- Auth: `AuthProvider` + `useAuthBootstrap` + `ProtectedRoute`.
- Data: mix of dedicated `/api/*` clients, generic `/api/db/query`, and **client mock catalogs**.
- Feature flags: `frontend/src/config/feature-flags.ts` (`VITE_*`).

### API (`backend/`)

Two access patterns coexist:

1. **Dedicated REST** — auth, vehicles, leads, auctions, upload, admin, community, growth, billing, catalog import, health.
2. **Generic query/RPC** — `POST/GET/PATCH/DELETE /api/db/query` and `POST /api/db/rpc/[fn]`. Heavily used by frontend ERP UIs. High coupling and security risk (see role/risk docs).

`server.ts` hosts Next request handling, static `/uploads`, Socket.io.

### Mobile (`apps/mobile-customer/`)

Thin client: login, vehicle list/detail, profile, workspace. Shares backend JWT APIs. Not feature-parity with the SPA.

---

## 3. Domain modules (code locations)

| Domain | Frontend | Backend |
|--------|----------|---------|
| Marketplace / vehicles | `features/marketplace`, `vehicles`, `ecosystem`, `new-cars`, `preowned-cars` | `/api/vehicles`, `/api/home`, `/api/search` |
| Dealer CRM | `features/dealer-crm` | vehicles + `/api/db/query` + leads |
| New-car dealer OS | `features/new-car-dealer` | `/api/new-car/*`, `NewCarInventory` |
| Catalog master | admin catalog import pages | `src/lib/catalog/**`, `/api/admin/catalog/import/*` |
| Finance | `features/finance` | `FinanceApplication`, admin finance routes |
| Insurance | `features/insurance` | `InsuranceApplication`, `InsuranceQuote` |
| Parts | `features/parts`, `parts-supplier` | `Part`, `PartProduct`, `/api/parts` |
| Services | `features/service-booking`, `service-partner` | `ServiceCenter`, `ServiceBooking`, `Booking` |
| Auctions | `features/auctions` | `/api/auctions`, Socket.io |
| Community | `features/community` | `/api/community/*` |
| Growth CRM | `features/growth-crm` | `/api/growth/*` |
| Broker | `features/broker-crm` | `/api/broker/*` |
| Admin | `features/platform-admin` | `/api/admin/*` |
| Billing | `features/billing` | `/api/billing/*` |
| AI | `frontend/src/ai`, `/ai` route | no production LLM pipeline |

---

## 4. Data architecture (two vehicle truths)

This is the most important current architectural fact.

| Store | Meaning | Today |
|-------|---------|--------|
| `vehicles` | Marketplace listings (used + some new listings) | 34 rows in running Docker DB |
| `new_car_inventory` | Dealer new-car stock | 30 rows; `catalog_variant_id` nullable |
| `catalog_brands/models/variants` | Official variant master | **1 variant** (Hyundai Creta SX(O) 1.5 Diesel Automatic 2025) |
| Frontend `MOCK_VEHICLES` | Empty array | `vehicle-catalog.ts` sets `MOCK_VEHICLES = []` when public site is PostgreSQL-only |

Catalog import pipeline (parse → validate → duplicate → media → match → approve → publish) **exists**. Default dry-run: `databaseWrites=0`, `published=false`. Publish requires admin confirm + R2/S3.

GaadiBazaar/CarDekho **listings are not** the catalog master.

---

## 5. AuthN / AuthZ

- Users in `users` with Prisma `AppRole`.
- JWT access + refresh tokens; OTP, OAuth callback routes exist.
- UI capabilities: `frontend/src/permissions/matrix.ts` (coarse flags).
- Server enforcement is **inconsistent**: dedicated routes check JWT/roles; generic `db/query` is broader (`STRICT_DB_QUERY` exists as a flag, default false in docker example).
- Business signups can be `pending` until super-admin approval.

---

## 6. Configuration

| File | Role |
|------|------|
| `backend/.env.example` | API, DB, JWT, feature flags |
| `frontend/.env.example` | Vite public flags |
| `.env.docker.example` | Compose |
| `frontend/src/config/feature-flags.ts` | Client gates |
| `backend/src/config/feature-flags.ts` | Server gates including `FEATURE_CATALOG_LAYER` (default **off**) |

Catalog admin UI flag `VITE_FEATURE_CATALOG_ADMIN` defaults **false**.

---

## 7. Deployment architecture (as in repo)

**Primary:** Docker Compose + nginx. Scripts: `npm run docker:up`, `npm run docker:prod:up`, `scripts/deploy-server.ps1`.

**Not in repo:** Vercel project config. A public Vercel URL may still host an older SPA build; it is **not** the compose stack audited here.

---

## 8. How this should evolve (not built in Phase 1)

Keep the SPA + dedicated APIs. Shrink `/api/db/query`. Introduce Organization/Partner as an additive layer on `User`+`Dealer` rather than replacing them. Catalog master becomes the single variant identity; listings and dealer stock **link** via `catalog_variant_id`. See `docs/MOTORCART_PHASE_ROADMAP.md`.
