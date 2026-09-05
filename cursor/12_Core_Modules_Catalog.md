# MotorCart — Core Modules Catalog

**Complete inventory of platform modules — existing + planned**

Legend: ✅ Working · ⚠️ Partial / mock-heavy · 📋 Planned · 🏗️ Shell only

---

## Customer platform

| Module | Route / entry | Frontend path | Status |
|--------|---------------|---------------|--------|
| Home | `/` | `pages/HomePage.tsx`, `features/home/` | ✅ |
| Unified search | `/search` | `features/unified-search/`, `features/search/` | ⚠️ |
| Customer dashboard | `/dashboard/customer` | `pages/dashboard/CustomerDashboardPage.tsx` + ecosystem | ✅ Batch 9 super-app sections |
| Wishlist | `/wishlist` | vehicle store + DB | ⚠️ |
| Notifications | `/notifications` | `features/notifications-center/` | ⚠️ |
| Profile & settings | `/profile`, auth settings | `pages/`, auth components | ✅ |
| MotorCart careers | `/careers` | `pages/CareersPage.tsx` | ✅ own hiring (not ecosystem jobs) |
| Mobile customer app | Expo app | `apps/mobile-customer/` | 🏗️ |

---

## Vehicle marketplace

| Module | Route | Frontend path | Status |
|--------|-------|---------------|--------|
| Vehicle hubs (7 types) | `/vehicles/:hub` | `features/ecosystem/pages/VehicleHubPage.tsx` | ✅ |
| Buy hub | `/buy` | `features/marketplace/pages/BuyHubPage.tsx` | ✅ |
| Sell flow | `/sell` + `/dashboard/customer/sell` | marketplace sell + sell requests | ✅ listing kept; sell-request lifecycle |
| New cars | `/new-cars` | new-car listing pages | ✅ |
| Stock-by-PIN | listing PIN check → `GET /api/inventory/by-pincode` | `features/inventory/` | ✅ exact PIN, real stock |
| Used / preowned | `/used-cars` | preowned pages | ✅ |
| Vehicle detail | `/vehicles/:slug` | `VehicleDetailPage` | ✅ |
| Compare | `/compare` | compare feature | ⚠️ |
| Dealer directory | `/dealers` | business-directory | ✅ |
| Enquiries / leads | forms → `POST /api/leads` | lead forms | ✅ |

---

## Commerce — finance

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Finance marketplace | `/finance` | `features/finance/pages/FinanceMarketplacePage.tsx` | ⚠️ |
| Loan apply | `/finance/apply` | loan application forms | ⚠️ |
| DSA portal | `/dashboard/dsa` | DSA workspace | ⚠️ |
| Lender dashboard | `/dashboard/finance` | `LenderDashboardPage` | ✅ Batch 11 products + existing applications |
| Finance manager | `/dashboard/finance-manager` | manager desk | ⚠️ |
| EMI calculators | embedded widgets | finance components | ✅ |

---

## Commerce — insurance

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Insurance hub | `/insurance` | `features/insurance/pages/InsuranceHubPage.tsx` | ✅ |
| Quote / compare | `/insurance/*` | insurance components (7 vehicle types) | ✅ partner quotes only when persisted |
| Insurance partner console | `/dashboard/insurance` | `InsurancePartnerDashboardPage` | ✅ Batch 11 |
| Customer policies | customer dashboard + `/api/insurance/policies` | policies/claims foundation | ✅ records when issued |

---

## Commerce — services

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Services hub | `/services` | `features/service-booking/pages/ServicesHubPage.tsx` | ✅ |
| Service booking | booking flows | service-booking | ⚠️ |
| Service partner ERP | `/dashboard/service` | `features/service-partner/` | ✅ Batch 11 empty-state / real bookings |

---

## Commerce — parts & accessories

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Parts hub | `/parts` | `features/parts/` | ✅ |
| Cart / checkout | `/parts/cart` | parts commerce | ⚠️ |
| Parts supplier ERP | `/dashboard/parts` | `features/parts-supplier/` | ✅ inventory/orders via org-scoped products |
| Ecosystem jobs | `/jobs`, `/jobs/:id`, `/company/:slug/jobs` | `features/jobs/` | ✅ separate from `/careers` |
| Company pages | `/company/:slug` | `features/jobs/pages/CompanyPublicPage.tsx` | ✅ public-safe |
| OEM console | `/dashboard/oem` | `features/oem/pages/OemDashboardPage.tsx` | ✅ authorized-dealer metrics |

---

## Auction platform

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Auction hub | `/auctions` | `features/auctions/` | ⚠️ |
| Auction room | `/auctions/room/:id` | `AuctionRoomPage` + Socket.io | ⚠️ |
| Auction admin | `/dashboard/auctions` | auction admin | ⚠️ |
| Super-admin approvals | admin auction pages | platform-admin | ⚠️ |

---

