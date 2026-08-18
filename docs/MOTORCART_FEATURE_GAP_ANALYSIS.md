# MotorCart — Feature Gap Analysis

**Date:** 2026-08-18  
**Method:** Router + Prisma + mock-vs-real matrix + service files. No Vercel scrape.  
**Legend:** EXISTS = usable path with real or mostly real data · PARTIAL = UI and/or tables exist but mock/placeholder/incomplete · MISSING = no meaningful implementation.

Locations are representative, not exhaustive.

---

## CUSTOMER

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Customer profile | | ● | | `pages` profile, `/dashboard/customer/profile`, `/api/auth/settings` | Auth profile real; ecosystem extras mock |
| Customer dashboard | | ● | | `features/customer-ecosystem`, `/dashboard/customer` | Rich UI; `mock-customer-data.ts` |
| Customer ID | | ● | | `User.id` | No MotorCart ID / virtual card product |
| My Vehicles | | ● | | `/dashboard/customer/garage`, `CustomerVehicle` | Table exists; UX mixed with mock |
| Vehicle history | | ● | | `ServiceRecord`, garage pages | Not a full passport |
| Quotes | | | ● | Insurance quote UI only | No vehicle quotation object |
| Bookings | | ● | | `/services/my-bookings`, `Booking` / `ServiceBooking` | Service-side; new-car booking OS is dealer-side |
| Test drives | | ● | | `/dashboard/new-car/test-drives` | Dealer OS UI; no customer booking table |
| Finance | | ● | | `/finance/*`, `/dashboard/customer/loans` | Hub UI real; eligibility/applications mixed RPC+mock |
| Insurance | | ● | | `/insurance/*`, insurance wallet page | Quote logic mostly client defaults |
| Services | | ● | | `/services/*` | Hub UI; booking depth limited |
| Parts | | ● | | `/parts/*`, cart/checkout | Catalog merge; checkout backend partial |
| Rewards | | ● | | `/dashboard/customer/rewards` | UI; no rewards ledger |
| Notifications | | ● | | `/notifications`, `/api/notifications` | DB + guest scoped; incomplete |
| Reviews | | ● | | `Review` model | Not a complete customer review product |

---

## NEW VEHICLES

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| OEM | | | ● | — | No OEM tenant/portal |
| Brand | | ● | | `CatalogBrand`; UI hubs | Catalog has 1 seeded brand |
| Model | | ● | | `CatalogModel` | Same |
| Variant | | ● | | `CatalogVariant` | Only Creta SX(O) Diesel AT 2025 |
| Dealer | ● | | | `Dealer`, `/dealers` | Directory mixed mock/API |
| PIN-code inventory | | | ● | `Dealer.pincode` string | No PIN coverage engine |
| Excel inventory upload | ● | | | `/dashboard/new-car/inventory/bulk`, `InventoryUpload` | Dealer stock upload exists |
| Search | | ● | | `/search`, `/new-cars`, buy listing | Canonical listing is `/buy/:category/:condition`. `NewCarsListingPage` / `PreownedCarsListingPage` are imported in the router but **not mounted**; browse URLs redirect into Buy |
| Comparison | | ● | | `/vehicles/compare` | Spec matrix incomplete / mock |
| Quotation | | | ● | — | No structured quote |
| Test drive | | ● | | New-car dealer OS page | Placeholder/CRM-ish |
| Booking | | ● | | `NewCarBookingsPage` | Uses OS hook data; not marketplace checkout |
| Catalog master import | | ● | | `backend/src/lib/catalog/import/**` | Pipeline ready; licensed API not connected; dry-run only |
| Publish to catalog DB | | ● | | publish engine + admin confirm | Fail-closed without R2/S3; not used in daily site |

---

## USED VEHICLES

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Dealer listing | ● | | | `Vehicle`, dealer inventory CRM, `/used-cars` | Core path |
| Vehicle media | ● | | | gallery, `/api/upload` | |
| 360 photos | | ● | | `Viewer360.tsx`, `view360Url` | Component exists; not universal |
| Video | | ● | | `VideoSection.tsx` | |
| Watermark | | | ● | — | Not found as product pipeline |
| Vehicle valuation | | | ● | — | No valuation engine |
| Inspection | | ● | | service inspection UI | Not used-car inspection product |
| Dealer profile | ● | | | `/dealers/:slug`, storefront | |
| Used vehicle leads | ● | | | `POST /api/leads`, dealer leads pages | Real enquiry path |

---

## PARTS

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Vendor | | ● | | `PartsSupplierProfile`, parts ERP | ERP mock-heavy |
| Product | | ● | | `Part`, `PartProduct`, `mock-parts-catalog.ts` | Public hub MERGE |
| Inventory | | ● | | `/dashboard/parts/inventory` | UI complete, mock services |
| PIN-code search | | | ● | — | |
| Leads | | ● | | growth/dealer adjacent | Not a parts-lead engine |
| Orders | | ● | | `PartOrder`, checkout routes | Backend partial |

