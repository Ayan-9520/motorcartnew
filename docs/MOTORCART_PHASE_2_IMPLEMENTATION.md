# MotorCart Phase 2 — Stabilization Implementation

**Status:** Complete for the four authorized objectives. Phase 3 was not started.

Phase 2 is stabilization only. Existing marketplace, CRM, and ERP table access continues to work. Vehicle models and lead tables were not merged. No Prisma/PostgreSQL/frontend replacement. No schema migration.

---

## 1. Changes made

1. **`/api/db/query` is allowlisted.** Clients can no longer reach secret tables or run unknown operations. Named operations exist for the Phase 2 flows. Legacy `{ table, action }` still works for the existing ERP UI, but is gated.
2. **Vehicle detail is a single service.** Marketplace vehicles, dealer `new_car_inventory`, and catalog variants return the same DTO. Catalog-only rows are never purchasable.
3. **Customer enquiry → lead** uses a common adaptor over the existing `Lead` table. Dealer-linked inventory is assigned. Otherwise the lead is unassigned (sentinel dealer row). Mock dealer auto-create was removed.
4. **Catalog ingest stays dry-run / fail-closed.** Mock JSON API sources cannot publish as live inventory. Confirm + R2/S3 credentials remain required.
5. **OpenAI key is no longer used from the frontend.** Completions go through `POST /api/ai/complete` using server `OPENAI_API_KEY`. JWT remains in `localStorage` (documented, not rewritten).

---

## 2. Files changed

### Backend (new)

- `backend/src/lib/db/query-allowlist.ts`
- `backend/src/lib/db/query-registry.ts`
- `backend/src/lib/vehicles/vehicle-detail.types.ts`
- `backend/src/lib/vehicles/vehicle-detail.service.ts`
- `backend/src/lib/leads/enquiry.types.ts`
- `backend/src/lib/leads/enquiry.validation.ts`
- `backend/src/lib/leads/enquiry.service.ts`
- `backend/src/lib/catalog/source-classification.ts`
- `backend/src/app/api/ai/complete/route.ts`
- `backend/src/app/api/ai/status/route.ts`
- Tests: `query-allowlist.test.ts`, `vehicle-detail.test.ts`, `enquiry.test.ts`, `source-classification.test.ts`

### Backend (updated)

- `backend/src/app/api/db/query/route.ts`
- `backend/src/app/api/vehicles/[id]/route.ts`
- `backend/src/app/api/vehicles/slug/[slug]/route.ts`
- `backend/src/app/api/leads/route.ts`
- `backend/src/app/api/admin/catalog/import/[jobId]/publish/route.ts`
- `backend/src/lib/db/table-map.ts`
- `backend/src/lib/catalog/import/publish/catalog-publish.engine.ts`
- `backend/src/lib/catalog/import/publish/catalog-publish.test.ts`
- `backend/src/lib/catalog/import/sources/json-api/json-api.adapter.ts`
- `backend/src/services/marketplace-lead.service.ts`
- `backend/src/services/vehicle-unified.service.ts`
- `backend/.env.example`
- `backend/package.json`

### Frontend (minimum)

- `frontend/src/features/vehicles/components/EnquiryForm.tsx` — consent, preferred contact, assignment success copy
- `frontend/src/services/leads.service.ts`
- `frontend/src/services/vehicle.service.ts` — do not invent a dealer name when none exists
- `frontend/src/types/vehicle.ts`
- `frontend/src/ai/services/openai.service.ts` — backend proxy only
- `frontend/src/ai/components/AIHubHero.tsx` — stop instructing users to set a client OpenAI key

### Docs

- `docs/MOTORCART_PHASE_2_IMPLEMENTATION.md` (this file)
- `cursor/10_Sprint_Backlog.md` (P0-04, P0-06, P1-01)

---

## 3. APIs changed

