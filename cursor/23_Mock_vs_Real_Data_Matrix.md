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
| Wishlist | **REAL** | `/api/wishlist` JWT scoped; guest local only |
| Enquiry / leads | **REAL** | `POST /api/leads` + customer 360 enquiries |
| Quotations | **REAL** | `/api/quotations` — empty until dealer issues; historical snapshot |
| Test drives | **REAL** | `/api/test-drives` — empty until a customer requests; never auto-confirmed |
| Stock-by-PIN | **REAL** | `/api/inventory/by-pincode` — exact dealer/branch PIN; empty `{ count: 0, items: [] }` if none |
| PIN lead routing | **REAL** | `/api/lead-routing` — CRM assignment, not inventory search |
| Dealer CRM pipeline / calls / follow-ups | **REAL** | `/api/crm/*` — empty when none |
| Lead Board | **REAL** (gated) | `/api/lead-board` — published listings only; masked PII |
| Lead credits | **REAL** (gated) | ledger + admin grant; purchase creates unpaid payment until server confirm |
| Subscriptions / invoices | **REAL** | `/api/billing/managed-plans` + org subscriptions; empty until configured |
| Partner payouts | **REAL** | `/api/payouts` — zero until approved entries exist |
| Customer rewards | **REAL** | `/api/rewards/account` ledger; 0 if no rules |
| MotorCart One | **REAL** | `/api/customer/one` membership card; QR verify is public and minimal |
| Saved searches | **REAL** | `/api/saved-searches`; notify job only on new matches |
| Reminders | **REAL** | `ScheduledReminder`; insurance due dates only when on file |
| Sell requests / dealer offers | **REAL** | `/api/sell-requests`, `/api/sale-offers` — empty until created |
| Partner valuations | **REAL** | `/api/valuations` — indicative; not AI |
| Used listing media trust | **REAL** | `VehicleMediaAsset` watermark derivative; plate mask is manual/pending |
| Dealer directory | **PARTIAL** | Mix of directory API + mocks |
| Unified search | **REAL** | `GET /api/search` — empty until 2+ chars; never catalog-as-stock; no PII |
| Admin command center | **REAL** | `/api/admin/overview` counts; zeros if empty; **no** invented MRR/GMV |
| Founder dashboard fallback | **REAL zeros** | Never fabricate user/dealer KPIs |
| Billing UI copy | **HONEST** | “Online payment is not configured.” when gateway off |

---

## Fake-data classification (Batch 12)

| Pattern | Class | Action |
|---------|-------|--------|
| `src/**/*.test.ts` mocks | TEST_ONLY | keep |
| Prisma seed scripts | DEV_ONLY | keep; not production truth |
| `MOCK_OVERVIEW` / mock catalogs | LEGACY_UNUSED on real-data path | not used when `VITE_REAL_DATA_ONLY` |
| Founder FALLBACK users: 4 | PRODUCTION_RISK | **removed** (zeros) |
| Admin `mrrEstimate` from mock | PRODUCTION_RISK | **removed** (always 0) |
| Trending searches in Ctrl+K | PRODUCTION_RISK on real-data | **hidden** when real-data-only |
| Hardcoded “8,500+ showrooms” | PRODUCTION_RISK | **removed** from search shortcuts |

---

## Commerce — finance

| Feature | Data source | Notes |
|---------|-------------|-------|
| Finance marketplace browse | **PARTIAL** | REST `/api/finance/lenders` when `VITE_FEATURE_FINANCE_MARKETPLACE`; mock fallback |
| Loan application submit | **PARTIAL** | REST + RPC + mock paths |
| DSA desk | **PARTIAL** | REST scoped to `dsa_agent_id`; demo fallback |
| Lender dashboard | **PARTIAL** | REST scoped to `bank_id`/`bank_slug`; demo fallback |
| Finance manager pipeline | **PARTIAL** | REST + RPC status; commissions on disburse |

---

## Commerce — insurance

| Feature | Data source | Notes |
|---------|-------------|-------|
| Insurance hub / quote UI | **REAL** | Only `PARTNER_QUOTE` / `BOUND` from `/api/insurance/quotes`; no client-fabricated premiums |
| Policy vault | **REAL** | `InsurancePolicy` when issued |
| Claims | **FOUNDATION** | Notification workflow only — no settlement |
| Renewals | **REAL relation** | `renewalOfId` + Batch 9 reminders |

---

## Commerce — services & parts

| Feature | Data source | Notes |
|---------|-------------|-------|
| Services hub (public) | **REAL UI** | PIN discovery exact match |
| Service partner ERP | **REAL / EMPTY** | No mock jobs/technicians/revenue |
| Parts hub (public) | **REAL search** | `/api/parts/search` + PIN |
| Parts supplier ERP | **REAL inventory** | Org-scoped `PartProduct`; mock catalog unused |
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
| Leads pipeline | **REAL** | Canonical `Lead` + dealer owner fetch |
| Calls page | **REAL / EMPTY** | `LeadCall` + `CallSession`; no simulated connect |
| WhatsApp page | **GATED** | Shared Communication OS; disabled without provider |
| Analytics | **PARTIAL** | Real lead/sold counts; views and monthly sales dates not tracked |
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
| Feed posts | **REAL** | `GET /api/community/feed` → `social_posts`. Empty → "No posts yet." |
| Profiles | **REAL** | `CommunityUserProfile` via `/api/community/profile/*` |
| Groups | **PARTIAL** | Dedicated groups API; empty list if none |
| Likes / comments / shares / saves | **REAL** | Dedicated REST; DB counts only |
| Follow graph | **REAL** | `CommunityFollow` + `UserFollow` |
| Discovery | **REAL** | `/api/community/discover` — no fabricated suggestions |
| Reports | **REAL** | `CommunityReport` foundation; no auto-delete |
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
| Notifications | **REAL** | `/api/notifications/*` + `/api/customer/360` owner scoped |
| Customer garage / 360 | **REAL** | `/api/customer/360` — empty when no rows |
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

1. ~~Community feed (`social_posts`, likes, comments)~~ **DONE Batch 6**
2. Lead pipeline end-to-end (enquiry → dealer CRM)
3. Wishlist for authenticated users
4. Notifications per user
5. Vehicle detail with dealer join (single API)
6. Admin support_tickets / fraud_alerts tables or graceful empty state

Update this file when conversion completes.
