# Catalog Review & Approval Engine (Phase 2D)

Internal backend workflow only. **Dry run — no database writes**, no HTTP routes, no UI, no background jobs.

## Purpose

Consume the Phase 2C catalog linking dry-run output and classify each listing into an approval state with breakdowns, highlights, and actionable recommendations.

## Location

```
backend/src/lib/catalog/
├── approval-types.ts
├── approval-rules.ts
├── approval-anomalies.ts
├── catalog-approval.service.ts
├── approval-report.ts
└── catalog-approval.test.ts

backend/scripts/catalog-approval-dry-run.ts
backend/reports/catalog-approval/     ← generated output (gitignored)
```

## Approval states

| State | Rule (default config) |
|-------|------------------------|
| `AUTO_APPROVED` | Confidence **≥ 98** (exact match = 100) |
| `MANUAL_REVIEW` | Confidence **80–97**, or `MULTIPLE_MATCHES` |
| `REJECTED` | Confidence **< 80**, `NO_MATCH`, or `LOW_CONFIDENCE` |

Thresholds are configurable via `CatalogApprovalConfig`.

## Input

Phase 2C `CatalogLinkReport` plus optional listing context:

```typescript
{
  linkReport: CatalogLinkReport,
  listingContext?: ListingApprovalContext[]  // dealer, city, fuel, transmission
}
```

## Output per listing

Extends Phase 2C row with:

- `approvalState`, `approvalReason`
- `dealerId`, `dealerName`, `city` (when context provided)
- `issues[]` — anomaly flags
- `recommendations[]` — row-level suggestions

## Report breakdowns

- Summary (totals by approval state)
- By brand, model, dealer, city, source

## Highlights

| Highlight | Description |
|-----------|-------------|
| Duplicate business keys | Multiple catalog variants share one business key |
| Conflicting variants | Ambiguous `MULTIPLE_MATCHES` rows |
| Missing catalog models | Brand known, model absent |
| Unknown brands | Brand not in catalog index |
| Unknown fuel types | Fuel not in catalog fuels |
| Unknown transmissions | Transmission not in catalog |

## Recommendations

| Kind | Example |
|------|---------|
| `CREATE_CATALOG_VARIANT` | Missing model or conflicting variants |
| `MERGE_DUPLICATE` | Duplicate business keys in catalog |
| `CREATE_ALIAS` | Unknown brand labels |
| `UPDATE_NORMALIZATION` | Unknown fuel/trans or fuzzy-only matches |

## Report formats

- **JSON** — full `CatalogApprovalReport` envelope
- **CSV** — flat listing rows with approval columns
- **HTML** — summary, highlights, breakdown tables, listing preview

## Usage

### Programmatic

```typescript
import { createCatalogApprovalService } from "@/lib/catalog";

const approval = createCatalogApprovalService(catalogVariants);
const report = approval.review({ linkReport, listingContext });
```

### CLI (read DB → write reports only)

```bash
cd backend
npm run catalog:approval:dry-run
```

Runs Phase 2C linking + Phase 2D approval in one pass. Writes `.json`, `.csv`, and `.html` under `backend/reports/catalog-approval/`.

**Does not** update `catalog_variant_id` or any database values.

## Tests & benchmark

```bash
npm run test:catalog-approval
npm run test:catalog          # all catalog suites
npm run benchmark:catalog-approval
```

## Safety

| Rule | Enforced |
|------|----------|
| No DB writes | Read-only loaders + pure review service |
| No FK population | `catalog_variant_id` never set |
| No API / UI / routes | Not registered anywhere |
| No Prisma changes | No schema or migrations |

## Phase boundaries

| Phase | Scope |
|-------|--------|
| 2C | Linking dry-run |
| **2D** | Review & approval (this document) |
| 3+ | Import / persistence (future, requires approval) |
