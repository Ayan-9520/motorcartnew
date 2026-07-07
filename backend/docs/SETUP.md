# Motorcart Backend — PostgreSQL + Redis Setup

## Stack

| Service | Local (Docker) | Full Docker stack |
|---------|----------------|-------------------|
| PostgreSQL 16 | `localhost:5432` | `postgres:5432` |
| Redis 7 | `localhost:6379` | `redis:6379` |
| API | `localhost:3001` | `backend:3001` (via nginx `/api`) |

## 1. Start database (Docker)

From repo root:

```powershell
npm run db:up
```

This starts **postgres** + **redis** only. Data persists in Docker volumes `postgres_data` and `redis_data`.

## 2. Backend environment

```powershell
cd backend
copy .env.example .env
```

Default local URL (matches Docker postgres service on host port 5432):

```env
DATABASE_URL="postgresql://motorcart:strongpassword@localhost:5432/motorcart?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=3001
JWT_SECRET=change-me-jwt-secret-min-32-characters-long
```

## 3. Apply schema & seed

```powershell
cd backend
npx prisma migrate deploy
npm run db:seed
```

Alternative for empty dev DB: `npm run db:push` then `npm run db:seed`.

## 4. Run API

```powershell
npm run dev
```

Health check: http://localhost:3001/api/health → `"database":"postgresql"`

## Full stack (API + React + Nginx)

From repo root:

```powershell
copy .env.docker.example .env.docker
npm run docker:up
```

- App: http://localhost  
- Health: http://localhost/api/health  

## Seed users

| Email | Password |
|-------|----------|
| admin@motorcart.in | Admin@12345 |
| customer@motorcart.in | Customer@123 |
| dealer@gmail.com | Dealer@123 |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` on 5432 | `npm run db:up` — wait for postgres healthy |
| `migrate deploy` fails | Ensure `DATABASE_URL` uses `postgresql://` not `mysql://` |
| Redis optional errors | Set `REDIS_URL=redis://localhost:6379` or leave unset |
| Port 3001 busy | `npm run ports:free` from root |

## Legacy SQL

`backend/supabase/migrations/*.sql` — **reference only** (historical Postgres). Do not import manually; use Prisma migrations in `backend/prisma/migrations/`.
