# Phase 5A — Admin Catalog Import API

Admin-only REST endpoints exposing the existing `runCatalogImportJob()` pipeline. **Dry-run only** — no database publish, no UI.

## Enable

Set in backend environment:

```env
FEATURE_CATALOG_ADMIN=true
```

Requires platform admin JWT (`admin` or `super_admin`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/catalog/import/start` | Start import job |
| `GET` | `/api/admin/catalog/import/:jobId` | Job status, progress, timings, errors |
| `GET` | `/api/admin/catalog/import/:jobId/report` | Full execution report |

OpenAPI (Swagger): [`openapi/catalog-import-admin.yaml`](./openapi/catalog-import-admin.yaml)

## Start job

```http
POST /api/admin/catalog/import/start
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "source": "gaadi_bazaar",
  "city": "Delhi",
  "search": "maruti",
  "pages": 5
}
```

Response (`202`):

```json
{
  "jobId": "catalog-import-550e8400-e29b-41d4-a716-446655440000",
  "status": "started"
}
```

## Job status

```http
GET /api/admin/catalog/import/{jobId}
Authorization: Bearer <admin-token>
```

Response (`200`):

```json
{
  "jobId": "catalog-import-...",
  "status": "completed",
  "currentStage": "preview",
  "progress": {
    "recordsProcessed": 2,
    "stagesCompleted": 10,
    "stagesTotal": 10,
    "percentComplete": 100
  },
  "timings": [],
  "errors": [],
  "startedAt": "2026-08-05T09:30:00.000Z",
  "finishedAt": "2026-08-05T09:30:01.200Z",
  "dryRun": true
}
```

## Full report

```http
GET /api/admin/catalog/import/{jobId}/report
Authorization: Bearer <admin-token>
```

Returns `409` while the job is still running. When complete, returns the Phase 4F execution report plus Phase 5C/5D read-only `preview` (`summary` + per-record rows + approval overlay).

### Approve / reject (Phase 5D)

```http
POST /api/admin/catalog/import/{jobId}/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "recordIds": ["catalog-import-…-row-1"], "override": false }
```

```http
POST /api/admin/catalog/import/{jobId}/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "recordIds": ["catalog-import-…-row-2"], "reason": "Wrong variant" }
```

Audit: `GET /api/admin/catalog/import/{jobId}/approval-audit`

Preview UI: `/dashboard/super-admin/catalog/import/:jobId/preview` · Docs: `docs/catalog-import-approval.md`

## Architecture

```
Admin Route → catalogImportAdminService (in-memory jobs)
           → runCatalogImportJob() (Phase 4F, unchanged)
           → Scraper + Import Pipeline (dry-run)
```

## Files

| File | Role |
|------|------|
| `src/app/api/admin/catalog/import/start/route.ts` | POST start |
| `src/app/api/admin/catalog/import/[jobId]/route.ts` | GET status |
| `src/app/api/admin/catalog/import/[jobId]/report/route.ts` | GET report |
| `src/services/catalog-import-admin.service.ts` | Job store + async runner |
| `src/lib/catalog/import/catalog-import-admin.validation.ts` | Zod validation |
| `src/lib/catalog/guard.ts` | `FEATURE_CATALOG_ADMIN` gate |

## Tests

```bash
npm run test:catalog-import-admin
```
