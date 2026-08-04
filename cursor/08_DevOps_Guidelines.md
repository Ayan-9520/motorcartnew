# MotorCart — DevOps Guidelines

---

## Local development (Docker)

```powershell
cd e:\Projects\motorcartcursor
docker compose up -d
```

Services: `postgres`, `redis`, `backend`, `frontend`, `nginx`

- App: `http://localhost:3000`
- Backend (direct): `http://localhost:3001`

---

## Rebuild after frontend changes

```powershell
docker compose build frontend
docker compose up -d --no-deps frontend nginx
```

PowerShell: use `;` not `&&` between commands.

---

## Frontend build

```powershell
cd frontend
npm ci
npm run build
```

Output: `frontend/dist/`

Env: `VITE_API_URL`, `VITE_BASE_PATH`, feature flags in `.env.production`

---

## Backend

```powershell
cd backend
npm ci
npx prisma generate
# Apply schema per backend/docs/SETUP.md
```

Port default: **3001**

---

## Health checks

- Frontend container healthcheck via nginx
- Backend: `/api/health` (or documented health route)
- Postgres / Redis: Docker healthchecks in compose file

---

## Deployment notes

- Static frontend served by nginx in Docker stack
- `frontend/public/.htaccess` for Apache SPA fallback when not using Docker
- Uploads persisted in Docker volume `backend_uploads`

---

## Do not

- Force push to main/master
- Skip git hooks unless user explicitly requests
- Commit secrets or local `.env` files

See also: `DOCKER.md`, `backend/docs/SETUP.md`, `frontend/DEPLOY.md`
