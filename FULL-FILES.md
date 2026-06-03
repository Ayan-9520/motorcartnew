# Motorcart — Full File Map (Supabase → MySQL)

**UI same hai. Sirf backend/database badla.**

---

## Root

| File | Kaam |
|------|------|
| `package.json` | `npm run dev` — frontend + backend dono |
| `setup.ps1` | Windows one-time MySQL setup |
| `MIGRATION.md` | Migration guide (Hindi + English) |
| `README.md` | Quick start |
| `FULL-FILES.md` | Yeh file — saari important files |

---

## Frontend (`frontend/`) — UI SAME

### Config
| File |
|------|
| `package.json` |
| `vite.config.ts` |
| `tailwind.config.js` |
| `tsconfig.json` |
| `.env.example` |
| `.env.local` → `VITE_API_URL=http://localhost:3001` |

### API layer (Supabase ki jagah)
| File | Kaam |
|------|------|
| `src/integrations/api/client.ts` | Main API export |
| `src/integrations/api/auth.ts` | JWT login/signup/OTP |
| `src/integrations/api/query-builder.ts` | `.from('table').select()` compatible |
| `src/integrations/api/storage.ts` | File upload |
| `src/integrations/api/realtime.ts` | Socket.io |
| `src/integrations/supabase/client.ts` | **Sirf re-export** (naam purana, Supabase nahi) |
| `src/lib/api/axios.ts` | HTTP + token refresh |

### UI (touch nahi hua)
| Folder |
|--------|
| `src/pages/` |
| `src/features/` |
| `src/layouts/` |
| `src/router/` |
| `src/components/` |
| `public/` |

### Scripts (MySQL)
| File |
|------|
| `scripts/seed-vehicles.ts` → backend API |
| `scripts/confirm-user-email.ts` → backend Prisma |

---

## Backend (`backend/`) — MySQL + Prisma + Next.js

### Database
| File | Kaam |
|------|------|
| `prisma/schema.prisma` | **Saari MySQL tables** (60+ models) |
| `prisma/seed.ts` | Admin + customer + sample vehicles |
| `mysql-init.sql` | XAMPP: `CREATE DATABASE motorcart` |
| `supabase/migrations/*.sql` | **Reference only** — MySQL par mat chalao |

### Server
| File | Kaam |
|------|------|
| `server.ts` | Next.js + Socket.io + `/uploads` |
| `next.config.ts` | CORS headers |
| `.env` / `.env.example` | `DATABASE_URL`, JWT, PORT |

### API routes (`src/app/api/`)
| Path | Kaam |
|------|------|
| `auth/login` | Email login |
| `auth/register` | Signup |
| `auth/refresh` | Token refresh |
| `auth/logout` | Logout |
| `auth/me` | Current user |
| `auth/session` | Session |
| `auth/otp/send` | Phone OTP |
| `auth/otp/verify` | Verify OTP |
| `auth/forgot-password` | Reset email |
| `auth/reset-password` | New password |
| `db/query` | **CRUD** — frontend `.from()` yahi aata hai |
| `db/rpc/[fn]` | RPC (bids, device session) |
| `vehicles` | Vehicle list + images |
| `leads` | CRM leads |
| `auctions` | Auctions |
| `notifications` | User notifications |
| `upload` | Files |

### Core code
| File |
|------|
| `src/lib/prisma.ts` |
| `src/lib/db/query-handler.ts` |
| `src/lib/db/table-map.ts` |
| `src/lib/auth/jwt.ts` |
| `src/lib/auth/password.ts` |
| `src/lib/auth/middleware.ts` |
| `src/services/auth.service.ts` |

### Docs
| File |
|------|
| `docs/SETUP.md` |
| `docs/API.md` |

---

## Tables (Postgres → MySQL same names)

`users`, `dealers`, `vehicles`, `leads`, `auctions`, `bids`, `parts`, `part_orders`,  
`bookings`, `services`, `service_centers`, `finance_applications`, `finance_leads`,  
`insurance_partners`, `insurance_applications`, `customer_vehicles`, `social_posts`,  
`community_groups`, `notifications`, `platform_banners`, `support_tickets`, …

---

## Commands

```powershell
# Setup (ek baar)
.\setup.ps1

# Daily dev
npm run dev

# DB reset
cd backend
npx prisma db push
npm run db:seed
```

## Login

| Email | Password |
|-------|----------|
| customer@motorcart.in | Customer@123 |
| admin@motorcart.in | Admin@12345 |
