# Phase F — Database Changes (review before `db push`)

> **Superseded pricing section:** use [PHASE-F-SCHEMA-DIFF.md](./PHASE-F-SCHEMA-DIFF.md) as the approval gate.  
> **Status:** ⏸ WAITING FOR APPROVAL — no `db push`.

**Rules:** Additive only. **No duplicate price columns.** Canonical pricing: `start_price` + `current_bid` (Prisma `startPrice`, `currentBid`).

---

## Pricing — mapping only (NOT new columns)

| Layer | Field | Rule |
|-------|-------|------|
| **DB / Prisma** | `start_price`, `current_bid` | Single source of truth |
| **NOT added** | `starting_bid` | Legacy alias in API/frontend only |
| **Backend helper** | `mapAuctionApiRow()` | Emits `starting_bid: start_price` for compat |
| **Frontend** | `mapDbAuction()` | `startingBid: a.starting_bid ?? a.start_price` |
| **Bid math** | min next bid | `(currentBid ?? startPrice) + bidIncrement` |

---

## `auctions` — additive columns (non-price)

| Column | Type | Default |
|--------|------|---------|
| `organizer_id` | UUID NULL | NULL |
| `reserve_price` | DECIMAL(12,2) NULL | NULL |
| `bid_increment` | DECIMAL(12,2) | 1000 |
| `auction_category` | VARCHAR(32) | `dealer` |
| `location` | VARCHAR(128) NULL | NULL |
| `is_featured` | BOOLEAN | false |

**Single category column** — no `auction_type` duplicate. API alias `auction_type` derived from `auction_category` (`bank` → `bank_repo` for frontend).

**Already in Prisma (unchanged):** `start_price`, `current_bid`, `bid_count`, `slug`, `viewer_count`, `images`, `metadata`.

---

## New tables

See full Prisma diff in [PHASE-F-SCHEMA-DIFF.md](./PHASE-F-SCHEMA-DIFF.md):

- `auction_auto_bids`
- `auction_proxy_bids`
- `auction_watchlists`
- `auction_bid_attempts`
- `auction_bidder_eligibility`

Optional later: `auction_organizers`.

---

## Feature flags

All Phase F behavior off by default. See schema diff doc for flag list.

---

## Apply (after approval)

```powershell
cd backend
npx prisma validate
npx prisma db push
npx prisma generate
```
