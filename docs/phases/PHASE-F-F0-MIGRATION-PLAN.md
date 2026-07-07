# Phase F0 — Applied (schema only) · Migration plan

**Status:** Schema committed in repo · **`db push` NOT run** · awaiting **Approve db push**

---

## What was applied (F0)

| Item | Done |
|------|------|
| Prisma `Auction` additive columns | ✅ |
| New auction satellite models | ✅ |
| `AuctionBid.bidSource` optional column | ✅ |
| `table-map.ts` delegates | ✅ |
| Feature flags (default **off**) | ✅ |
| Bidding logic / UI / existing APIs | ❌ Not touched |
| `prisma db push` | ❌ Not run |

---

## Final Prisma schema diff (applied)

### Enum added

```prisma
enum AuctionCategory {
  bank
  insurance
  fleet
  dealer
  government
}
```

### `Auction` — fields added (no duplicate pricing)

| Field | Column | Notes |
|-------|--------|-------|
| `organizerId` | `organizer_id` | nullable |
| `reservePrice` | `reserve_price` | nullable |
| `bidIncrement` | `bid_increment` | default `1000` |
| `auctionCategory` | `auction_category` | enum, default `dealer` |
| `location` | `location` | nullable |
| `isFeatured` | `is_featured` | default `false` |

**Unchanged pricing:** `startPrice` → `start_price`, `currentBid` → `current_bid`, `bidCount` → `bid_count`

**Indexes added:** `(auction_category, status)`, `(organizer_id)`

### `AuctionBid`

| Field | Column |
|-------|--------|
| `bidSource` | `bid_source` VARCHAR(16) nullable |

### New models

| Model | Table |
|-------|-------|
| `AuctionAutoBid` | `auction_auto_bids` |
| `AuctionProxyBid` | `auction_proxy_bids` |
| `AuctionWatchlist` | `auction_watchlists` |
| `AuctionBidAttempt` | `auction_bid_attempts` |
| `AuctionBidderEligibility` | `auction_bidder_eligibility` |

---

## Pricing mapping (for F1+ — not implemented in F0)

| Canonical (DB) | Legacy alias (API/UI only) |
|------------------|----------------------------|
| `start_price` | `starting_bid` |
| `current_bid` | `current_bid` |

No `starting_bid` column will be created.

---

## Affected files (this commit)

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | F0 diff applied |
| `backend/src/lib/db/table-map.ts` | 5 new table delegates |
| `backend/src/config/feature-flags.ts` | 7 auction flags, default `false` |
| `backend/.env.example` | Commented Phase F flags |
| `frontend/src/config/feature-flags.ts` | 7 VITE flags, default `false` |
| `PHASE-F-F0-MIGRATION-PLAN.md` | This document |

### Not modified (per rules)

- `backend/src/app/api/auctions/route.ts`
- `backend/src/lib/db/rpc-handlers.ts`
- `frontend/src/features/auctions/**` (UI)
- `frontend/src/router/index.tsx`

---

## Migration plan (operator — after you approve db push)

### Pre-flight

1. Backup MySQL database `motorcart`.
2. Confirm no pending unrelated schema edits.
3. Stop backend dev server (avoids `prisma generate` EPERM on Windows).

### Step 1 — Validate

```powershell
cd backend
npx prisma validate
```

Expected: `The schema at prisma\schema.prisma is valid`

### Step 2 — Review SQL (optional dry-run)

```powershell
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

Or inspect what `db push` would apply:

```powershell
npx prisma db push --dry-run
```

*(If `--dry-run` unsupported in your Prisma version, use `migrate diff` against live DB.)*

### Step 3 — Apply to MySQL (requires explicit approval)

```powershell
npx prisma db push
npx prisma generate
```

### Expected DDL summary

**Alter `auctions`:** add nullable/default columns listed above; **no** `starting_bid`.

**Create tables:**

- `auction_auto_bids`
- `auction_proxy_bids`
- `auction_watchlists`
- `auction_bid_attempts`
- `auction_bidder_eligibility`

**Alter `bids`:** add nullable `bid_source`.

### Step 4 — Post-push verification

```powershell
npx prisma validate
```

Manual checks:

- [ ] Existing auction rows still readable (`start_price`, `current_bid` intact)
- [ ] `GET /api/auctions` returns same shape (+ optional new nullable keys)
- [ ] Auction room + mock catalog still load
- [ ] All `FEATURE_AUCTION_*` remain unset or `false`

### Rollback (dev)

1. Restore MySQL backup taken in pre-flight.
2. `git checkout` previous `schema.prisma` if needed.
3. `npx prisma generate`

Production: do not drop columns; disable flags only.

---

## Feature flags (must stay disabled until F1+)

| Backend | Default |
|---------|---------|
| `FEATURE_AUCTION_V2` | `false` |
| `FEATURE_AUCTION_CATEGORIES` | `false` |
| `FEATURE_AUCTION_PROXY_BID` | `false` |
| `FEATURE_AUCTION_AUTO_BID` | `false` |
| `FEATURE_AUCTION_WATCHLIST` | `false` |
| `FEATURE_AUCTION_BID_HISTORY` | `false` |
| `FEATURE_AUCTION_KYC_GATE` | `false` |

Frontend: `VITE_FEATURE_AUCTION_*` — same defaults.

---

## Next approval gate

Reply **Approve db push** to run migration on MySQL, or **Approve F1** to begin bidding/API work after push.

**Do not enable auction feature flags until F1+ is implemented and tested.**
