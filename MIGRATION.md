# Motorcart — PostgreSQL + Prisma + Docker

Historical note: the platform previously used Supabase (Postgres) then a temporary MySQL/XAMPP dev path. **Current source of truth:**

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| API | Node.js (Next.js route handlers + Express middleware) |
| ORM | Prisma |
| Database | **PostgreSQL 16** |
| Cache | **Redis 7** |
| Deploy | Docker Compose |

## Database

- Schema: `backend/prisma/schema.prisma` (`provider = "postgresql"`)
- Migrations: `backend/prisma/migrations/`
- Seed: `backend/prisma/seed.ts`

```powershell
npm run db:up
cd backend && npx prisma migrate deploy && npm run db:seed
```

## Do not use

- ~~XAMPP / MySQL~~ — removed
- ~~`backend/mysql-init.sql`~~ — removed
- `backend/supabase/migrations/*.sql` — reference only, do not import

## Environment

```env
DATABASE_URL=postgresql://motorcart:strongpassword@localhost:5432/motorcart?schema=public
REDIS_URL=redis://localhost:6379
```

Inside Docker Compose, hostnames are `postgres` and `redis` (see `.env.docker.example`).
