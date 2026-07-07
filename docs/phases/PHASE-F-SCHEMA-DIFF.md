# Phase F — Final Schema Diff (approval required before `db push`)

**Review date:** 2026-06-03  
**Status:** ✅ F0 schema + **`db push` applied** — see [PHASE-F-F0-APPLIED-RESULTS.md](./PHASE-F-F0-APPLIED-RESULTS.md)

Awaiting review before F1–F8.

---

## Review feedback applied

| # | Requirement | How addressed |
|---|-------------|---------------|
| 1 | Do not duplicate auction pricing logic | **No** `starting_bid` column. Canonical: `start_price` / `current_bid` only. |
| 2 | Check current Auction Prisma model | Reviewed — `startPrice`, `currentBid` already exist. |
| 3 | Use mapping if prices exist | **Alias layer** maps `starting_bid` ↔ `start_price` in API/frontend only. |
| 4 | New features behind flags | All Phase F behavior gated (`FEATURE_AUCTION_*`). |
| 5 | Existing auction flow default | Flags default **off**; RPC + mock unchanged. |
| 6 | Existing APIs unchanged | `GET /api/auctions`, `place_auction_bid` RPC signatures preserved. |

---

## Current `Auction` model (Prisma — source of truth)

```443:466:backend/prisma/schema.prisma
model Auction {
  id          String        @id @default(uuid())
  vehicleId   String?       @map("vehicle_id")
  title       String
  slug        String        @unique
  startPrice  Decimal       @map("start_price") @db.Decimal(12, 2)
  currentBid  Decimal?      @map("current_bid") @db.Decimal(12, 2)
  bidCount    Int           @default(0) @map("bid_count")
  status      AuctionStatus @default(upcoming)
  startsAt    DateTime      @map("starts_at")
  endsAt      DateTime      @map("ends_at")
  winnerId    String?       @map("winner_id")
  viewerCount Int           @default(0) @map("viewer_count")
  images      Json          @default("[]")
  metadata    Json          @default("{}")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  bids        AuctionBid[]
  messages    AuctionMessage[]

  @@index([status])
  @@map("auctions")
}
```

**Pricing fields that already exist — DO NOT duplicate:**

| Prisma field | DB column | Purpose |
|--------------|-----------|---------|
| `startPrice` | `start_price` | Opening / starting bid (single source) |
| `currentBid` | `current_bid` | High bid |
| `bidCount` | `bid_count` | Bid tally |

**Legacy Postgres SQL** (`00001`) used `starting_bid` — MySQL via Prisma uses `start_price`. No second column will be added.

---

## Field mapping strategy (no parallel price columns)

### Canonical (read/write in all new services)

```typescript
// backend — single source for bid math
const opening = auction.startPrice;
const highBid = auction.currentBid ?? auction.startPrice;
const minNext = highBid + auction.bidIncrement;
```

### API / snake JSON (backward compatible aliases only)

```typescript
// backend/src/lib/db/auction-map.ts (NEW helper — not duplicate storage)
export function mapAuctionApiRow(row: Record<string, unknown>): Record<string, unknown> {
  const start = row.start_price ?? row.startPrice;
  return {
    ...row,
    start_price: start,
    starting_bid: start,           // alias for legacy clients / DbAuction
    current_bid: row.current_bid ?? row.currentBid,
    auction_type: mapCategoryAlias(row.auction_category ?? row.auction_type),
  };
}

function mapCategoryAlias(cat: unknown): string {
  const c = String(cat ?? "dealer");
  return c === "bank" ? "bank_repo" : c; // frontend AuctionType compat
}
```

### Frontend mapper (dual-read, single concept)

```typescript
// auction-utils.ts — one-line change at approval
startingBid: Number(a.starting_bid ?? a.start_price),
currentBid: a.current_bid != null ? Number(a.current_bid) : null,
```

### Bid RPC (unchanged logic path)

`placeAuctionBid` in `rpc-handlers.ts` continues to update **`currentBid`** and **`bidCount`** only. Phase F proxy/auto engines call the same update — no new price columns.

---

## Final Prisma schema diff

### A. `Auction` — additive columns only (NO price duplicates)

