# Phase 5G — Controlled Real Import + Media + Catalog Matching

Builds on Phase 5F live scraper. **No parallel scraper. No auto-publish.**

## Limits

| Setting | Value |
|---------|-------|
| City | Delhi |
| Search | Maruti Suzuki |
| Pages | 1 |
| Max records | 100 |

## Pipeline

Live Scraper → Adapter → Validation → Normalization → Duplicate Detection → **Catalog Matching (DB)** → **Media (fetch)** → **R2/S3 storage (gated)** → Preview → **Admin Approval** → Publish (manual only)

## Run

```powershell
cd backend
$env:DATABASE_URL='postgresql://motorcart:strongpassword@localhost:5432/motorcart?schema=public'
$env:NODE_OPTIONS='--max-http-header-size=131072'
# Optional production storage (required for storageUploaded > 0 / publish readiness):
# $env:STORAGE_PROVIDER='cloudflare_r2'
# $env:STORAGE_BUCKET='motorcart-catalog'
# $env:STORAGE_ACCESS_KEY_ID='...'
# $env:STORAGE_SECRET_ACCESS_KEY='...'
npm run catalog:gaadi-bazaar:controlled-import
```

## Storage gate

Uses `resolveCatalogPublishStorage()` (same fail-closed path as Phase 5E publish).

- Missing provider/bucket/credentials → **no local fallback**, uploads blocked, exit code `2`
- Publish is **never** called by this script

## Admin approval

Completed job is attached via `catalogImportAdminService.attachCompletedJob()` for existing Phase 5C/5D preview/approve APIs (in-memory, same process).

## Reports

`backend/reports/catalog-import-controlled/` — CSV + JSON + HTML
