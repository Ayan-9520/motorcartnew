# Phase 5D — Catalog Import Approval

Admin approval workflow for dry-run import preview records. **No publish. No public website. No catalog DB writes.**

## Statuses

| Status | Meaning |
|--------|---------|
| `PENDING_REVIEW` | Default / awaiting decision |
| `APPROVED` | Admin approved (not live) |
| `REJECTED` | Admin rejected |

## Policy (reuses Phase 2D)

Uses `resolveApprovalState` + `DEFAULT_APPROVAL_CONFIG` from `approval-rules.ts`:

- Auto-eligible (≥ 98 confidence) → may approve
- Manual review / low-confidence / multi-match → **must stay PENDING_REVIEW** (cannot approve)
- Invalid / validation-rejected / confirmed duplicates → cannot approve unless **super_admin + override**
- Reject always allowed with a reason

## APIs

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/admin/catalog/import/:jobId/approve` | Body: `{ recordIds, reason?, override? }` |
| `POST` | `/api/admin/catalog/import/:jobId/reject` | Body: `{ recordIds, reason }` (reason required) |
| `GET` | `/api/admin/catalog/import/:jobId/approval-audit` | Audit trail |
| `GET` | `/api/admin/catalog/import/:jobId/report` | Preview includes approval overlay |

RBAC: `requirePlatformAdmin` + `FEATURE_CATALOG_ADMIN`.

## Storage

- Approval decisions + audit events stored **in-memory** on the import job (same lifetime as Phase 5A jobs).
- **No new Prisma tables / migrations.**
- `published: false` always.

## Rollback

1. Disable UI/API via `FEATURE_CATALOG_ADMIN=false` / `VITE_FEATURE_CATALOG_ADMIN=false`.
2. Restart backend process to clear in-memory decisions (no schema rollback needed).
3. Routes under `approve` / `reject` / `approval-audit` can be left in place; they 404 when feature flag is off.

## Tests

```bash
cd backend && npm run test:catalog-import-approval
```

## UI

Preview page: Approve / Bulk Approve / Reject / Bulk Reject with confirmation dialog.
