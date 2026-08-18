# Phase 5E — Catalog Publish Engine

First phase that writes **APPROVED** import records into the existing catalog schema. Does **not** modify marketplace listings, dealer/customer flows, homepage, or CRM.

## Endpoint

```http
POST /api/admin/catalog/import/:jobId/publish
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "confirm": true }
```

Requires:

- `FEATURE_CATALOG_ADMIN=true`
- `FEATURE_CATALOG_LAYER=true`
- Platform admin JWT (`admin` / `super_admin`)
- Explicit `confirm: true`
- Object storage configured (R2 or S3)

## Publish flow

```
APPROVED decisions
  → Final validation (reuse Phase 3C)
  → Final duplicate check (reuse Phase 3D)
  → Idempotent catalog match (business_key / source+externalId)
  → Media upload via StorageProvider
  → Per-record DB transaction (brand → model → variant → children)
  → Publish report + ActivityLog audit
```

## Storage safety

Publishing **fails closed** unless:

```env
STORAGE_PROVIDER=cloudflare_r2   # or aws_s3
STORAGE_BUCKET=motorcart-catalog
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
```

Local disk storage is rejected for publish. Tests may inject a mock provider via `allowMockStorage`.

## Idempotency

1. Upsert by `business_key`
2. Fallback match on `(sourceId, externalId)`
3. Same job already published → `SKIPPED_DUPLICATE`
4. Concurrent publish for same jobId shares one in-flight promise

## Transaction strategy

Each record runs in its own `prisma.$transaction`. Media upload failure aborts that record’s transaction only — other records continue.

## Record statuses (report)

`DRAFT` · `PUBLISHED` · `REJECTED` (not approved) · `FAILED` · `SKIPPED_DUPLICATE`

Catalog rows use existing `CatalogPublishStatus.published`.

## Rollback

1. Set `FEATURE_CATALOG_LAYER=false` / `FEATURE_CATALOG_ADMIN=false`
2. Published rows remain in DB (data rollback is operational: archive variants / restore backup)
3. No new tables beyond existing catalog schema + ActivityLog writes

## Tests

```bash
npm run test:catalog-import-publish
```
