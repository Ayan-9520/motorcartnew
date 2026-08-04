# MotorCart — System Architecture

**Last aligned with:** `PROJECT-AUDIT-ENTERPRISE.md`

---

## Repository layout

```
motorcartcursor/
├── frontend/          # React 19 SPA (Vite 6) — primary UI
├── backend/           # Next.js 15 API + Prisma + Socket.io
├── apps/              # Mobile and auxiliary apps
├── infra/             # Infrastructure configs
├── docs/              # Phase plans and migration history
├── cursor/            # AI development directives (this folder)
├── docker-compose.yml # Local/prod stack: postgres, redis, backend, frontend, nginx
└── scripts/           # Utility scripts
```

---

## Runtime stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, React Router 7, Zustand, TanStack Query, TailwindCSS |
| Backend | Next.js 15 API routes, custom `server.ts`, Socket.io |
| Database | PostgreSQL via Prisma (~78 models) |
| Cache | Redis |
| Auth | JWT (access + refresh), bcrypt |
| Deploy | Docker Compose (nginx → frontend static + API proxy) |

---

## Frontend architecture

- **Router:** Central `router/index.tsx` with lazy-loaded dashboard pages.
- **Layouts:** `PublicLayout`, dashboard layouts per role, `CommunityLayout` for social.
- **Auth:** `AuthProvider`, `ProtectedRoute`, role-based workspace routing.
- **Features:** Domain-driven folders under `features/` (dealer-crm, finance, community, platform-admin, etc.).
- **Marketplace:** Vehicle hubs, mock catalog + DB merge in vehicle services.

---

## Backend architecture

- **Dedicated REST routes:** Auth, vehicles, leads, auctions, upload, admin subset, health.
- **Generic query layer:** `/api/db/query` for table CRUD (used heavily by frontend).
- **RPC layer:** `/api/db/rpc/[fn]` for stored-procedure-style operations.
- **Realtime:** Socket.io rooms (auctions, notifications — partial parity).
- **Schema source of truth:** `backend/prisma/schema.prisma`

**Legacy note:** `backend/supabase/migrations/*.sql` is historical reference only — do not import.

---

## Core product modules (existing)

| Module | Status (high level) |
|--------|---------------------|
| Vehicle marketplace | Working — hubs, listings, detail, compare |
| Dealer CRM | Partial real data + some mocks |
| New-car dealer OS | Mixed — real inserts, placeholder pages |
| Parts / service ERP | UI complete, mock-heavy services |
| Finance desks | Mixed — DSA, lender, manager UIs |
| Auctions | Room UI + socket, mock hub data |
| Community | Feed UI, DB via generic query |
| Super-admin | Full ERP nav, demo fallbacks available |
| AI | Control center pages; modular expansion planned |

---

## Integration boundaries

When adding features:

1. **UI** → feature folder + router entry (lazy if heavy)
2. **API** → dedicated route preferred; extend query/RPC only when pattern already used
3. **DB** → Prisma migration; never raw schema edits in production
4. **Auth** → extend `AppRole` / permissions matrix with migration + guards

---

## Scalability targets (design for)

10M users · 100K dealers · 500 OEMs · 1M vehicles · 50M images

Use pagination, caching, background jobs, and object storage for media at scale.
