# Supabase (PostgreSQL) → MySQL + Prisma + Next.js

**UI / pages / dashboards — koi change nahi.** Sirf database aur backend replace hua hai.

---

## Project structure (final)

```
motorcart/
├── frontend/          ← React + Vite + Tailwind (pehle jaisa UI)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.local     ← VITE_API_URL only (NO Supabase)
│
├── backend/           ← Next.js API + MySQL + Prisma
│   ├── prisma/schema.prisma
│   ├── mysql-init.sql
│   ├── server.ts
│   ├── docs/SETUP.md
│   ├── docs/API.md
│   ├── supabase/migrations/   ← REFERENCE ONLY (Postgres, mat chalao MySQL par)
│   └── src/app/api/
│
├── package.json       ← npm run dev (dono start)
└── README.md
```

---

## Pehle vs Ab

| Pehle (Supabase) | Ab (MySQL) |
|------------------|------------|
| `VITE_SUPABASE_URL` | `VITE_API_URL=http://localhost:3001` |
| `supabase.auth.signIn` | `POST /api/auth/login` |
| `supabase.from('users')` | `GET /api/db/query?table=users` |
| Postgres + RLS | MySQL + Prisma + JWT |
| Supabase Realtime | Socket.io |

Frontend code same hai — `integrations/supabase/client.ts` ab sirf naam hai, andar **REST API** call hoti hai.

---

## XAMPP setup (step-by-step)

### 1. MySQL start karo
XAMPP Control Panel → **MySQL Start**

### 2. Database banao
phpMyAdmin → SQL:

```sql
CREATE DATABASE IF NOT EXISTS motorcart
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API: http://localhost:3001

### 4. Frontend (naya terminal)

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### 5. Ya root se dono

```powershell
npm install
npm run install:all
npm run dev
```

---

## Login (seed ke baad)

| Email | Password |
|-------|----------|
| admin@motorcart.in | Admin@12345 |
| customer@motorcart.in | Customer@123 |

---

## Important files

### Frontend (API layer — UI touch nahi)
- `frontend/src/integrations/api/client.ts` — main API
- `frontend/src/integrations/api/auth.ts` — JWT auth
- `frontend/src/integrations/api/query-builder.ts` — table queries
- `frontend/src/lib/api/axios.ts` — HTTP client

### Backend
- `backend/prisma/schema.prisma` — **saari MySQL tables**
- `backend/src/app/api/auth/*` — login, signup, OTP
- `backend/src/app/api/db/query/route.ts` — CRUD (Supabase compatible)
- `backend/server.ts` — Next.js + Socket.io + uploads

---

## Agar error aaye

1. **Login fail** — backend chal raha hai? `http://localhost:3001/api/auth/settings` browser mein kholo
2. **Network error** — `frontend/.env.local` mein `VITE_API_URL=http://localhost:3001` hona chahiye (Supabase keys hata do)
3. **MySQL connect** — `backend/.env` mein `DATABASE_URL` sahi ho
4. **Tables missing** — `npx prisma db push` dubara chalao

---

## Postgres SQL files

`backend/supabase/migrations/*.sql` — sirf reference.  
MySQL par **mat import karo**. Tables `prisma db push` se banti hain.