---

## SERVICES

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Workshop | | ● | | `ServiceCenter`, service partner ERP | ERP mock-heavy (`mock-sh-data.ts`) |
| PIN-code discovery | | ● | | pincode field on center | Not a geo engine |
| Services catalog | | ● | | `ServiceCatalog`, `/services` | Hub UI |
| Appointment | | ● | | booking flow pages | Depth limited |
| Leads | | ● | | generic leads | |
| Reviews | | ● | | `Review`, CRM reviews page | |

---

## FINANCE

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Bank | | ● | | `Bank`, mock bank integrations | |
| NBFC | | ● | | `bank_nbfc` role | Same portal as bank |
| Customer eligibility | | ● | | `EligibilityChecker` | Client/rules |
| Application | | ● | | `FinanceApplication`, `/finance/apply` | RPC + mock |
| Documents | | ● | | DSA pending docs panel | Not a full vault |
| Loan status | | ● | | status tracker UI | |
| Partner leads | | ● | | `FinanceLead` | |

---

## INSURANCE

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Insurance partner | | ● | | `InsurancePartner`, `mock-insurers.ts` | |
| Vehicle information | | ● | | quote forms | |
| Quotes | | ● | | `InsuranceQuote`, `/insurance/quote` | Mostly client-side |
| Renewal | | ● | | `/insurance/renew` | Cron/job not implemented |
| Claims | | ● | | `/insurance/claims` | UI |
| Leads | | ● | | applications table | |

---

## DEALER / PARTNER

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Dashboard | ● | | | `/dashboard/dealer`, `/dashboard/new-car` | |
| CRM | | ● | | leads, enquiries, notes | Calls mock when empty |
| Inventory | ● | | | dealer inventory CRM, new-car inventory | |
| Leads | | ● | | `Lead`, `DealerLead` | Dual tables |
| Lead board | | ● | | lead tables / kanban-ish | |
| Follow-ups | | ● | | `CrmTask` | |
| Calling | | ● | | `DealerCallsPage`, `LeadCall` | Mock-heavy |
| Quotations | | | ● | — | |
| Payments | | | ● | — | No payment ledger |
| Payouts | | | ● | broker commissions only | |
| Analytics | | ● | | analytics pages | Sample charts |
| Team | | ● | | `DealerMember`, team pages | |
| Subscription | | ● | | `DealerSubscriptionPage`, `SubscriptionPlan` | Shell / billing MVP |

---

## COMMUNITY / NETWORK

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| Feed | | ● | | `/community`, `/api/community/posts` | Query 500s possible historically |
| Profiles | | ● | | `CommunityUserProfile` | |
| Companies | | ● | | `CommunityBusinessProfile`, directory | |
| Groups | | ● | | `CommunityGroup` | |
| Following | | ● | | `CommunityFollow` / `UserFollow` | Dual models; matrix said follow incomplete |
| Jobs | | | ● | — | |
| Videos | | ● | | post kinds | Not a video network |
| Learning | | | ● | — | |
| Events | | | ● | — | |

---

## AI

| FEATURE | EXISTS | PARTIAL | MISSING | LOCATION IN CODE | NOTES |
|---------|:------:|:-------:|:-------:|------------------|-------|
| AI search | | ● | | unified search + `/ai` | Not production LLM search |
| AI recommendations | | ● | | `recommendationbot`, parts AI widgets | Rules |
| AI lead qualification | | ● | | `leadbot` | Optional OpenAI |
| AI sales | | ● | | dealerbot / control center | Stub |
| AI voice | | | ● | — | |
| AI follow-up | | ● | | reminders / campaigns tables | Not agentic |
| AI opportunity engine | | | ● | — | Vision only |

---

## Cross-cutting marketplace (code vs mock)

Aligned with `cursor/23_Mock_vs_Real_Data_Matrix.md` and live Docker:

- **REAL:** JWT auth, health, DB vehicle detail by id, `POST /api/leads`, dealer inventory writes, admin user/KYC APIs, catalog dry-run pipeline.
- **MERGE:** vehicle hubs (`getVehiclePool` + mock catalog) unless `VITE_REAL_DATA_ONLY`.
- **MOCK / PLACEHOLDER:** finance browse, auction hub data, parts/service ERPs, customer rewards/FASTag, many new-car OS modules, AI control center, admin demo fallback when enabled.

Public site Docker flags currently prefer `VITE_REAL_DATA_ONLY=true` and `VITE_ADMIN_DEMO_FALLBACK=false` in `.env.docker.example`.
