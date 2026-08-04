# MotorCart — Core Modules Catalog

**Complete inventory of platform modules — existing + planned**

Legend: ✅ Working · ⚠️ Partial / mock-heavy · 📋 Planned · 🏗️ Shell only

---

## Customer platform

| Module | Route / entry | Frontend path | Status |
|--------|---------------|---------------|--------|
| Home | `/` | `pages/HomePage.tsx`, `features/home/` | ✅ |
| Unified search | `/search` | `features/unified-search/`, `features/search/` | ⚠️ |
| Customer dashboard | `/dashboard/customer` | `dashboards/customer/` | ⚠️ |
| Wishlist | `/wishlist` | vehicle store + DB | ⚠️ |
| Notifications | `/notifications` | `features/notifications-center/` | ⚠️ |
| Profile & settings | `/profile`, auth settings | `pages/`, auth components | ✅ |
| Mobile customer app | Expo app | `apps/mobile-customer/` | 🏗️ |

---

## Vehicle marketplace

| Module | Route | Frontend path | Status |
|--------|-------|---------------|--------|
| Vehicle hubs (7 types) | `/vehicles/:hub` | `features/ecosystem/pages/VehicleHubPage.tsx` | ✅ |
| Buy hub | `/buy` | `features/marketplace/pages/BuyHubPage.tsx` | ✅ |
| Sell flow | `/sell` | marketplace sell pages | ✅ |
| New cars | `/new-cars` | new-car listing pages | ✅ |
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
| Lender dashboard | `/dashboard/lender` | lender pages | ⚠️ |
| Finance manager | `/dashboard/finance-manager` | manager desk | ⚠️ |
| EMI calculators | embedded widgets | finance components | ✅ |

---

## Commerce — insurance

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Insurance hub | `/insurance` | `features/insurance/pages/InsuranceHubPage.tsx` | ✅ |
| Quote / compare | `/insurance/*` | insurance components (7 vehicle types) | ✅ |
| Customer policies | customer dashboard | insurance customer pages | ⚠️ |

---

## Commerce — services

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Services hub | `/services` | `features/service-booking/pages/ServicesHubPage.tsx` | ✅ |
| Service booking | booking flows | service-booking | ⚠️ |
| Service partner ERP | `/dashboard/service-partner` | `features/service-partner/` (~50 routes) | ⚠️ mock-heavy |

---

## Commerce — parts & accessories

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Parts hub | `/parts` | `features/parts/` | ✅ |
| Cart / checkout | `/parts/cart` | parts commerce | ⚠️ |
| Parts supplier ERP | `/dashboard/parts-supplier` | `features/parts-supplier/` (~70 routes) | ⚠️ mock-heavy |

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
| Used car dealer CRM | `/dashboard/dealer` | `features/dealer-crm/` | ⚠️ |
| New car dealer OS | `/dashboard/new-car-dealer` | `features/new-car-dealer/` | ⚠️ placeholders |
| Inventory CRM | dealer inventory routes | dealer-crm inventory | ✅ partial |
| Leads pipeline | dealer leads | `LeadTable`, hooks | ⚠️ |
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
| Billing | `/dashboard/billing` | `features/billing/` | 🏗️ |

---

## Community platform

| Module | Route | Path | Status |
|--------|-------|------|--------|
| Community feed | `/community` | `features/community/` feed pages | ⚠️ |
| Groups | `/community/groups` | `CommunityGroupsPage` | ⚠️ |
| Profiles | `/community/u/:id` | profile pages | ⚠️ |
| Moderation | super-admin community | `CommunityModerationPage` | ⚠️ |
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
