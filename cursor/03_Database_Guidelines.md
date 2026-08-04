# MotorCart — Database Guidelines

---

## Source of truth

- **ORM:** Prisma — `backend/prisma/schema.prisma`
- **Apply changes:** Migrations via Prisma (`prisma migrate` / documented `db push` in dev)
- **Legacy SQL:** `backend/supabase/migrations/` — reference only, do not execute blindly

---

## Rules (mandatory)

1. **Never** alter production schema without a migration and rollback plan.
2. **Use UUID** for primary keys on new tables (match existing Prisma conventions).
3. **Maintain referential integrity** — explicit `@relation` and indexes on foreign keys.
4. **Normalize** data; avoid redundant columns unless justified for read performance.
5. **Audit fields** where appropriate: `createdAt`, `updatedAt`, `deletedAt` (soft delete).
6. **Index** columns used in filters, sorts, and joins.

---

## Change process

```
1. Update schema.prisma
2. Generate migration (name describes change)
3. Review SQL / diff
4. Test locally against Docker postgres
5. Document in feature notes / docs/phases if significant
6. Deploy migration before code that depends on new columns
```

---

## Generic query API (`/api/db/query`)

The frontend uses this for many tables. Limitations:

- Complex joins (`select('*, dealers(...)')`) may not be supported — use dedicated API or RPC.
- **Do not** expose sensitive tables without RBAC checks on the backend.

When adding new tables consumed by the UI, either:

- Add a **dedicated REST route** with proper auth, or
- Extend query layer **with permission checks** documented in `05_API_Standards.md`

---

## Key domain tables (reference)

Vehicles, dealers, leads, dealer_leads, auctions, finance applications, parts inventory, bookings, community (`social_posts`, etc.), users, business_accounts, notifications, wishlists.

See Prisma schema for the full ~78 model list.

---

## Redis usage

Session/cache layers, rate limiting, job queues — prefer Redis for ephemeral and hot data; PostgreSQL for authoritative state.

---

## Vector / search (future)

pgvector, OpenSearch/ElasticSearch — design new AI/search features as **separate services** that sync from PostgreSQL, not as ad-hoc JSON blobs in core tables.
