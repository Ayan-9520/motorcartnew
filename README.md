# Motorcart.in

**India's AI-Powered Automobile Ecosystem**

```
motorcart/
├── frontend/   React + Vite + TypeScript + Tailwind
├── backend/    Node.js + Next.js API + Prisma + PostgreSQL + Redis
└── docker-compose.yml
```

## Quick start (recommended)

```powershell
# One-time
powershell -ExecutionPolicy Bypass -File setup.ps1

# Every session
npm run db:up
npm run dev
```

- **App:** http://localhost:3000  
- **API:** http://localhost:3001/api/health  

## Docker full stack

```powershell
copy .env.docker.example .env.docker
npm run docker:up
```

- **App (Nginx):** http://localhost:3000  
- **Health:** http://localhost:3000/api/health  

## Git + GitHub push

Monorepo root se push — details: **[GITHUB_SETUP.md](GITHUB_SETUP.md)**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -Push
```

Remote: `https://github.com/Ayan-9520/motorcart.in.git`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + backend (local) |
| `npm run db:up` | PostgreSQL + Redis containers |
| `npm run db:down` | Stop DB containers |
| `npm run docker:up` | Full stack (frontend, backend, postgres, redis, nginx) |
| `npm run migrate` | `prisma migrate deploy` |
| `npm run seed` | Seed demo users |

## Seed users

| Email | Password |
|-------|----------|
| admin@motorcart.in | Admin@12345 |
| customer@motorcart.in | Customer@123 |
| dealer@gmail.com | Dealer@123 |

## Docs

- **Docker setup:** [DOCKER.md](DOCKER.md)
- [DEV-START.md](DEV-START.md) — daily dev steps
- [backend/docs/SETUP.md](backend/docs/SETUP.md) — PostgreSQL + Redis
- [backend/docs/API.md](backend/docs/API.md) — API reference  
- [docs/phases/](docs/phases/) — phase plans (archive)
