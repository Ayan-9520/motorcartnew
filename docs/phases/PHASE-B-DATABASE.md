# Phase B — Database Changes (review before `db push`)

**Rules:** Additive only. No drops. Existing rows get safe defaults.

## 1. `vehicles` — Used vehicle sale mode

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `sale_mode` | `VARCHAR(32)` NULL → default `dealer_offer` | `dealer_offer` | Listing type |

**Allowed values (app-enforced):**

- `direct_owner` — Direct Owner Sale  
- `broker_assisted` — Broker Assisted Sale  
- `dealer_offer` — Dealer Offer (legacy default)  
- `auction_sale` — Auction Sale  

**Prisma:** optional enum `VehicleSaleMode` mapped to `sale_mode`.

**Backward compatibility:** All existing vehicles → `dealer_offer`. Mock catalog uses `metadata.saleMode` fallback in app.

---

## 2. `new_car_inventory` — Showroom stock fields

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `waiting_period_days` | `INT` NULL | NULL | Waiting period (days) |
| `brochure_url` | `VARCHAR(512)` NULL | NULL | Brochure PDF/image URL |
| `offers` | `JSON` | `[]` | Dealer offers `[{ title, amount, validUntil }]` |
| `last_stock_update_at` | `DATETIME` NULL | NULL | Last stock sync |
| `view360_url` | `VARCHAR(512)` NULL | NULL | 360° viewer URL (optional) |

**Note:** `expected_delivery_days` remains; `waiting_period_days` is explicit for UI.

---

## 3. `new_car_stock_daily_logs` — Daily stock upload audit (new table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `dealer_id` | UUID FK → dealers | |
| `inventory_id` | UUID NULL FK → new_car_inventory | Row updated |
| `uploaded_by` | UUID FK → users | |
| `file_name` | VARCHAR(255) NULL | CSV/Excel name |
| `stock_before` | INT | |
| `stock_after` | INT | |
| `notes` | TEXT NULL | |
| `created_at` | DATETIME | |

**Index:** `(dealer_id, created_at)`.

---

## 4. `part_compatibility_rules` — Parts compatibility architecture (new table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `part_id` | UUID NULL | FK → `parts.id` when set |
| `part_product_id` | UUID NULL | FK → `part_products.id` when set |
| `brand` | VARCHAR(64) | Vehicle brand |
| `model` | VARCHAR(64) | Vehicle model |
| `variant` | VARCHAR(64) NULL | |
| `year_from` | INT NULL | |
| `year_to` | INT NULL | |
| `fuel_type` | VARCHAR(32) NULL | |
| `metadata` | JSON | VIN patterns, notes |
| `created_at` | DATETIME | |

**Index:** `(brand, model)`, `(part_id)`, `(part_product_id)`.

**Feature flag:** `FEATURE_PARTS_COMPATIBILITY=true` enables API search.

---

## 5. `part_registration_lookups` — Reg-no cache (architecture, new table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | |
| `registration_number` | VARCHAR(20) UNIQUE | Normalized reg no |
| `brand` | VARCHAR(64) NULL | |
| `model` | VARCHAR(64) NULL | |
| `year` | INT NULL | |
| `fuel_type` | VARCHAR(32) NULL | |
| `metadata` | JSON | Raw provider response |
| `created_at` | DATETIME | |

**No external VIN API in Phase B** — manual seed + future integration.

---

## 6. Unchanged tables (already exist)

| Table | Phase B usage |
|-------|----------------|
| `wishlists` | Full persistence via `/api/wishlist` |
| `vehicles` + `dealers` | Unified slug API (no schema change beyond `sale_mode`) |

---

## Apply commands (operator)

```powershell
cd backend
npx prisma validate
npx prisma db push
npx prisma generate
```

**Status:** Schema validated and `db push` applied to local MySQL (`motorcart`). If `prisma generate` fails with `EPERM`, stop the backend dev server and re-run `npx prisma generate`.

**Rollback:** Restore DB backup; revert `schema.prisma`; `db push` (may require manual column drops in dev only — avoid on production without migration plan).

---

## Feature flags (env, no DB)

| Flag | Default | Module |
|------|---------|--------|
| `FEATURE_VEHICLE_SALE_MODE` | `true` | Sale mode filter/badge |
| `FEATURE_NEW_CAR_INVENTORY_V2` | `true` | Waiting, offers, brochure, daily log |
| `FEATURE_WISHLIST_DB` | `true` | REST wishlist |
| `FEATURE_UNIFIED_VEHICLE_API` | `true` | GET `/api/vehicles/slug/:slug` |
| `FEATURE_PARTS_COMPATIBILITY` | `true` | Compatibility search API |

Frontend: `VITE_FEATURE_*` mirrors backend where needed.
