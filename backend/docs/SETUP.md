# Motorcart Backend — MySQL Setup (XAMPP)

## Prerequisites

- Node.js 20+
- XAMPP with MySQL running (port 3306)
- phpMyAdmin (optional)

## 1. Create database

Open phpMyAdmin → SQL → paste and run:

```sql
CREATE DATABASE IF NOT EXISTS motorcart
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Or run from terminal:

```bash
mysql -u root < mysql-init.sql
```

## 2. Configure environment

```bash
cd backend
copy .env.example .env
```

Edit `.env`:

```
DATABASE_URL="mysql://root:@localhost:3306/motorcart"
JWT_ACCESS_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## 3. Install and migrate

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

## 4. Start API server

```bash
npm run dev
```

API: http://localhost:3001

## 5. Start frontend

```bash
cd ../frontend
copy .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

## Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@motorcart.in | Admin@12345 | super_admin |
| customer@motorcart.in | Customer@123 | customer |

## Troubleshooting

- **ECONNREFUSED MySQL** — Start MySQL in XAMPP Control Panel.
- **Access denied** — Check username/password in `DATABASE_URL`.
- **Prisma P1012** — Ensure `.env` exists with `DATABASE_URL`.

## Legacy Postgres reference

Original Supabase SQL files are kept at `backend/supabase/migrations/` for reference only.  
**Do not run them on MySQL** — use Prisma schema instead.
