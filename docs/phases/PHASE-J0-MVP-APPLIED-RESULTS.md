# Phase J0 MVP — Database Apply Results

**Date:** 2026-06-04  
**Operator approval:** J0 MVP db push (Growth CRM schema only)  
**Scope:** Additive — 13 `growth_*` tables + 9 enums. No APIs, UI, feature flags, Razorpay, Meta, or WhatsApp provider.

---

## 1. Summary

| Step | Result |
|------|--------|
| MySQL (XAMPP) | Started (`mysql_start.bat`); connection OK |
| Pre-push backup | **Success** |
| Backend stop (port 3001) | Stopped PID 11816 before `generate` |
| `npx prisma validate` | **Passed** |
| `npx prisma db push` | **Success** — database already in sync with schema (tables present from prior apply; no destructive changes) |
| `npx prisma generate` | **Success** — Prisma Client v6.19.3 |
| 13 `growth_*` tables | **Verified** in `motorcart` |
| Existing domains | **Unchanged** (table counts + row samples) |
| Growth APIs / flags | **None** in codebase |

---

## 2. Backup

| Field | Value |
|-------|--------|
| **Path** | `E:\Projects\motorcartcursor\backend\backups\motorcart-pre-j0-mvp-push-20260604-144609.sql` |
| **Size** | **203,175 bytes** (~198.4 KB) |
| **Command** | `E:\xampp\mysql\bin\mysqldump.exe -u root motorcart` |
| **Database** | `motorcart` (note: not `motocart`) |

---

## 3. Prisma validate

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
The schema at prisma\schema.prisma is valid 🚀
```

Exit code: **0**

---

## 4. Prisma db push output

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": MySQL database "motorcart" at "localhost:3306"

The database is already in sync with the Prisma schema.

Running generate... - Prisma Client
✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 1.40s
```

Exit code: **0**  
Full log: `backend/backups/j0-mvp-db-push-output.txt`

**Note:** No new `CREATE TABLE` statements ran in this session because the 13 Growth tables were already applied to `motorcart`. Schema and DB are aligned; this run confirmed sync and regenerated the client.

---