```diff
 model Auction {
   id          String        @id @default(uuid())
   vehicleId   String?       @map("vehicle_id")
+  organizerId String?       @map("organizer_id")
   title       String
   slug        String        @unique
   startPrice  Decimal       @map("start_price") @db.Decimal(12, 2)
   currentBid  Decimal?      @map("current_bid") @db.Decimal(12, 2)
+  reservePrice Decimal?      @map("reserve_price") @db.Decimal(12, 2)
+  bidIncrement Decimal       @default(1000) @map("bid_increment") @db.Decimal(12, 2)
   bidCount    Int           @default(0) @map("bid_count")
+  auctionCategory String    @default("dealer") @map("auction_category") @db.VarChar(32)
   status      AuctionStatus @default(upcoming)
   startsAt    DateTime      @map("starts_at")
   endsAt      DateTime      @map("ends_at")
   winnerId    String?       @map("winner_id")
   viewerCount Int           @default(0) @map("viewer_count")
+  location    String?       @db.VarChar(128)
+  isFeatured  Boolean       @default(false) @map("is_featured")
   images      Json          @default("[]")
   metadata    Json          @default("{}")

   bids        AuctionBid[]
   messages    AuctionMessage[]
+  autoBids    AuctionAutoBid[]
+  proxyBids   AuctionProxyBid[]
+  watchlists  AuctionWatchlist[]

   @@index([status])
+  @@index([auctionCategory, status])
+  @@index([organizerId])
   @@map("auctions")
 }
```

**Explicitly NOT added:** `starting_bid`, `auction_type` (use `auction_category` + API alias), duplicate `start_price` variants.

**Category values (app-enforced):** `bank | insurance | fleet | dealer | government`

---

### B. `AuctionBid` — optional source tag (not a price field)

```diff
 model AuctionBid {
   ...
   isAutoBid  Boolean  @default(false) @map("is_auto_bid")
+  bidSource  String?  @map("bid_source") @db.VarChar(16)  // manual | auto | proxy
   ...
 }
```

`isAutoBid` retained for existing UI (`BidHistoryFeed`).

---

### C. New models (Phase F features — idle until flags on)

```prisma
model AuctionAutoBid {
  id        String   @id @default(uuid())
  auctionId String   @map("auction_id")
  bidderId  String   @map("bidder_id")
  maxAmount Decimal  @map("max_amount") @db.Decimal(12, 2)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  auction   Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)

  @@unique([auctionId, bidderId])
  @@map("auction_auto_bids")
}

model AuctionProxyBid {
  id        String   @id @default(uuid())
  auctionId String   @map("auction_id")
  bidderId  String   @map("bidder_id")
  maxAmount Decimal  @map("max_amount") @db.Decimal(12, 2)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  auction   Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)

  @@unique([auctionId, bidderId])
  @@map("auction_proxy_bids")
}

model AuctionWatchlist {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  auctionId String   @map("auction_id")
  createdAt DateTime @default(now()) @map("created_at")

  auction   Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)

  @@unique([userId, auctionId])
  @@map("auction_watchlists")
}

model AuctionBidAttempt {
  id               String   @id @default(uuid())
  auctionId        String   @map("auction_id")
  bidderId         String   @map("bidder_id")
  amount           Decimal  @db.Decimal(12, 2)
  success          Boolean  @default(false)
  rejectionReason  String?  @map("rejection_reason")
  riskScore        Int      @default(0) @map("risk_score")
  createdAt        DateTime @default(now()) @map("created_at")

  @@index([auctionId, bidderId, createdAt])
  @@map("auction_bid_attempts")
}

model AuctionBidderEligibility {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  auctionId  String?  @map("auction_id")
  kycStatus  String   @map("kyc_status")
  eligible   Boolean
  reason     String?  @db.VarChar(255)
  checkedAt  DateTime @default(now()) @map("checked_at")

  @@index([userId, checkedAt])
  @@map("auction_bidder_eligibility")
}
```

Optional F7 (can defer): `AuctionOrganizer` — not in F0 diff.

---

## MySQL column summary (net new on `auctions`)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `organizer_id` | CHAR(36) NULL | NULL | |
| `reserve_price` | DECIMAL(12,2) NULL | NULL | Not a duplicate of start/current |
| `bid_increment` | DECIMAL(12,2) | 1000 | Required for min-bid math |
| `auction_category` | VARCHAR(32) | `dealer` | Single category column |
| `location` | VARCHAR(128) NULL | NULL | |
| `is_featured` | BOOLEAN | false | |

**Zero new price columns** beyond existing `start_price` / `current_bid`.

---

## Existing APIs — compatibility guarantee