| API | Change |
|-----|--------|
| `GET/POST/PATCH/DELETE /api/db/query` | Allowlist + named `operation`. Secret tables forbidden. Errors sanitized. |
| Named ops | `vehicle_detail`, `vehicle_search`, `dealer_inventory_lookup`, `create_enquiry`, `customer_profile` |
| `GET /api/vehicles/:id` | Unified detail (marketplace → inventory → catalog). Always on (no feature-flag 404). |
| `GET /api/vehicles/slug/:slug` | Same resolver. Adds `source_type`, `purchasable`, `detail`. |
| `POST /api/leads` | Common enquiry adaptor. Returns `assignment`, `duplicate`, `pipeline_status`. |
| `GET /api/leads` | Adds `assignment` and `pipeline_status` on each row. |
| `POST /api/admin/catalog/import/:jobId/publish` | `MOCK_SOURCE_PUBLISH_FORBIDDEN` → 403. |
| `POST /api/ai/complete` | **New.** Authenticated server proxy. |
| `GET /api/ai/status` | **New.** `{ configured: boolean }` — never returns the key. |

---

## 4. Database changes

**None.** No migration was applied.

Unassigned leads still require `Lead.dealerId` (existing NOT NULL). Phase 2 uses a **data row** sentinel dealer:

- slug: `motorcart-unassigned`
- name: `MotorCart Unassigned Queue`
- created on first unassigned enquiry (find-or-create)
- owned by an existing `super_admin` / `admin` user

Pipeline labels `ASSIGNED` and `CLOSED` are stored in `Lead.metadata` so the existing `LeadStatus` enum (`new | contacted | qualified | converted | lost`) is unchanged.

---

## 5. Lead flow

```
Customer → Vehicle / product (marketplace | dealer inventory | catalog)
        → Enquiry (name, phone, email?, message, consent, preferred contact, location)
        → Common lead service
        → Lead row (status = new)
        → If listing/inventory has a real dealer → ASSIGNED to that dealer
        → Else → unassigned sentinel (NOT random, NOT PIN-code, NOT lead board)
        → Optional mirror row in dealer_leads
        → Notification only when assigned
```

Duplicate/spam: same normalized 10-digit phone + same vehicle key within **15 minutes** returns the existing lead (`duplicate: true`) and does not insert another row.

Removed behavior: auto-creating dealers from frontend mock slugs (`d-mumbai-1`, etc.).

---

## 6. Query allowlist

### Named operations (preferred)

| Operation | Auth | Purpose |
|-----------|------|---------|
| `vehicle_detail` | public | Unified vehicle DTO |
| `vehicle_search` | public | Available marketplace vehicles |
| `dealer_inventory_lookup` | public | `new_car_inventory` for a dealer UUID |
| `create_enquiry` | public | Same enquiry adaptor as `POST /api/leads` |
| `customer_profile` | authenticated | Select/update **own** user row (no password hash) |

Unknown `operation` → `400 Unknown operation`.

### Legacy `{ table, action }` (ERP compatibility)

Still required because the SPA uses the Supabase-shaped query builder against many mapped tables.

**Never allow:** `refresh_tokens`, `otp_codes`, `password_resets`, `bank_integration_configs`.

**Anonymous:**

- `select` on the existing public browse tables (vehicles, dealers, banks, auctions, …)
- `insert` on `leads` (existing public enquiry path)
- vehicle writes only if `DEV_WRITE_TABLES=true` (default **false**; previously any non-production env allowed this)

**`users`:** no insert/delete/upsert. Select/update only own `id` unless admin.

**Delete:** non-admins limited to a short list (`post_likes`, `user_follows`, `community_follows`, `new_car_inventory`, `wishlists`, `poll_votes`).

**Errors:** Prisma/SQL/stack traces are not returned (`Query failed` / `Unknown operation` / `Not found`).

`STRICT_DB_QUERY` defaults **on**.

This is **not** a full least-privilege RBAC matrix. Authenticated dealer/ERP roles can still read/write the tables they already used. Arbitrary SQL and arbitrary Prisma model names from the client are rejected.