## Dealer platform

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Used car dealer CRM | `/dashboard/dealer` | `features/dealer-crm/` | ✅ Batch 7 + Batch 10 comms/dialer |
| Quotations | `/dashboard/dealer/quotations`, `/dashboard/customer/quotations` | `features/quotations/` | ✅ |
| Test drives | `/dashboard/dealer/test-drives`, `/dashboard/new-car/test-drives`, `/dashboard/customer/test-drives` | `features/test-drives/` | ✅ |
| New car dealer OS | `/dashboard/new-car-dealer` | `features/new-car-dealer/` | ⚠️ placeholders |
| Inventory CRM | dealer inventory routes | dealer-crm inventory | ✅ partial |
| Leads pipeline | `/dashboard/dealer/leads`, `/dashboard/dealer/pipeline` | dealer-crm + `/api/crm/*` | ✅ Sales OS |
| Lead Board | `/dashboard/dealer/lead-board` | gated REST | ✅ entitlement + flags |
| PIN lead routing | `/api/lead-routing` | exact PIN coverage | ✅ not stock-by-PIN |
| Storefront | public dealer page | `DealerStorefrontPage` | ✅ |
| Team / analytics | dealer subpages | dealer-crm pages | ⚠️ |
| Subscriptions | dealer billing page | `DealerSubscriptionPage` | 🏗️ |

---

## CRM & business

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Broker CRM | `/dashboard/broker` | `features/broker-crm/` | 🏗️ |
| Growth CRM | `/dashboard/growth` | `features/growth-crm/` | 🏗️ |
| Business hub | `/business` | `features/business-hub/` | ⚠️ |
| Business directory | `/directory` | `features/business-directory/` | ⚠️ |
| Billing / subscriptions | `/dashboard/dealer/billing`, `/dashboard/super-admin/subscriptions` | commercial APIs + N2 `/dashboard/billing` | ✅ Batch 8 DB plans |
| Partner payouts | `/dashboard/dealer/earnings`, `/dashboard/super-admin/payouts` | `/api/payouts*` | ✅ |
| Customer rewards | `/dashboard/customer/rewards` | `/api/rewards*` | ✅ ledger; MotorCart One **reads** balance |
| MotorCart One | `/dashboard/customer/one`, `/one/verify/:token` | identity card + QR verify | ✅ not a payment card |
| Unified search | `/api/search` | PostgreSQL federation | ✅ Batch 12; catalog ≠ stock |
| Admin command center | `/dashboard/super-admin` | `/api/admin/overview`, `/api/admin/analytics` | ✅ real counts / zeros |
| Saved searches / reminders | `/dashboard/customer/saved-searches`, `/reminders` | `/api/saved-searches`, `/api/reminders` | ✅ |
| Valuation desk | `/dashboard/valuation` | partner org membership | ✅ indicative only |
| Dealer acquisitions | `/dashboard/dealer/acquisitions` | open sell requests + offers | ✅ PII masked |

---

## Community platform

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Community feed | `/community` | `features/community/` feed pages | ✅ real DB feed |
| Discover | `/community/discover` | `CommunityDiscoverPage` | ✅ |
| Saved posts | `/community/saved` | `CommunitySavedPage` | ✅ |
| Groups | `/community/groups` | `CommunityGroupsPage` | ⚠️ groups API; empty if none |
| Profiles | `/community/u/:id` | profile pages | ✅ |
| Moderation | super-admin community + `CommunityReport` | reports API + existing admin page | ✅ foundation |
| Mobile community nav | — | `CommunityLayout` | ✅ |

---

## Admin & platform

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Super admin ERP | `/dashboard/super-admin` | `features/platform-admin/` | ⚠️ demo fallback |
| Admin alias | `/dashboard/admin` | admin-pages.ts | ✅ alias |
| Founder dashboard | founder route | `features/founder-dashboard/` | 🏗️ |
| CMS | super-admin cms | `CmsPage` | ⚠️ |
| KYC / approvals | admin approval pages | platform-admin | ⚠️ |
| Fraud detection | admin | `FraudDetectionPage` | ⚠️ |
| Lead router | admin | `LeadRouterPage`, `MarketplaceLeadsPage` | ⚠️ |
| AI control center | super-admin AI | `SuperAdminAIPage`, `ai/` | 🏗️ |

---

## Cross-cutting platform services

| Service | Location | Status |
|---------|----------|--------|
| Auth (JWT) | `AuthProvider`, `/api/auth/*` | ✅ |
| Generic DB query | `/api/db/query` | ✅ (hardening needed) |
| RPC layer | `/api/db/rpc/[fn]` | ✅ |
| File upload | `/api/upload` | ✅ |
| Realtime | Socket.io in backend | ⚠️ |
| Notifications | hooks + guest service | ⚠️ |
| Permissions | `permissions/matrix.ts` | ✅ |
| Theme (light/dark) | `ThemeContext`, global.css | ✅ |
| i18n structure | English only today | 📋 |
| Communication OS | `/api/communications/*`, `/api/telephony/*` | ✅ Batch 10 |
| AI sales agent | `/api/ai/conversations`, `/api/ai/recommendations/best-deal` | ✅ Batch 10 server-side |

---

## Backend dedicated API routes (34+)

See `18_Backend_Architecture.md` for full map.

Categories: **auth**, **vehicles**, **leads**, **auctions**, **notifications**, **upload**, **admin**, **health**, **db/query**, **db/rpc**.

---

## Extension rule

When adding a module:

1. Add row to this catalog
2. Add route in `router/index.tsx` (lazy if heavy)
3. Add Prisma models via migration if needed
4. Update `23_Mock_vs_Real_Data_Matrix.md`
5. Update `10_Sprint_Backlog.md`
