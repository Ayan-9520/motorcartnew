# MotorCart — Mock vs Real Data Matrix

**Know what is production DB vs mock/demo before changing code**

Legend: **REAL** = PostgreSQL via API · **MOCK** = client mock/fallback · **MERGE** = DB + mock combined · **FLAG** = env demo fallback

---

## Marketplace

| Feature | Data source | Notes |
|---------|-------------|-------|
| Vehicle hub listings | **MERGE** | `getVehiclePool()` — mock catalog + DB vehicles |
| Vehicle detail (DB id) | **REAL** | `/api/vehicles/[id]` |
| Vehicle detail (mock id) | **MOCK** | Mock catalog only — no FK |
| Compare | **MOCK** | Deep spec matrix incomplete |
| Wishlist | **PARTIAL** | Table exists; frontend partially wired |
| Enquiry / leads | **REAL** | `POST /api/leads` |
| Dealer directory | **PARTIAL** | Mix of directory API + mocks |
| Featured home sections | **MERGE** | Home context + mocks |

---

## Commerce — finance

| Feature | Data source | Notes |
|---------|-------------|-------|
| Finance marketplace browse | **MOCK** | `finance.service.ts` fallbacks |
| Loan application submit | **PARTIAL** | RPC + mock paths |
| DSA desk | **MOCK** | Desk utils with mock data |
| Lender dashboard | **MOCK** | UI complete |
| Finance manager pipeline | **PARTIAL** | Some real RPC |

---

## Commerce — insurance

| Feature | Data source | Notes |
|---------|-------------|-------|
| Insurance hub / quote UI | **REAL UI** | Quote logic mostly client-side defaults |
| Policy vault | **MOCK** | Not synced |
| Renewals | **NOT IMPLEMENTED** | Cron planned |

---

## Commerce — services & parts

| Feature | Data source | Notes |
|---------|-------------|-------|
| Services hub (public) | **REAL UI** | Booking depth limited |
| Service partner ERP | **MOCK** | `mock-sh-data.ts` |
| Parts hub (public) | **MERGE** | Filters + catalog |
| Parts supplier ERP | **MOCK** | Large ERP UI |
| Cart / checkout | **PARTIAL** | Flow exists; backend partial |

---

## Auctions

| Feature | Data source | Notes |
|---------|-------------|-------|
| Auction hub browse | **MOCK** | `auction-hub-data.ts` |
| Auction room | **PARTIAL** | Socket + mock mix |
| Bid history | **PARTIAL** | Extend with real table |

---

## Dealer CRM

| Feature | Data source | Notes |
|---------|-------------|-------|
| Inventory list | **REAL** | DB vehicles |
| Leads pipeline | **PARTIAL** | Real leads + mock calls |
| Calls page | **MOCK** | `crm-mock.ts` when empty |
| WhatsApp page | **UI ONLY** | No provider integration |
| Analytics | **MOCK** | Charts with sample data |
| Storefront | **REAL** | Dealer + inventory |

---

## New car dealer OS

| Feature | Data source | Notes |
|---------|-------------|-------|
| Inventory add | **REAL** | Insert paths work |
| Leads | **PARTIAL** | `dealer_leads` |
| Bookings/deliveries/marketing | **PLACEHOLDER** | `NcdModulePlaceholder` pages |

---

## Community

| Feature | Data source | Notes |
|---------|-------------|-------|
| Feed posts | **PARTIAL** | `social_posts` via `/api/db/query` — 500s if table/perm issue |
| Groups | **PARTIAL** | UI + query |
| Likes / comments | **PARTIAL** | Wired in UI |
| Follow graph | **NOT IMPLEMENTED** | |
| Messaging | **NOT IMPLEMENTED** | |

---

## Platform admin

| Feature | Data source | Notes |
|---------|-------------|-------|
| Super-admin ERP | **FLAG** | `VITE_ADMIN_DEMO_FALLBACK` → mock when empty |
| User management | **REAL** | Admin API |
| KYC / approvals | **REAL** | Business accounts API |
| Fraud alerts | **PARTIAL** | Query errors if table missing |
| Support tickets | **PARTIAL** | Query errors if table missing |
| CMS | **PARTIAL** | |

---

## Cross-cutting

| Feature | Data source | Notes |
|---------|-------------|-------|
| Auth login/register | **REAL** | JWT |
| Notifications | **PARTIAL** | DB + guest scoped service |
| AI control center | **UI / STUB** | Not production LLM pipelines |
| Growth CRM | **MOCK** | Architecture pages |
| Broker CRM | **SHELL** | Layout exists |
| Unified search | **PARTIAL** | |

---

## Environment flags affecting data

| Flag | Effect |
|------|--------|
| `VITE_ADMIN_DEMO_FALLBACK` | Admin pages show demo data when API empty |
| `VITE_FULL_ECOSYSTEM` | Ecosystem feature visibility |
| `FEATURE_FULL_ECOSYSTEM` | Backend feature gate |
| `DEV_WRITE_TABLES` | Dev-only write without auth — **never prod** |
| `NODE_ENV=development` | Relaxed errors, dev tooling |

---

## Developer rules

1. **Before replacing mock:** verify DB table + API path works
2. **When adding mock fallback:** document in this matrix
3. **Goal:** move MOCK → PARTIAL → REAL without breaking UI
4. **Never** remove mock fallback until REAL path tested in Docker

---

## Priority: mock → real conversions (P0–P1)

1. Community feed (`social_posts`, likes, comments)
2. Lead pipeline end-to-end (enquiry → dealer CRM)
3. Wishlist for authenticated users
4. Notifications per user
5. Vehicle detail with dealer join (single API)
6. Admin support_tickets / fraud_alerts tables or graceful empty state

Update this file when conversion completes.
