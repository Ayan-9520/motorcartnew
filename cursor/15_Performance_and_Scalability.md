# MotorCart — Performance & Scalability

**Targets:** 10M users · 100K dealers · 500 OEMs · 1M vehicles · 50M images

---

## Performance requirements (always apply)

| Area | Rule |
|------|------|
| Database | Paginate all lists; index filter/sort columns |
| API | Dedicated endpoints for hot paths; avoid N+1 |
| Cache | Redis for sessions, rate limits, hot reads |
| Images | Optimize uploads; CDN for static and media (future S3) |
| Frontend | Code splitting, lazy routes, avoid main bundle bloat |
| Background | Long tasks in queues — never block HTTP |
| Search | OpenSearch/Elastic for full-text (planned) |

---

## Current bottlenecks (known)

| Issue | Impact | Safe fix |
|-------|--------|----------|
| Main JS bundle ~1.4–1.7 MB | Slow first load | More `lazy-pages.tsx` imports |
| `xlsx` chunk | Large download | Lazy import in bulk upload only |
| Mock catalog in memory | Browse memory | Server-side pagination + CDN |
| `getVehiclePool()` 500 rows | Slow hub load | Cache + limit |
| No join in `/api/db/query` | Extra calls / mocks | `/api/vehicles/:id` with dealer embed |
| Socket reconnect storms | Auction instability | Debounce in `useAuctionRoom` |
| Admin full table scans | DB CPU | Indexes + list endpoints |

**Do not remove features to shrink bundle — lazy load instead.**

---

## Frontend performance

### Code splitting

- Heavy dashboards: `router/lazy-pages.tsx`
- Admin pages: lazy import in `admin-pages.ts`
- Charts (`vendor-charts`), xlsx (`vendor-xlsx`) — already split; keep imports dynamic

### Rendering

- TanStack Query for server state — staleTime where appropriate
- Virtualize long tables (dealer leads, inventory)
- Avoid loading entire mock catalog on every hub visit

### Assets

- WebP/optimized images in `public/`
- Lazy load below-fold images on listing grids

### Mobile

- Test 400px width for community and customer flows
- Minimize fixed layers (nav, FAB overlap — fixed on community)

---

## Backend performance

### Query optimization

- Prisma `select` only needed fields
- Cursor pagination for infinite scroll feeds
- Connection pooling (PgBouncer in prod — planned)

### Caching strategy

| Data | TTL | Store |
|------|-----|-------|
| Vehicle detail (public) | 60s–5m | Redis |
| Hub facet counts | 5m | Redis |
| User session | JWT + optional Redis blocklist | Redis |
| Static catalog slice | 1h | CDN |

### Uploads

- Max size limits on `/api/upload`
- Async thumbnail generation (worker)
- Move to S3-compatible storage for multi-instance (roadmap)

---

## Horizontal scalability

| Component | Today | Scale path |
|-----------|-------|------------|
| Frontend | nginx static | CDN (CloudFront/Cloudflare) |
| API | Single Node process | Multiple replicas + load balancer |
| Socket.io | Same process | Redis adapter for io |
| Postgres | Single instance | Read replicas + Prisma read routing |
| Files | Docker volume | Object storage |
| Community subdomain | Same SPA | Separate build arg or reverse proxy |

---

## Monitoring (recommended)

- Health: `/api/health`
- Log slow queries (>500ms)
- Track p95 API latency per route
- Frontend: Core Web Vitals on home and vehicle detail

---

## Performance checklist (before merge)

- [ ] List endpoints paginated
- [ ] New routes lazy-loaded if >50KB
- [ ] No unbounded `findMany` without `take`
- [ ] Images reasonably sized
- [ ] Redis used for repeat reads where applicable
- [ ] Build passes; bundle size not regressed without justification

---

## Scalability design patterns

1. **Stateless API** — session in JWT/Redis, not in-memory
2. **Domain APIs** — migrate off generic query for hot paths gradually
3. **Event-driven** — see `14_Automation_Platform.md`
4. **Feature flags** — `FEATURE_FULL_ECOSYSTEM`, admin demo fallback env vars
