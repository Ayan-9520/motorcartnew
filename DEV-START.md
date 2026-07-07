# Motorcart — local dev (PostgreSQL + Redis)

## One-time setup

```powershell
cd E:\Projects\motorcartcursor
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
npm install
npm run install:all
npm run db:up
cd backend
npx prisma migrate deploy
npm run db:seed
cd ..
```

Or run: `powershell -ExecutionPolicy Bypass -File setup.ps1`

## Every dev session

### 1. Start PostgreSQL + Redis

```powershell
npm run db:up
```

### 2. Stop old dev servers

Press **Ctrl+C** in terminals running `npm run dev`.

### 3. Start frontend + backend

```powershell
npm run ports:free
npm run dev
```

- Frontend: **http://localhost:3000**
- API: **http://localhost:3001/api/health** → `"status":"ok"`, `"database":"postgresql"`

## Docker full stack (optional)

```powershell
copy .env.docker.example .env.docker
npm run docker:up
```

App via Nginx: **http://localhost**

## Login credentials

| Email | Password | Role |
|-------|----------|------|
| dealer@gmail.com | Dealer@123 | dealer |
| admin@motorcart.in | Admin@12345 | super_admin |
| customer@motorcart.in | Customer@123 | customer |

## Feature flags (local)

`backend/.env` and `frontend/.env.local` may have all `FEATURE_*` / `VITE_FEATURE_*` set to `true`. Restart servers after env changes.

## Reset auth users (once if login broken)

```powershell
cd backend
npm run db:reset-auth
```

Hard-refresh browser (Ctrl+Shift+R).

## Wrong URLs

- Do **not** open http://localhost:3001 for the website UI (API only).
- Use **http://localhost:3000** for React app.

## If ports busy

```powershell
npm run ports:free
```