| API / path | Change at F0 |
|------------|--------------|
| `GET /api/auctions` | **None** — same handler; response may include extra nullable fields (additive JSON keys only) |
| `POST /api/db/rpc/place_auction_bid` | **None** — still updates `currentBid` |
| `POST /api/db/rpc/finalize_auction` | **None** |
| Supabase `auctions` / `bids` queries | **None** — frontend mock fallback unchanged |
| New routes `/api/auctions/*` | Only registered when flags on; absent = 404 |

---

## Feature flags (defaults preserve current behavior)

| Flag | Default | When off |
|------|---------|----------|
| `FEATURE_AUCTION_V2` | `false` | No new REST bid/watchlist endpoints |
| `FEATURE_AUCTION_CATEGORIES` | `false` | Category filter ignored; all auctions shown |
| `FEATURE_AUCTION_PROXY_BID` | `false` | Proxy table unused |
| `FEATURE_AUCTION_AUTO_BID` | `false` | Auto table unused; `set_auction_auto_bid` stub remains |
| `FEATURE_AUCTION_WATCHLIST` | `false` | No watchlist API |
| `FEATURE_AUCTION_BID_HISTORY` | `false` | Room uses existing `fetchAuctionBids` |
| `FEATURE_AUCTION_KYC_GATE` | `false` | No bid block |

Frontend mirrors: `VITE_FEATURE_AUCTION_*` same defaults.

---

## Affected files list (implementation after approval)

### Schema & config (F0)

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Diff above |
| `backend/src/lib/db/table-map.ts` | Add delegates: `auction_auto_bids`, `auction_proxy_bids`, `auction_watchlists`, `auction_bid_attempts`, `auction_bidder_eligibility` |
| `backend/src/config/feature-flags.ts` | Auction flag group |
| `backend/.env.example` | Document flags |

### Mapping layer (F0 — no pricing duplication)

| File | Change |
|------|--------|
| `backend/src/lib/db/auction-map.ts` | **NEW** — `mapAuctionApiRow()` aliases only |
| `backend/src/app/api/auctions/route.ts` | **Optional** post-process rows with alias helper (additive keys); query logic unchanged |

### Services & routes (F1–F8, after F0 approved)

| File | Change |
|------|--------|
| `backend/src/services/auction-enhancement.service.ts` | **NEW** — uses `startPrice`/`currentBid` only |
| `backend/src/lib/db/rpc-handlers.ts` | Extend auto/proxy resolve behind flags; **no** new price fields |
| `backend/src/app/api/auctions/[id]/bids/route.ts` | **NEW** |
| `backend/src/app/api/auctions/[id]/proxy-bid/route.ts` | **NEW** |
| `backend/src/app/api/auctions/[id]/auto-bid/route.ts` | **NEW** |
| `backend/src/app/api/auctions/watchlist/route.ts` | **NEW** |
| `backend/src/app/api/auctions/bid-eligibility/route.ts` | **NEW** |

### Frontend (mapping only at F0; wiring F8)

| File | Change |
|------|--------|
| `frontend/src/features/auctions/lib/auction-utils.ts` | Dual-read `start_price` / `starting_bid` |
| `frontend/src/types/database.ts` | Optional: document `start_price` on `DbAuction` |
| `frontend/src/config/feature-flags.ts` | Auction flags |
| `frontend/src/features/auctions/services/auction.service.ts` | REST fallbacks when flags on (later phase) |
| `frontend/src/features/auctions/types.ts` | Extend `AuctionType` with `insurance`, `fleet`; keep `bank_repo` alias |

### Explicitly NOT modified (dealer / core flow)

| File | Rule |
|------|------|
| `AuctionRoomPage.tsx` | No layout redesign |
| `BidPanel.tsx` / `BidHistoryFeed.tsx` | No redesign; same props |
| `useAuctionRoom.ts` | KYC check only behind flag (later) |
| `MOCK_AUCTIONS` | Unchanged unless optional seed |
| `router/index.tsx` | No path changes |

---

## Apply commands (after approval only)

```powershell
cd backend
npx prisma validate
npx prisma db push
npx prisma generate
```

---

## Rollback

1. Set all `FEATURE_AUCTION_*` to `false`.
2. Redeploy previous backend.
3. DB: new columns nullable / new tables empty — safe idle, or restore dev backup.

---

## Approval

Reply **Approve F0 schema** to apply the diff above, or request changes.

**Do not push until approved.**
