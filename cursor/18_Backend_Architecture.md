# MotorCart — Backend Architecture (Deep Dive)

---

## Stack

| Technology | Usage |
|------------|-------|
| Next.js 15 | App Router API routes |
| Custom server | `server.ts` — HTTP + Socket.io |
| Prisma | ORM — PostgreSQL |
| PostgreSQL 16 | Primary database (Docker) |
| Redis 7 | Cache / queues (Docker) |
| Socket.io | Realtime (auctions, notifications) |
| bcrypt | Password hashing |
| JWT | Access + refresh tokens |

Default port: **3001**

---

## Directory structure

```
backend/
├── prisma/
│   └── schema.prisma      # ~78 models — SOURCE OF TRUTH
├── src/
│   ├── app/api/           # Next.js route handlers
│   ├── services/          # Business logic
│   ├── lib/               # Shared utilities
│   └── (agents/ai if present)
├── uploads/               # Local file storage (volume in Docker)
├── docs/SETUP.md          # DB setup runbook
└── server.ts              # Entry + Socket.io
```

---

## API route map

### Authentication (`/api/auth/*`)

| Route | Method | Purpose |
|-------|--------|---------|
| login | POST | Email/password login |
| register | POST | User registration |
| refresh | POST | Refresh access token |
| logout | POST | Invalidate session |
| me | GET | Current user |
| session | GET | Session validation |
| OTP / OAuth / forgot / reset | various | Extended auth flows |
| settings | PATCH | User settings |

### Public / commerce

| Route | Purpose |
|-------|---------|
| `GET/POST /api/vehicles` | Vehicle listing + create |
| `GET/PATCH /api/vehicles/[id]` | Vehicle detail |
| `POST /api/leads` | Public lead capture |
| `GET /api/leads/[id]` | Lead detail (auth) |
| `GET/POST /api/auctions` | Auction data |
| `GET /api/notifications` | User notifications |

### Admin

| Route | Purpose |
|-------|---------|
| `/api/admin/users` | User management |
| `/api/admin/business-accounts` | Approve/reject businesses |
| `/api/admin/dealers/pending` | Dealer approvals |
| `/api/admin/finance/applications` | Finance pipeline |
| `/api/admin/overview` | Dashboard stats |
| `/api/admin/flows` | Workflow config |

### Infrastructure

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check |
| `POST /api/upload` | File upload |
| `* /api/db/query` | Generic table CRUD |
| `POST /api/db/rpc/[fn]` | RPC operations |

---

## Generic query layer

**Pattern:** Frontend sends `{ table, action, filters, data }` to `/api/db/query`.

**Limitations:**

- Complex joins not supported
- Broad table access — needs role allowlist (security priority)

**When to use:** Internal admin tools, community posts, existing wired features.

**When NOT to use:** New public APIs, payment, sensitive PII exports.

---

## RPC layer

`POST /api/db/rpc/[fn]` — server-side functions for:

- Multi-table transactions
- Finance calculations
- Complex lead routing
- Admin aggregations

Add new RPC handlers in route file — keep functions in `services/`.

---

## Service layer pattern

```typescript
// route.ts — thin handler
export async function POST(req: Request) {
  const body = await req.json();
  const user = await requireAuth(req);
  const result = await leadService.create(body, user);
  return NextResponse.json(result);
}

// services/lead.service.ts — business logic
export const leadService = {
  async create(data, user) { /* validate, prisma, notify */ }
};
```

---

## Prisma & database

- **~78 models** — vehicles, dealers, leads, auctions, finance, parts, community, etc.
- Apply schema: `npx prisma generate`, migrate/push per SETUP.md
- **Legacy:** `backend/supabase/migrations/` — reference only

### Migration rules

1. Never edit production DB manually
2. Always migration + rollback plan
3. UUID primary keys on new tables
4. Soft delete where user content

---

## Authentication flow

1. Login → JWT access + refresh tokens
2. Frontend stores tokens (localStorage — document security tradeoff)
3. Axios interceptor attaches `Authorization: Bearer`
4. Backend validates on protected routes
5. Refresh before expiry

---

## File uploads

- `POST /api/upload` — multipart
- Served at `/uploads/*`
- Docker volume: `backend_uploads`
- **Future:** S3 adapter for horizontal scale

Validate: MIME type, max size, sanitize filename.

---

## Realtime (Socket.io)

- Attached in `server.ts`
- Rooms for auction bids, live updates
- **Scale path:** Redis adapter for multi-instance

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis connection |
| `JWT_SECRET` / refresh secret | Token signing |
| `CORS_ORIGIN` | Allowed frontend origin |
| `NODE_ENV` | production vs development |
| `FEATURE_FULL_ECOSYSTEM` | Feature flags |
| `DEV_WRITE_TABLES` | Dev-only unauthenticated writes — **OFF in prod** |

---

## Security priorities

See `22_Security_Risk_Register.md`.

Top items:

1. Role-based table allowlist on `/api/db/query`
2. Rate limit auth + public leads POST
3. Rotate JWT secrets in production
4. `NODE_ENV=production` on live deploy

---

## Docker services

From root `docker-compose.yml`:

- `postgres`, `redis`, `backend`, `frontend`, `nginx`
- nginx proxies `/api` → backend:3001
- Frontend static from `frontend` container

---

## Extension checklist (new API)

- [ ] Dedicated route under `app/api/`
- [ ] Service in `services/`
- [ ] Input validation
- [ ] Auth + RBAC check
- [ ] Prisma migration if schema change
- [ ] Document in `05_API_Standards.md` and module catalog
- [ ] Error handling with consistent JSON shape