## 5. Prisma generate output

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 956ms
```

Exit code: **0**  
Full log: `backend/backups/j0-mvp-generate-output.txt`

---

## 6. Tables created (13 MVP `growth_*` only)

Verified via `information_schema` on `motorcart`:

| # | Table |
|---|--------|
| 1 | `growth_workspaces` |
| 2 | `growth_workspace_entitlements` |
| 3 | `growth_assets` |
| 4 | `growth_designs` |
| 5 | `growth_design_exports` |
| 6 | `growth_whatsapp_templates` |
| 7 | `growth_contact_lists` |
| 8 | `growth_contact_list_members` |
| 9 | `growth_whatsapp_broadcasts` |
| 10 | `growth_whatsapp_broadcast_recipients` |
| 11 | `growth_message_logs` |
| 12 | `growth_lead_capture_forms` |
| 13 | `growth_lead_capture_events` |

**Prisma models:** `GrowthWorkspace`, `GrowthWorkspaceEntitlement`, `GrowthAsset`, `GrowthDesign`, `GrowthDesignExport`, `GrowthWhatsappTemplate`, `GrowthContactList`, `GrowthContactListMember`, `GrowthWhatsappBroadcast`, `GrowthWhatsappBroadcastRecipient`, `GrowthMessageLog`, `GrowthLeadCaptureForm`, `GrowthLeadCaptureEvent`  
**User relation (additive):** `growthWorkspacesOwned` on `User`

**Not present (deferred per MVP):** `growth_workspace_members`, `growth_brand_kits`, `growth_social_posts`, `growth_provider_connections`, etc.

---

## 7. Existing domains — unaffected

### 7.1 Table inventory (unchanged prefixes)

| Domain | Matching tables (count) |
|--------|-------------------------|
| Dealer CRM | 7 (`dealer_*`, `dealers`) |
| Broker CRM | 13 (`broker_*`, `brokers`) |
| Community | 9 (`community_*`, `social_*`) |
| Auction | 8 (`auction_*`) |
| Finance | 5 (`finance_*`, `loan_*`) |
| Insurance | 4 (`insurance_*`) |
| Marketplace vehicles | `vehicles` present |

No `ALTER` or `DROP` reported on non-Growth tables during `db push`.

### 7.2 Sample row counts (post-apply)

| Table | Rows |
|-------|------|
| `dealers` | 16 |
| `brokers` | 0 |
| `social_posts` | 0 |
| `auctions` | 1 |
| `finance_applications` | 0 |
| `vehicles` | 4 |

### 7.3 Isolation checks

- **No** `/api/growth/**` routes under `backend/src/app/api`
- **No** `FEATURE_GROWTH_*` in `backend/src/config/feature-flags.ts`
- **No** FK from `growth_*` to `dealers`, `brokers`, `community_*`, `broker_whatsapp_*`, or `vehicles`
- **`broker_whatsapp_*`** tables remain separate from `growth_whatsapp_*`

---

## 8. Smoke tests (backend `http://localhost:3001`)

Backend restarted after apply (`npm run dev` in `backend/`).

| Route | HTTP | Interpretation |
|-------|------|----------------|
| `GET /api/health` | **200** | API healthy |
| `GET /api/vehicles?limit=1` | **200** | Marketplace / vehicles OK |
| `GET /api/auctions` | **200** | Auctions OK |
| `POST /api/db/query` (`dealers`, limit 1) | **200** | Dealer CRM data path OK |
| `GET /api/new-car/inventory?dealer_id=test` | **200** | Dealer inventory route OK (validation path) |
| `GET /api/community/feed` | **404** | Expected — `FEATURE_COMMUNITY_*` default **off** |
| `GET /api/community/posts` | **405** | Route exists; GET not allowed (POST-only) |
| `GET /api/broker/profile` | **404** | Expected — `FEATURE_BROKER_CRM` default **off** |
| `GET /api/broker/leads` | **404** | Expected — `FEATURE_BROKER_LEADS` default **off** |

No Growth endpoints tested (none shipped).

---

## 9. Warnings

| Warning | Severity | Notes |
|---------|----------|--------|
| `db push`: already in sync | Info | Tables were already on DB; this run validated alignment only |
| PowerShell stderr on `npx` | Low | Node writes env messages to stderr; exit codes 0 |
| Community/Broker smoke **404** | Info | Feature flags off by design — not a regression |
| `mysqldump` to wrong DB name `motocart` | N/A | Avoided; correct DB is **`motorcart`** |
| EPERM on Windows `generate` | Mitigated | Backend stopped on port 3001 before generate |

---

## 10. Rollback instructions

### 10.1 Pre-push backup restore (full DB)

```powershell
# Stop backend on port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { if ($_ -gt 0) { Stop-Process -Id $_ -Force } }

# Restore (correct database name: motorcart)
& "E:\xampp\mysql\bin\mysql.exe" -u root motorcart < "E:\Projects\motorcartcursor\backend\backups\motorcart-pre-j0-mvp-push-20260604-144609.sql"
```

### 10.2 Drop Growth tables only (no data to preserve)

Drop in child-first order:

```sql
DROP TABLE IF EXISTS growth_lead_capture_events;
DROP TABLE IF EXISTS growth_lead_capture_forms;
DROP TABLE IF EXISTS growth_message_logs;
DROP TABLE IF EXISTS growth_whatsapp_broadcast_recipients;
DROP TABLE IF EXISTS growth_whatsapp_broadcasts;
DROP TABLE IF EXISTS growth_contact_list_members;
DROP TABLE IF EXISTS growth_contact_lists;
DROP TABLE IF EXISTS growth_whatsapp_templates;
DROP TABLE IF EXISTS growth_design_exports;
DROP TABLE IF EXISTS growth_designs;
DROP TABLE IF EXISTS growth_assets;
DROP TABLE IF EXISTS growth_workspace_entitlements;
DROP TABLE IF EXISTS growth_workspaces;
```

Then revert Growth block in `backend/prisma/schema.prisma` and run `npx prisma db push` (or restore backup).

### 10.3 Git revert (schema only, no DB)

```powershell
git checkout -- backend/prisma/schema.prisma
cd backend
npx prisma db push
npx prisma generate
```

---

## 11. Out of scope (confirmed not done)

- Growth REST APIs (`/api/growth/**`)
- Frontend Growth CRM UI
- `FEATURE_GROWTH_*` flags
- Razorpay, Meta API, WhatsApp provider wiring
- Remaining 13 tables from full 26-table Growth design (J1+)

---

## 12. Approval gates

| Gate | Status |
|------|--------|
| J0 MVP schema in Prisma | Done |
| **J0 MVP db push** | **Done** (this document) |
| J1 implementation (APIs + flags + UI) | **Waiting** — reply **Approve J1 Growth CRM MVP implementation** |

---

## 13. Operator checklist

- [x] MySQL running
- [x] Backup created (path + size recorded)
- [x] Backend stopped for generate
- [x] `prisma validate` / `db push` / `generate`
- [x] 13 `growth_*` tables verified
- [x] Dealer / Broker / Community / Auction / Finance / Insurance tables intact
- [x] Smoke tests run
- [x] Results documented

**Review:** Awaiting operator sign-off before J1.
