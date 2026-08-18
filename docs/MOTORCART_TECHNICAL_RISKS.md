# MotorCart — Technical Risks

**Date:** 2026-08-18  
**Phase 1:** identify only. Do not “fix by rewrite.”  
**Also see:** `cursor/22_Security_Risk_Register.md`.

---

## 1. Code quality (observed, not fixed)

### TypeScript / build

- Backend Docker image now typechecks (`next build` in image succeeded in the catalog-import workstream). Host `backend/.env` historically used a non-Postgres URL — Prisma on host must override to Docker Postgres.
- Frontend `build` runs `tsc -b && vite build`. Not re-run as a full clean CI in this documentation pass.
- Backend has no `lint` npm script; frontend has `eslint .`.

### Runtime / coupling

- `frontend/src/services/vehicle.service.ts` still imports a supabase-shaped client **and** Axios. `MOCK_VEHICLES` is currently an **empty array**. Dual call styles remain.
- `NewCarsListingPage` and `PreownedCarsListingPage` are imported in `router/index.tsx` but never registered as routes (dead imports).
- Packages declared but unused in app code: `nodemailer`, `multer`. Redis client never invoked.
- Generic `/api/db/query` is a wide CRUD surface. UI ERPs depend on it; schema drift causes 500s (community, fraud, tickets historically).
- Socket.io auction rooms are not full feature parity with tables (`AuctionProxyBid`, etc. exist; hub browse still mock).

### Duplicates

- Multiple lead tables and notification tables (see database audit).
- `CommunityPost` vs `SocialPost`.
- `Part` vs `PartProduct`.
- Vehicle identity split: listing vs dealer new-car stock vs catalog variant.
- Two search features: `features/search` and `features/unified-search`.
- Dealer WhatsApp UI vs Growth WhatsApp vs Broker WhatsApp — three communication stacks.

### Hardcoded / mock / placeholder

Representative files:

- `frontend/src/data/mock.ts`, `vehicle-catalog`, `india-vehicle-master.ts`
- `features/*/data/mock-*.ts` (customer, auctions, finance banks, insurers, parts, service partner, new-car dealer, platform admin)
- `NcdModulePlaceholder.tsx`
- `frontend/src/pages/PlaceholderPage.tsx`
- Catalog mock API: `tools/catalog-master-mock-api/` (intentional, local-only)

### Insecure patterns (open)

| ID | Issue | Location |
|----|--------|----------|
| SEC-001 | Broad authenticated table access | `backend/src/app/api/db/query/route.ts` |
| SEC-002 | Placeholder JWT secrets in examples | `.env*.example` |
| SEC-003 | Tokens in localStorage | frontend axios/auth |
| SEC-004 | Public lead POST abuse | `/api/leads` |
| SEC-005 | `DEV_WRITE_TABLES` | query route; must stay off in prod |
| SEC-007 | Client `VITE_OPENAI_API_KEY` | `openai.service.ts` |
| SEC-008 | No DB RLS; app-layer auth only | Prisma |
| — | Catalog publish without storage fails closed (good) but mock storage in tests only | `src/lib/storage` |

### Product UX gaps (not defects of a single file)

- Missing consistent empty/error/loading on mock-fallback ERPs (they look “full” with demo numbers).
- Permission checks often UI-only (`ROLE_CAPABILITIES`).
- Validation stronger on new catalog admin Zod routes than on generic query.

---

## 2. Architectural risks (future scale)

| Risk | Why it hurts later |
|------|-------------------|
| No Organization/Partner tenant | OEM, insurer, bank, workshop cannot share one identity model; every portal forks |
| Dealer-centric RBAC | `AppRole` is a flat enum; employees/teams are strings on `DealerMember` |
| Category-specific dashboards copied | Parts ERP (~70 routes) and Service ERP (~50 routes) duplicate CRM/inventory/finance patterns |
| Three vehicle masters | Marketplace, dealer stock, catalog will disagree without linking/publish discipline |
| Listing scrape vs catalog master | Using GaadiBazaar/CarDekho ads as “new cars” would poison variants |
| Lead fragmentation | Opportunity Engine cannot score one customer journey |
| Payment absence | Subscriptions/payouts cannot be real |
| PIN as a string | Pan-India inventory/discovery will not scale |
| AI without provider abstraction on server | Client OpenAI + rule bots; no job queue, no audit of prompts/tokens in backend |
| Communication provider split | WhatsApp appears in dealer, broker, growth, service marketing |
| `/api/db/query` gravity | New tables keep attaching to a dangerous generic API instead of dedicated modules |
| Feature-flag explosion | Dozens of `FEATURE_*` / `VITE_FEATURE_*` pairs; easy for frontend/backend to disagree |
| Host vs Docker env split | Backend host `.env` MySQL-style URL vs Docker Postgres already caused operator confusion |
| Catalog flags default OFF | `FEATURE_CATALOG_LAYER` / `VITE_FEATURE_CATALOG_ADMIN` default false — easy to think catalog “is live” when it is not |
| Mobile not at parity | Two UX truths (SPA vs Expo) |

---

## 3. What is *not* a Phase 1 action

Do not: merge lead tables, rewrite ERPs, enable catalog publish, add credentials, scrape live sites, or tighten `STRICT_DB_QUERY` without a dedicated, tested change request.

Recommended sequencing lives in `docs/MOTORCART_PHASE_ROADMAP.md`.
