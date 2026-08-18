# MotorCart — Phase 1 Audit

**Role:** Senior Software Architect / CTO review  
**Date:** 2026-08-18  
**Scope:** Understand, run, inspect, document. No feature work. No schema changes. No UI redesign.  
**Constraint:** Extend-only existing production codebase. This document does not authorize Phase 2 implementation.

**Related prior audits (not replaced):** `PROJECT-AUDIT-ENTERPRISE.md` (2026-06-03), `cursor/` enterprise docs, `docs/phases/`.

---

## 1. Repository structure (actual)

Inspected the workspace root. These folders **do not exist:** `packages/`, root `src/`, root `api/`, root `database/`, root `server/`.

| Path | Purpose |
|------|---------|
| `frontend/` | React 19 SPA (Vite 6) — primary web UI |
| `backend/` | Next.js 15 API routes + custom `server.ts` (Express + Socket.io) + Prisma |
| `apps/mobile-customer/` | Expo 57 customer mobile app (also Docker web export on `:8090`) |
| `infra/nginx/` | Nginx reverse proxy config for Docker |
| `tools/catalog-master-mock-api/` | Local-only fixture JSON API for catalog-master dry-run (port 3099) |
| `cursor/` | Authoritative AI/engineering directives (26 docs) |
| `docs/` | Phase history + this Phase 1 documentation set |
| `scripts/` | Port-free, git, deploy PowerShell/shell helpers |
| `.cursor/` | Cursor rules (`motorcart-enterprise.mdc`) |
| `docker-compose.yml` | Local/prod-ish stack: postgres, redis, mock catalog, backend, frontend, mobile-app, nginx |
| `docker-compose.prod.yml` | Production overlay |

### Frontend layout

- `frontend/src/features/` — domain modules (28 feature folders)
- `frontend/src/pages/` — marketing/auth/static pages
- `frontend/src/router/index.tsx` — central React Router 7 tree
- `frontend/src/services/` — vehicle, dealer, session services
- `frontend/src/integrations/api/` — Axios API clients
- `frontend/src/auth/`, `frontend/src/permissions/` — JWT bootstrap, RBAC matrix
- `frontend/src/ai/` — AI control-center UI + rule/OpenAI agents
- `frontend/src/dashboards/` — customer/admin dashboard chrome
- `frontend/src/components/` — shared UI (Radix + Tailwind)
- `frontend/src/data/` — mock catalogs (`mock.ts`, `vehicle-catalog`, `india-vehicle-master`)

### Backend layout

- `backend/server.ts` — HTTP entry (Next request handler + Socket.io)
- `backend/src/app/api/` — 154 `route.ts` files
- `backend/src/lib/` — catalog, auth, billing, community, growth, storage, scraper
- `backend/src/services/` — domain services (directory, catalog-import-admin, …)
- `backend/prisma/schema.prisma` — source of truth (127 models, 28 enums)
- `backend/prisma/migrations/` — `init`, `catalog_core`, `catalog_listing_fk`
- `backend/supabase/` — **historical SQL only**; do not import
- `backend/scripts/` — seeds, dry-runs, benchmarks

### Mobile

`apps/mobile-customer/src/screens/`: Home, Vehicles, VehicleDetail, Login, Profile, Workspace. Shell only vs full web SPA.

---

## 2. Technology stack (what exists)

### Frontend

- React 19, TypeScript ~5.8, Vite 6
- React Router 7
- Tailwind CSS 3 + Radix UI + CVA
- Zustand, TanStack Query, TanStack Table
- Axios, Socket.io-client, Framer Motion, Recharts
- React Hook Form + Zod
- `xlsx` for inventory upload UI

### Backend

- Node 20 (Docker), TypeScript
- Next.js 15 App Router **API only** (no public Next pages product UI)
- Custom `tsx` server wrapping Next + Express middleware (cors, helmet, compression, rate-limit)
- REST under `/api/*`
- JWT access + refresh (`jsonwebtoken`, `bcryptjs`)
- Zod validation on newer catalog/admin routes
- Playwright worker/scraper (GaadiBazaar listing scrape is **not** catalog master)
- Uploads: Next `formData()` + local disk (`UPLOAD_DIR`). `multer` is in `package.json` but **not imported**
- `nodemailer` is in `package.json` but **not imported** (forgot-password has a TODO)
- `redis` client exists (`src/infra/redis.ts`); `getRedis()` is **never called**. Redis runs in Compose unused by app logic

### Database

- PostgreSQL 16 (Docker)
- Prisma 6
- Migrations exist; live Docker DB previously had catalog FKs applied
- Seed: `prisma/seed.ts` + `prisma/seeds/catalog-seed.ts` (Hyundai Creta 2025 only for catalog master)

### Mobile

- Expo ~57, React Native 0.86, React Navigation 7
- Async Storage + Secure Store

### Infrastructure

- **Exists:** Docker Compose, Nginx, Dockerfiles for backend/frontend/mobile/mock-api
- **Exists:** `.env.docker.example`, `.env.production.example`, per-app `.env.example`
- **Does not exist in repo:** `vercel.json`, Railway config, AWS CDK/Terraform
- **External:** a Vercel URL is referenced historically (`https://motorcartnew-npfw.vercel.app/`). Primary documented run path is Docker nginx on `:3000`, not Vercel-as-source-of-truth.

### AI / third-party (code, not assumed live keys)

