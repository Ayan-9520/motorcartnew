# Motorcart.in

**India's AI-Powered Automobile Ecosystem**

Project lives in two folders only:

```
motorcart/
├── frontend/   React + Vite + TypeScript + Tailwind (UI)
└── backend/    Next.js API + Prisma + MySQL + JWT + Socket.io
```

## Quick start

```bash
# Install (from root)
npm install
npm run install:all

# Backend — MySQL required
cd backend
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm run dev
```

Or both from root: `npm run dev`

- **App:** http://localhost:3000  
- **API:** http://localhost:3001  

## Seed users

| Email | Password |
|-------|----------|
| admin@motorcart.in | Admin@12345 |
| customer@motorcart.in | Customer@123 |

- **Setup (XAMPP/MySQL):** [backend/docs/SETUP.md](backend/docs/SETUP.md)
- **API docs:** [backend/docs/API.md](backend/docs/API.md)
- Legacy Postgres SQL (reference only): `backend/supabase/migrations/`
