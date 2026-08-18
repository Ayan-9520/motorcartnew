# Phase 5C — Import Preview & Review

Read-only admin preview of dry-run import jobs. Reuses `GET /api/admin/catalog/import/:jobId/report` (additive `preview` payload). No database writes, publish, or approval actions.

## UI

**Route:** `/dashboard/super-admin/catalog/import/:jobId/preview`

Opened from **Catalog → Import** job progress via **Open preview** when a job finishes.

### Summary cards

- Total Records
- Valid
- Duplicate
- Need Review
- Rejected

### Tabs

1. Valid
2. Duplicate
3. Need Review
4. Rejected

### Per record

Image, Brand, Model, Variant, Fuel, Transmission, Price, City, Match Confidence, Duplicate Reason, Validation Errors

### Filters

Brand, City, Status, Confidence + search + bulk selection (UI only — no mutations).

## API

Existing report endpoint now returns:

```json
{
  "report": { "...": "Phase 4F/5A execution report" },
  "preview": {
    "dryRun": true,
    "published": false,
    "jobId": "...",
    "summary": { "totalRecords": 0, "valid": 0, "duplicate": 0, "needReview": 0, "rejected": 0 },
    "records": []
  },
  "dryRun": true
}
```

Preview is projected in `catalog-import-preview.mapper.ts` from the stored job pipeline context. **Import pipeline is unchanged.**

## Files

| File | Role |
|------|------|
| `backend/.../catalog-import-preview.mapper.ts` | Read-only classification |
| `backend/.../[jobId]/report/route.ts` | Additive `preview` on report response |
| `frontend/.../CatalogImportPreviewPage.tsx` | Preview UI |
| `frontend/.../catalog-import.ts` | Preview DTOs |

## Tests

```bash
cd backend && npm run test:catalog-import-preview
```