---

## 7. Catalog safety

Classification: `LICENSED_SOURCE | PARTNER_FEED | INTERNAL | MOCK`.

Mock indicators include `catalog-master-mock`, `:3099`, and `local-dev-mock-key`.

- Mock sources **cannot publish** (`MOCK_SOURCE_PUBLISH_FORBIDDEN`) even with `confirm: true` and injected storage.
- Publish still requires `confirm: true` and R2/S3 credentials (local/in-memory storage remains fail-closed).
- JSON API records are stamped with `source_classification` / `source_licensed`.
- No CarDekho / CarWale / Gaadi / OEM live scrape was added. Existing GaadiBazaar listing-scrape job is unchanged and remains dry-run unless an admin explicitly confirms publish **and** real object storage is configured.
- Catalog-only vehicle detail: `purchasable: false`, listing status `draft`.

---

## 8. Security observations

| Item | Phase 2 action |
|------|----------------|
| Client `VITE_OPENAI_API_KEY` calling api.openai.com | **Removed.** Proxy at `/api/ai/complete`. Completions require a signed-in user. No key in the browser bundle. |
| JWT in `localStorage` | **Documented only.** Incremental httpOnly-cookie auth would be a separate, explicit auth change. XSS can still steal the access token. Refresh token is also in `localStorage`. |
| `/api/db/query` | Secret tables blocked; unknown ops rejected; errors sanitized. Authenticated ERP still has broad table access by design (do not break CRM). |
| `DEV_WRITE_TABLES` | Default off. Do not enable in production. |
| Catalog mock → live inventory | Blocked at publish. |

**Not done (out of Phase 2):** auth rewrite, Redis session store, rate limiting `POST /api/leads` (still P0-05), wrapping S3/R2 with real providers (still in-memory mocks in this repo).

---

## 9. Tests

`npm run test:phase2 --prefix backend`

Covers:

1. Unauthorized database query rejected
2. Unknown query operation rejected
3. Valid allowlisted public vehicle select works
4. Vehicle detail mapping (marketplace / inventory)
5. Invalid / missing vehicle fields stay null; catalog never purchasable
6. Enquiry validation (phone, email, consent)
7. Valid enquiry payload accepted
8. Dealer-associated inventory routes assigned
9. No dealer → unassigned
10. Duplicate window (15 minutes)
11. Mock catalog cannot publish
12. Catalog publish remains fail-closed without storage / without `confirm: true`

---

## 10. Remaining known limitations

- Three vehicle identities still exist (not merged).
- Multiple lead tables still exist (`DealerLead`, `BrokerLead`, `FinanceLead`, growth capture). Only marketplace enquiry uses the common adaptor.
- Authenticated `/api/db/query` is still a wide ERP compatibility surface.
- JWT in `localStorage`.
- S3/R2 storage providers in this repo are still in-memory mocks; publish fails closed without real credentials.
- Catalog master is not a licensed live feed. One seeded Hyundai Creta variant remains.
- `NewCarsListingPage` / `PreownedCarsListingPage` still imported and unmounted.
- Redis still unused.
- Finance / insurance / parts / service / auction remain largely mock-based.
- No PIN-code distribution, lead board, payments, org/OEM tenants, AI voice, or Rewards.
- Unassigned queue is a sentinel **dealer row**, not a nullable `dealerId`. Making `dealerId` optional would be a schema change and needs approval.
- Lead rate limiting is still open (P0-05).

---

## Recommended Phase 3 (do not start automatically)

1. Real object storage for catalog/media (replace in-memory S3/R2 mocks).
2. Licensed catalog master credentials + production publish runbook.
3. httpOnly cookie / BFF session for JWT (auth change — explicit approval).
4. Narrow remaining `/api/db/query` ERP tables per role.
5. Rate limit public enquiry.
6. Optional: nullable `Lead.dealerId` instead of sentinel dealer (schema approval required).
