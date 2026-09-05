# Phase 5C — Real stock-by-PIN discovery

**Status:** Implemented (additive)  
**Phase 5A (quotations):** COMPLETE — `cursor/26_Quotations.md`  
**Phase 5B (test drives):** COMPLETE — `cursor/27_Test_Drives.md`  
**Later phases:** Batch 12 search uses dealer `NewCarInventory` / marketplace vehicles only — never master catalog as stock.

## Purpose

Customer enters an Indian 6-digit PIN. MotorCart returns **real available stock** for dealers/branches that serve **that exact PIN**.

This is discovery/filtering only. It is **not** radius search, nearest dealer, delivery promise, capacity, allocation, paid/lead routing, PIN territory ownership, quotation, test drive, booking, or payment.

## Canonical PIN sources

| Object | Field | Role |
|--------|--------|------|
| `Dealer` | `pincode` | Showroom PIN. Nullable — never invented. Indexed in Phase 5C. |
| `OrganizationBranch` | `postalCode` | Branch PIN. India-compatible `country` (`IN` / `IND` / `India`). |

`NewCarInventory` has **no** pincode column. Quotation `pincode` is commercial/customer/RTO context only — **not** inventory location. Catalog city/pricing is **not** stock.

Either dealer PIN **or** branch postal code is enough. Dealer IDs are deduplicated. Branch rows resolve:

`OrganizationBranch` → `Organization` (active, not deleted) → `legacyDealerId` → `Dealer` (not deleted).

If nothing resolves, the API returns `{ pincode, count: 0, items: [] }`.

## API

Public GET. JWT is **not** required.

```
GET /api/inventory/by-pincode?pincode=110001
```

Dedicated route. Do **not** use `GET /api/vehicles?pincode=` or `/api/db/query`.

Query parameter is `pincode` only. Extra params (`dealerId`, `organizationId`, `branchId`) are ignored and **cannot** expand or alter results. Server is the source of truth.

Invalid PIN (`^[1-9][0-9]{5}$` fails) → HTTP 400 `{ "message": "Invalid pincode" }`. Input is not rewritten.

## Response contract

```json
{
  "pincode": "110001",
  "count": 2,
  "items": [
    {
      "source": "new_car_inventory",
      "inventoryId": "...",
      "dealerId": "...",
      "dealerName": "...",
      "city": "...",
      "state": "...",
      "branch": { "id": "...", "name": "...", "pincode": "110001" },
      "availability": "available",
      "stock": 1,
      "catalogVariantId": "..."
    }
  ]
}
```

`source` is `new_car_inventory` or `vehicle`. Only fields that exist are included. Branch is attached only when **exactly one** matching branch exists for that dealer at the PIN. No distance, radius, lat/lng, nearest, or delivery estimate.

Public response omits customer PII, dealer GST/PAN, phones/emails, organization secrets, and internal metadata.

## Stock availability

**NewCarInventory:** `stock > 0` **and** `stockStatus` allow-list starting with `available`. Unknown statuses are excluded.

Never treated as available: `out_of_stock`, `booked`, `transit`, `upcoming`, `delivered`, `reserved`, `sold`, `stock = 0`.

**Marketplace Vehicle:** `status = available`, `deletedAt = null`, `dealerId` in the resolved dealer set. Draft/reserved/sold/deleted are excluded. No dealer → not associated with a PIN.

**Catalog:** never returned as stock. `catalogVariantId` is a reference on a real inventory/vehicle row only.

Duplicate inventory rows are not returned twice when both dealer PIN and branch PIN match.

## Security

- Public GET, same convention as marketplace browse.
- Client cannot choose dealer/org/branch ownership.
- No `/api/db/query` dependency.

## No-radius limitation

Exact PIN string match only. Adjacent PINs (for example `110001` vs `110002`) do not match. Unused branch latitude/longitude are not used.

## No mock policy

Real PostgreSQL rows only. Empty match is `{ count: 0, items: [] }`. The UI says **No available stock found for this PIN.** It does not show “Available near you” or fake dealer counts.

## Relationship to quotation (5A)

PIN stock may expose real `inventoryId` / `vehicleId` that a dealer can later quote. 5C does not create quotations or change quotation totals/lifecycle. Quotation `pincode` remains commercial context, not stock location.

## Relationship to test drive (5B)

PIN stock may expose IDs the existing test-drive flow can consume. 5C does not create test drives or change `TestDriveBooking` lifecycle.

## UI

PIN check on new-car and vehicle listing pages: “Enter PIN to check available stock” / **Check Stock**. Detail links reuse existing `/new-cars/:slug` and `/vehicles/:category/:slug` routes.

## Tests

`npm run test:phase5c` · `npm run test:phase5c-db`
