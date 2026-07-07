# Docker — Motorcart

## Project path

```
E:\Projects\motorcartcursor
```

## URLs (after `npm run docker:up`)

| Service | URL |
|---------|-----|
| **Website (React)** | http://localhost |
| API health | http://localhost/api/health |
| API version | http://localhost/api/version |

Port change: set `NGINX_PORT=8080` in `.env.docker` → http://localhost:8080

## Commands (run from repo root)

```powershell
cd E:\Projects\motorcartcursor

# First time
copy .env.docker.example .env.docker

# Build + start all containers
npm run docker:up

# Logs
npm run docker:logs

# Stop
npm run docker:down

# DB only (local dev without full stack)
npm run db:up
```

## Containers

| Name | Role | Internal port |
|------|------|----------------|
| motorcart-nginx-1 | Reverse proxy | 80 |
| motorcart-frontend-1 | React static (nginx) | 80 |
| motorcart-backend-1 | Node API + Prisma | 3001 |
| motorcart-postgres-1 | PostgreSQL | 5432 |
| motorcart-redis-1 | Redis | 6379 |

## Rebuild after code changes

```powershell
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
```

## Login (seed)

| Email | Password |
|-------|----------|
| admin@motorcart.in | Admin@12345 |
| customer@motorcart.in | Customer@123 |
