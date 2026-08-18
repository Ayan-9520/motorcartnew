# MotorCart — Phase Roadmap (design only)

**Date:** 2026-08-18  
**This file does not authorize implementation.** Phase 1 stops here.  
**Aligns with:** `cursor/21_Enterprise_Roadmap.md`, `cursor/00_Master_Directive.md` (extend, never replace).

---

## Principles

1. Keep every working public route and API.
2. Additive Prisma migrations only.
3. Dedicated APIs for hot paths; shrink `/api/db/query` over time.
4. Catalog master = licensed OEM/API feed. Listings scrape ≠ master.
5. Mock → partial → real **per module**, documented in `cursor/23_Mock_vs_Real_Data_Matrix.md`.

---

## Recommended Phase 2 (next authorized slice — not started)

Stabilize and connect data, still **no** MotorCart One rewrite:

1. Production env checklist: JWT secrets, CORS, `STRICT_DB_QUERY` plan, `DEV_WRITE_TABLES` off.
2. Role allowlist on `/api/db/query` behind flag (SEC-001).
3. Vehicle detail always via dedicated API with dealer join (reduce mock-id 404s).
4. Enquiry → dealer CRM path tested end-to-end in Docker (real `leads`).
5. Catalog: choose licensed new-car JSON provider; dry-run against real URL; **do not publish** until R2/S3 + admin approval policy signed off.
6. Do not scrape CarDekho/GaadiBazaar as catalog master.
7. Community feed empty/error states so “500” is not a blank ERP.
8. Document host Prisma `DATABASE_URL` must be Docker Postgres when using compose.

Phase 2 is **stabilize + real data on existing screens**. Not OEM portal, not AI voice, not payments.

---

## Evolution map (existing code → future product)

Each future pillar should **extend** a current module, not replace it.

| Future product | Extend from (today) | First additive step (later phases) |
|----------------|---------------------|-------------------------------------|
| MotorCart One | Public SPA router + role workspaces | Unified shell/navigation already exists; stop adding parallel hubs |
| Customer 360 | `customer-ecosystem` + `CustomerVehicle` | Replace mock snapshot with garage + leads + bookings APIs |
| Partner / Organization Platform | `User` + `Dealer` + `GrowthWorkspace` | New `Organization` table + membership; map existing dealers |
| Marketplace Engine | `Vehicle` + buy/sell/auction routes | `sale_mode` already enum’d; enforce in API |
| Inventory Engine | `Vehicle` + `NewCarInventory` + Excel upload | Link rows to `CatalogVariant` via existing FK |
| Lead Engine | `Lead` (canonical) | Adapter layer over Dealer/Broker/Finance/Growth leads — don’t delete tables |
| Opportunity Engine | `Lead` + `AiInsight` + leadbot | Server-side scoring job; no client OpenAI keys |
| CRM | `dealer-crm` + `CrmTask` | Shared activity stream (`crm_activities` in enterprise roadmap) |
| AI Sales Agent | `frontend/src/ai` + `/ai` | Move completions to backend provider adapter |
| AI Voice Agent | — | New; requires telephony provider abstraction first |
| Network | `community` APIs | Complete follow/feed; then jobs/events |
| Company Profiles | `CommunityBusinessProfile` + directory | Already partial |
| Jobs | — | New community module |
| Rewards | customer rewards page | Ledger table later |
| Virtual Card | — | After identity + KYC |
| Vehicle Passport | `CustomerVehicle`, `VehicleDocument`, `ServiceRecord` | Unify into one read API |
| Trust / Rating / Certification | `Review`, `kycStatus`, dealer verified flags | Certification workflow on admin |
| OEM Portal | `CatalogBrand` + catalog import | OEM role + org; consume same import pipeline |
| Bank / NBFC Portal | `bank_nbfc` + finance desks | Keep one finance console; deepen real applications |
| Insurance Portal | insurance hub + `InsurancePartner` | Insurer role additive |
| Parts Portal | parts hub + parts-supplier ERP | Swap mock services for `Part*` tables |
| Workshop Portal | service-partner ERP | Same pattern |
| Admin Control Tower | `platform-admin` + `/dashboard/super-admin` | Disable demo fallback in prod; dedicated APIs for tickets/fraud |

---

## Catalog / new-car data (explicit)

**Now:** pipeline + mock JSON API + one seeded Creta variant. Customers cannot purchase from mock catalog.

**Later:** licensed `CATALOG_MASTER_SOURCE_URL` → dry-run → approve → R2/S3 publish → link dealer stock by `catalog_variant_id` → enquiry/booking against **stock**, not against scraped ads.

---

## Longer enterprise phases (from `cursor/21_Enterprise_Roadmap.md`)

- **A Stabilize** (P0) — security, vehicle API, community errors  
- **B Marketplace depth** — wishlist, compare, hub cache  
- **C Commerce** — finance router, insurance renewal job, auction bid APIs, payment webhooks  
- **D CRM unify** — activities, broker depth, WhatsApp templates  
- **E Community + growth** — messaging, DNS, queues  

Do not collapse A–E into one “Phase 2” implementation.

---

## Stop line

Phase 1 documentation is complete. **Do not automatically continue to Phase 2.**
