# MotorCart — Partner / Industry OS (Batch 11)

**Status:** Partner operating layer for parts, workshops, OEM, bank/NBFC, insurance, company pages, and ecosystem jobs.  
**Batch 12:** CLOSED — search/admin/observability only; Partner OS not rewritten.

Organization remains the tenant. Domain records stay on existing models (`Dealer`, `Bank`, `DsaAgent`, `InsurancePartner`, `ServiceCenter`, `Part` / `PartProduct`, `Lead`, CRM, Finance, Community). No `PartsOrganization` / `WorkshopOrganization` identity graphs.

## What shipped

| Domain | Behaviour |
|--------|-----------|
| Parts | Seller inventory on `PartProduct` + compatibility rules; orders via Part adapter (`PartOrderItem` still FKs `Part`) |
| Service | Exact PIN discovery, optional real `ServiceSlot`, job cards, estimate ≠ invoice, item approve/reject |
| OEM | `OrganizationDealerAuthorization` pending/authorized/inactive; metrics only for **authorized** dealers |
| Bank/NBFC | `FinanceProduct` config; applications by `Bank.organizationId`; `bank_nbfc` auth path unchanged |
| Insurance | Quotes `INDICATIVE` / `PARTNER_QUOTE` / `BOUND`; policies; renewal-of; claims `NOTIFIED` |
| Company | Public `/company/:slug` — no private PII |
| Jobs | `/jobs` ecosystem product; `/careers` remains MotorCart hiring |
| Trust | Admin certifications; OEM Authorized only if status=`authorized` |
| Routing | `OrganizationCoverage` PIN+domain (FINANCE/INSURANCE/PARTS/SERVICE); no radius |

## Reused engines

- CRM: Batch 7 `CrmActivity` / Lead / Opportunity  
- Communication / AI: Batch 10 (no second framework)  
- Billing / payouts: Batch 8 (no invented commission %)  
- PIN: existing India 6-digit validator; no Haversine  

## Dedicated REST (not `/api/db/query`)

`/api/parts/*`, `/api/service/*`, `/api/oem/*`, `/api/finance/products`, `/api/insurance/{quotes,policies,claims}`, `/api/jobs*`, `/api/company/[slug]`, `/api/professionals/*`, `/api/partner/{coverage,ratings,certifications}`, `/api/discover/ecosystem`

Sensitive tables are on `NEVER_ALLOW` (orders, job cards, claims, job applications, finance products, authorizations, quotes, policies).

## Truth rules

- No fake VIN compatibility (`VIN_COMPATIBILITY_LIVE = false`)  
- No fake courier tracking  
- No live slots unless `ServiceSlot` rows exist  
- No client-calculated insurer premium as a partner quote  
- Catalog source remains licensed feed / OEM API / partner upload — never scraper-master  

## Tests

```
cd backend
npx tsx --test src/lib/partneros/partneros.test.ts      # test:batch11
npx tsx --test src/lib/partneros/partneros-db.test.ts   # test:batch11-db
```

## Out of scope (Batch 12)

OpenSearch, S3/CDN, bureau/CIBIL, real LOS, DMS, scraper-master catalog, global tax, multi-currency production.