| Integration | Location | Reality |
|-------------|----------|---------|
| OpenAI chat completions | `frontend/src/ai/services/openai.service.ts` | Optional; **blocked in production builds** unless `VITE_ALLOW_CLIENT_OPENAI=true`. Client key pattern is a known risk (SEC-007). |
| Rule-based “bots” | `frontend/src/ai/agents/*` | Mostly local rules; `usedOpenAI: false` |
| Catalog JSON API | `backend/src/lib/catalog/import/sources/json-api/` | Real adapter; needs licensed URL. Local mock on `:3099` |
| GaadiBazaar scraper | `backend/src/lib/scraper/gaadi-bazaar/` | Listing scrape framework; **not** new-car catalog master |
| Object storage | `backend/src/lib/storage/` | Local / R2 / S3 providers; publish **fail-closed** without R2/S3 |
| Email | Nodemailer (declared) | **Unused** — reset-link TODO only |
| Redis | Compose + `src/infra/redis.ts` | Container healthy; **no app reads/writes** |
| OpenAI | `frontend/src/ai/services/openai.service.ts` | Real Chat Completions in browser when key set; **blocked in prod builds** unless `VITE_ALLOW_CLIENT_OPENAI=true` |
| Storage S3/R2 | `backend/src/lib/storage/providers/` | In-memory mocks in this codebase; Azure/GCS `NOT_IMPLEMENTED` |
| WhatsApp Cloud | growth `providers/meta.ts` etc. | Stubs (`live_api: false`); UI uses `wa.me` links |

---

## 3. How to run (from repo scripts — not invented)

Authoritative local runbook: `DEV-START.md`. Root scripts: `package.json`.

### A. Frontend start

```powershell
npm run dev:frontend
# or via Vite directly from frontend/
npm run dev --prefix frontend
```

Vite serves the SPA. With Docker, the SPA is the `frontend` container, reached through nginx.

### B. Backend start

```powershell
npm run dev:backend
# or
npm run dev --prefix backend
```

`backend` script: `tsx watch server.ts`. API base: `http://localhost:3001`.

### C. Database

```powershell
npm run db:up
# starts postgres + redis via compose
```

`DATABASE_URL` must be PostgreSQL. Backend `.env.example` may still mention other providers historically; **running Docker uses PostgreSQL**.

```powershell
cd backend
npx prisma migrate deploy
npm run db:seed
```

### D. Mobile

```powershell
cd apps/mobile-customer
npx expo start
```

Docker: `mobile-app` service, host port **8090**.

### E. Combined / production-style

```powershell
npm run dev
# concurrently backend + frontend after freeing ports

npm run docker:up
# docker compose --env-file .env.docker up -d --build

npm run build
# frontend tsc -b && vite build; backend prisma generate && next build
```

### F. Tests

No single root `test` script. Backend catalog tests:

```powershell
cd backend
npm run test:catalog
npm run test:catalog-import-json-api
```

Frontend: `npm run test:catalog-import-ui` (narrow).

### G. Lint

```powershell
npm run lint --prefix frontend
```

Backend has **no** `lint` script in `package.json`. Next production build runs typecheck.

### H. Typecheck

```powershell
# frontend (via build)
npm run build --prefix frontend
# backend
cd backend
npx tsc --noEmit
npx next build
```

---

## 4. Runtime check performed this audit (read-only)

Docker Compose was **already running**. No config was changed.

| Service | Status | Notes |
|---------|--------|--------|
| `motorcart-nginx-1` | healthy | `0.0.0.0:3000→80` |
| `motorcart-frontend-1` | healthy | internal `:80` |
| `motorcart-backend-1` | healthy | internal `:3001` |
| `motorcart-postgres-1` | healthy | `:5432` |
| `motorcart-redis-1` | healthy | `:6379` |
| `motorcart-catalog-master-mock-1` | healthy | `:3099` |
| `motorcart-mobile-app-1` | healthy | `:8090` |

`GET http://localhost:3000/api/health` → `status: ok`, `database: postgresql`, `users: 11`, `vehicles: 34`.  
`GET http://localhost:3000/` → HTTP 200.

---

## 5. Product surface vs deployed portal

Public marketing/marketplace routes in `frontend/src/router/index.tsx` match the intended portal IA:

Vehicles hubs, Buy, Sell, New cars, Used cars, Auctions, Finance, Insurance, Parts, Services, Community, Directory, Dealers, AI, account, many role dashboards.

Comparison rule used: **code existence ≠ production-grade data**. See `cursor/23_Mock_vs_Real_Data_Matrix.md` and `docs/MOTORCART_FEATURE_GAP_ANALYSIS.md`.

The Vercel URL was **not scraped**. Structure above is from this repository’s router.

---

## 6. Findings summary

**Working now (with Docker):** auth APIs, health, vehicle list/detail for DB ids, public lead POST, dealer inventory paths, nginx SPA + API proxy, catalog import **dry-run** (no DB writes).

**Partial / mock-heavy:** finance marketplace, insurance quotes, parts/service ERPs, auctions hub, community feed, customer 360, AI agents, super-admin demo fallbacks, new-car OS modules beyond inventory/leads.

**Not a licensed live new-car catalog:** catalog master JSON adapter is built; live OEM/vendor credentials are not in repo; seed catalog is one Hyundai Creta 2025 variant; `catalog_variant_id` on listings is unused (0 linked rows at last catalog verification).

**Do not proceed to Phase 2 automatically.** Phase 2 should be a separate, explicit authorization.

---

## 7. Documents in this Phase 1 set

| File | Contents |
|------|----------|
| `docs/MOTORCART_CURRENT_ARCHITECTURE.md` | Runtime architecture |
| `docs/MOTORCART_FEATURE_GAP_ANALYSIS.md` | Feature matrix |
| `docs/MOTORCART_DATABASE_AUDIT.md` | Schema / entity status |
| `docs/MOTORCART_ROLE_AUDIT.md` | Roles and signup |
| `docs/MOTORCART_TECHNICAL_RISKS.md` | Quality + architectural risks |
| `docs/MOTORCART_PHASE_ROADMAP.md` | Evolution toward MotorCart One (**design only**) |
