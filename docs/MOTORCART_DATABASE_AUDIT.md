# MotorCart — Database Audit

**Date:** 2026-08-18  
**Schema:** `backend/prisma/schema.prisma`  
**ORM:** Prisma 6 · **Engine:** PostgreSQL  
**Phase 1 rule:** no tables created, no migrations applied by this audit.

Live Docker health at audit time: **11 users**, **34 vehicles**.

---

## 1. Migrations present

| Migration | Purpose |
|-----------|---------|
| `20250704120000_init` | Core platform schema |
| `20250805120000_catalog_core` | Catalog master tables |
| `20250805143000_catalog_listing_fk` | Nullable `catalog_variant_id` on `vehicles` and `new_car_inventory` |

`backend/supabase/migrations/*.sql` is **legacy reference**. Do not import.

Seed: `backend/prisma/seed.ts`, `backend/prisma/seeds/catalog-seed.ts`.

**Model count:** 127 Prisma `model` blocks, 28 enums. Every model has `@@map`. Catalog import jobs are in-memory TypeScript, not Prisma tables.

---

## 2. Entity status (requested list)

Legend: **EXISTS** = table/model in Prisma · **PARTIAL** = exists but thin, duplicated, or unused by product · **MISSING** = no first-class model.

| Entity | Status | Models / notes |
|--------|--------|----------------|
| users | EXISTS | `User`, `RefreshToken`, `OtpCode`, `PasswordReset`, `DeviceSession` |
| customers | PARTIAL | Role `customer` on `User`; `CustomerVehicle`, `CustomerPreference` — not a separate Customer org table |
| dealers | EXISTS | `Dealer`, `DealerMember`, `DealerStorefront`, `DealerDocument`, `DealerAuctionEntry` |
| organizations | MISSING | No `Organization` / partner-tenant table. Growth `GrowthWorkspace` is a partial substitute for marketing CRM only |
| vehicles | EXISTS | `Vehicle`, `VehicleSpec` |
| inventory | EXISTS | Used: `Vehicle`. New: `NewCarInventory`, `NewCarStockDailyLog`, `InventoryUpload` |
| catalog master | EXISTS | `CatalogBrand`, `CatalogModel`, `CatalogVariant` + specs/media/colors/features/city prices, `CatalogDataSource`, `CatalogCity` — **sparsely seeded** |
| leads | EXISTS (duplicated) | `Lead`, `DealerLead`, `BrokerLead`, `FinanceLead`, `GrowthLeadCaptureEvent` |
| quotes | PARTIAL | `InsuranceQuote` only. No general quotation engine for vehicles |
| bookings | EXISTS (duplicated) | `Booking`, `ServiceBooking` (workshop). No Prisma vehicle/new-car booking table (`vehicle_bookings` exists only in legacy Supabase SQL) |
| test drives | MISSING | New-car UI page exists; no `TestDrive` model |
| finance | EXISTS | `Bank`, `FinanceApplication`, `FinanceLead`, `FinanceCommission`, `FinanceVerification`, `FinanceStatusHistory`, `BankIntegrationConfig`, `DsaAgent` |
| insurance | EXISTS | `InsuranceApplication`, `InsurancePartner`, `InsuranceQuote`, `InsuranceWallet` |
| parts | EXISTS | `Part`, `PartProduct`, `PartOrder`, `PartOrderItem`, `PartCompatibilityRule`, `PartRegistrationLookup`, `PartsSupplierProfile` |
| services | EXISTS | `ServiceCatalog`, `ServiceCenter`, `ServiceBooking`, `ServiceJobCard`, `ServiceRecord`, `ServiceCustomersCrm`, `ServiceAiLog` |
| workshops | PARTIAL | `ServiceCenter` is the workshop entity; no separate Workshop org |
| community | EXISTS | `SocialPost`, `CommunityPost` (**overlap**), groups, likes, comments, follows, profiles, business profiles, moderation |
| payments | MISSING | No Payment / Razorpay/Stripe charge table. Billing is plans/entitlements, not a payment ledger |
| subscriptions | PARTIAL | `SubscriptionPlan`, growth `subscriptionTier`; dealer subscription page is shell |
| notifications | EXISTS (duplicated) | `Notification`, `NotificationLog`, `PlatformNotification`, `AuctionNotification` |
| reviews | EXISTS | `Review` |
| ratings | PARTIAL | Dealer rating fields / review scores; no standalone Rating aggregate table |
| locations | PARTIAL | `city`/`state` strings on users/dealers; `CatalogCity` |
| PIN codes | PARTIAL | `Dealer.pincode`, `ServiceCenter.pincode` strings — **no PIN-code inventory engine** |
| auctions | EXISTS | `Auction`, bids, messages, auto/proxy bid, watchlist, eligibility |
| wishlists | EXISTS | `Wishlist` — frontend partially wired |
| KYC | PARTIAL | `User.kycStatus` + admin KYC routes; not a full KYC document workflow table |
| OEM | MISSING | No OEM org/role/table. Catalog brands are not OEM tenants |
| broker | EXISTS | Full broker CRM cluster |
| growth | EXISTS | Workspaces, assets, designs, WhatsApp, lead forms |
| platform admin | EXISTS | CMS banners/pages, support tickets, fraud alerts, activity log |
| AI persistence | PARTIAL | `AiInsight` — not a conversation/job store |

---

## 3. Duplicate / overlapping entities

| Overlap | Why it matters |
|---------|----------------|
| `Lead` vs `DealerLead` vs `BrokerLead` vs `FinanceLead` vs Growth capture events | No single Lead Engine. Routing/analytics will fork |
| `CommunityPost` vs `SocialPost` | Two community post models |
| `UserFollow` vs `CommunityFollow` | Two follow graphs |
| `Notification` vs `NotificationLog` vs `PlatformNotification` vs `AuctionNotification` | Notification fan-out is split |
| `Booking` vs `ServiceBooking` | Service bookings duplicated conceptually |
| `Part` vs `PartProduct` | Parts catalog vs SKU-like product |
| `Vehicle` vs `NewCarInventory` vs `CatalogVariant` | Three “car” identities. Linking FK exists but is unused in live data |
| `Dealer` vs `User.role` dealer variants vs `GrowthWorkspace` | Partner identity is not unified |

---

## 4. Catalog / listing FK (current live intent)

`vehicles.catalog_variant_id` and `new_car_inventory.catalog_variant_id` are **nullable**. Catalog import publish upserts catalog rows; it does **not** currently populate listing FKs as part of marketplace linking (linking is a separate dry-run report).

Last catalog-focused verification (same stack): 1 brand, 1 model, 1 variant (Hyundai Creta 2025); listing FKs null.

---

## 5. What is not in the database (explicit)

- Organization / multi-entity partner tenant
- OEM portal tenant
- Insurance company tenant (distinct from `bank_nbfc` user role)
- Payment intents / settlement / payout ledger
- PIN-code coverage grid
- Vehicle Passport / RC vault as a first-class product table beyond `VehicleDocument` / `CustomerVehicle`
- Jobs / learning / events (community vision)
- Virtual card / rewards ledger (customer rewards UI is mock)

Do **not** create these in Phase 1.
