# MotorCart — API Standards

---

## Base URLs

| Environment | Frontend | Backend API |
|-------------|----------|-------------|
| Local Docker | `http://localhost:3000` | Proxied via nginx to backend `:3001` |
| Dev | `VITE_API_URL` in `frontend/.env.local` | `http://localhost:3001` |

---

## Authentication

- **JWT** access token in `Authorization: Bearer <token>`
- Refresh via auth refresh endpoint
- Protected routes must validate session before business logic
- Public endpoints: vehicle browse, public lead capture, liveness `GET /api/health`, readiness `GET /api/ready`, federated search `GET /api/search`, stock-by-PIN (`GET /api/inventory/by-pincode`), MotorCart One QR verify (`GET /api/motorcart-one/verify/[token]`), parts search (`GET /api/parts/search`, `GET /api/parts/by-pincode`), service PIN (`GET /api/service/by-pincode`), jobs list (`GET /api/jobs`), company profile (`GET /api/company/[slug]`), ecosystem discover (`GET /api/discover/ecosystem`)

---

## Route patterns

### Preferred for new features

```
GET    /api/<resource>
GET    /api/<resource>/[id]
POST   /api/<resource>
PATCH  /api/<resource>/[id]
DELETE /api/<resource>/[id]
```

Implement in `backend/src/app/api/<resource>/route.ts`.

### Existing generic patterns (use only when aligned with current feature)

| Pattern | Use case |
|---------|----------|
| `GET/POST/PATCH/DELETE /api/db/query` | Table CRUD from frontend |
| `POST /api/db/rpc/[fn]` | Multi-step DB operations |
| `POST /api/upload` | File uploads |

**New public or high-traffic APIs should get dedicated routes**, not generic query passthrough.

Dedicated commerce objects:

- Quotations — `POST/GET /api/quotations` (Phase 5A)
- Test drives — `POST/GET /api/test-drives` plus lifecycle sub-routes (Phase 5B)
- Community — `/api/community/*` (Batch 6: profile, feed, posts, follow, saved, discover, reports)
- Sales OS — `/api/crm/*`, `/api/lead-routing/*`, `/api/lead-board/*`, `/api/consents` (Batch 7)
- Commercial — `/api/billing/managed-plans`, `/api/billing/organization-subscriptions`, `/api/billing/payments`, `/api/billing/invoices`, `/api/payouts/*`, `/api/rewards/*` (Batch 8). Financial tables are never allowed on `/api/db/query`.
- Super-app — `/api/customer/one`, `/api/customer/activity`, `/api/saved-searches`, `/api/reminders`, `/api/media`, `/api/sell-requests`, `/api/sale-offers`, `/api/valuations`, public `/api/motorcart-one/verify/[token]` (Batch 9). Super-app tables are never allowed on `/api/db/query`.
- Stock-by-PIN — `GET /api/inventory/by-pincode` (Phase 5C, public, exact PIN only)

Do not implement those via `/api/db/query`.

---

## Request / response

- **Content-Type:** `application/json` unless upload
- **Errors:** `{ "error": "Human-readable message" }` with correct status (400, 401, 403, 404, 500)
- **Pagination:** `?page=&limit=` or cursor-based — match neighboring endpoints
- **Validation:** Reject invalid input at boundary; do not rely on DB constraints alone

---

## RBAC

Check role and workspace context in handler or shared middleware.

Roles include: customer, dealer, new_car_dealer, finance_manager, service_center, parts_seller, admin, super_admin, and others — see `permissions/matrix.ts` and backend guards.

---

## Realtime

Socket.io for auctions and live updates — extend existing room patterns; do not add a second realtime stack.

---

## Versioning & compatibility

- Do not remove or rename existing endpoints without deprecation plan.
- Adding optional JSON fields is safe; removing or changing types requires migration + frontend coordination.

Dedicated Communication/AI REST lives under `/api/communications/*`, `/api/telephony/*`, `/api/ai/*`. Do not expose generic DB access as an AI tool.
