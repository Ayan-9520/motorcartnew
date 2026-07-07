# Phase F0 — Pre `db push` review (approval gate)

**Date:** 2026-06-04  
**Status:** ⏸ Awaiting **Approve db push** — do not run `npx prisma db push` yet.

**Baseline:** committed `Auction` / `AuctionBid` / `AuctionMessage` in `backend/prisma/schema.prisma` (HEAD)  
**Target:** working tree F0 schema (enum + 5 new models + additive columns)

> **Note:** Live SQL was not generated against your MySQL instance (DB unreachable at `localhost:3306`). The script below is the **expected** `prisma db push` output for F0. After starting MySQL, run the verify command in §7 for an authoritative diff.

---

## 1. Exact Prisma models — added or modified

### Modified models

| Model | Prisma table | Change type |
|-------|--------------|-------------|
| `Auction` | `auctions` | **Extended** — 6 new scalar fields, 3 new relations, 2 new indexes |
| `AuctionBid` | `bids` | **Extended** — 1 optional field `bidSource` |

### New enum

```prisma
enum AuctionCategory {
  bank
  insurance
  fleet
  dealer
  government
}
```

### Unchanged models (no F0 edits)

`AuctionMessage`, `AuctionNotification`, and all non-auction models.

### New models (5)

| Model | Table |
|-------|-------|
| `AuctionAutoBid` | `auction_auto_bids` |
| `AuctionProxyBid` | `auction_proxy_bids` |
| `AuctionWatchlist` | `auction_watchlists` |
| `AuctionBidAttempt` | `auction_bid_attempts` |
| `AuctionBidderEligibility` | `auction_bidder_eligibility` |

### `Auction` — full target model (F0)

```prisma
model Auction {
  id              String          @id @default(uuid())
  vehicleId       String?         @map("vehicle_id")
  organizerId     String?         @map("organizer_id")          // NEW
  title           String
  slug            String          @unique
  startPrice      Decimal         @map("start_price")           // UNCHANGED
  currentBid      Decimal?        @map("current_bid")           // UNCHANGED
  reservePrice    Decimal?        @map("reserve_price")         // NEW
  bidIncrement    Decimal         @default(1000) @map("bid_increment") // NEW
  bidCount        Int             @default(0) @map("bid_count") // UNCHANGED
  auctionCategory AuctionCategory @default(dealer) @map("auction_category") // NEW
  status          AuctionStatus   @default(upcoming)            // UNCHANGED
  startsAt        DateTime        @map("starts_at")             // UNCHANGED
  endsAt          DateTime        @map("ends_at")               // UNCHANGED
  winnerId        String?         @map("winner_id")             // UNCHANGED
  viewerCount     Int             @default(0) @map("viewer_count") // UNCHANGED
  location        String?         @db.VarChar(128)              // NEW
  isFeatured      Boolean         @default(false) @map("is_featured") // NEW
  images          Json            @default("[]")                // UNCHANGED
  metadata        Json            @default("{}")                // UNCHANGED
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  bids            AuctionBid[]
  messages        AuctionMessage[]
  autoBids        AuctionAutoBid[]      // NEW relation
  proxyBids       AuctionProxyBid[]     // NEW relation
  watchlists      AuctionWatchlist[]    // NEW relation

  @@index([status])                         // UNCHANGED
  @@index([auctionCategory, status])        // NEW
  @@index([organizerId])                    // NEW
  @@map("auctions")
}
```

### `AuctionBid` — F0 delta only

```prisma
  bidSource  String?  @map("bid_source") @db.VarChar(16)  // NEW — manual | auto | proxy
```

All other `AuctionBid` fields unchanged (`amount`, `isAutoBid`, FKs, etc.).

---

## 2. Exact MySQL tables — created or altered

### Altered tables

| Table | Operation |
|-------|-----------|
| `auctions` | `ADD COLUMN` × 6, `CREATE INDEX` × 2 |
| `bids` | `ADD COLUMN` × 1 (`bid_source`) |

### Created tables

| Table | FK to `auctions` |
|-------|------------------|
| `auction_auto_bids` | Yes (`ON DELETE CASCADE`) |
| `auction_proxy_bids` | Yes (`ON DELETE CASCADE`) |
| `auction_watchlists` | Yes (`ON DELETE CASCADE`) |
| `auction_bid_attempts` | **No** (indexed only) |
| `auction_bidder_eligibility` | **No** (indexed only) |

### Not touched

`auction_messages`, `auction_notifications`, and every other existing table.

---

## 3. Confirm: nothing dropped

| Check | Result |
|-------|--------|
| `DROP TABLE` in F0 delta | **None** |
| `DROP COLUMN` in F0 delta | **None** |
| `DROP INDEX` / `DROP CONSTRAINT` in F0 delta | **None** |
| Renamed columns | **None** |
| `starting_bid` column added | **No** (alias-only at API layer later) |
| Removed `start_price` / `current_bid` | **No** |

**Operator rules:**

- Do **not** pass `--force-reset` (would wipe the database).
- Do **not** pass `--accept-data-loss` unless Prisma prints a warning and you have reviewed it line-by-line.
- If `db push` proposes destructive steps, **stop** and share the CLI output before approving.

F0 is **additive-only** by design.

---

## 4. Confirm: existing API endpoints unaffected

### Auction HTTP routes (unchanged in F0)

| Method | Path | F0 code change |
|--------|------|----------------|
| `GET` | `/api/auctions` | **None** — same `route.ts`, same query |

No new `/api/auctions/*` routes registered in F0.

### Auction RPC (unchanged in F0)

| RPC | Handler file | F0 code change |
|-----|--------------|----------------|
| `place_auction_bid` | `rpc-handlers.ts` | **None** |
| `finalize_auction` | `rpc-handlers.ts` | **None** |
| `register_dealer_auction` | `rpc-handlers.ts` | **None** |
| `set_auction_auto_bid` | `rpc-handlers.ts` | **None** (stub) |

### Generic DB API (behavior)

| Path | Note |
|------|------|
| `POST /api/db/query` | `auctions` / `bids` still allowlisted; new table names in `table-map.ts` only — **no route logic change** |
| `POST /api/db/rpc/[fn]` | Signatures unchanged |

### Post-push JSON (additive only)

`GET /api/auctions` may return **extra nullable keys** on each row (`organizer_id`, `reserve_price`, `bid_increment`, `auction_category`, `location`, `is_featured`). Existing clients that ignore unknown fields are unaffected.

**Feature flags:** all `FEATURE_AUCTION_*` default **false** — no new code paths enabled.

---

## 5. Confirm: existing auction records not modified

| Data | F0 impact |
|------|-----------|
| `id`, `title`, `slug`, `start_price`, `current_bid`, `bid_count`, `status`, `starts_at`, `ends_at`, `winner_id`, `viewer_count`, `images`, `metadata`, timestamps | **Not updated** by migration |
| Existing rows in `bids` | `amount`, `bidder_id`, etc. **unchanged**; only new nullable `bid_source` = `NULL` |
| `UPDATE` / `DELETE` on `auctions` or `bids` | **None** in migration script |

MySQL `ALTER TABLE ... ADD COLUMN` with defaults fills **new** columns only:

| New column | Existing rows receive |
|------------|----------------------|
| `organizer_id` | `NULL` |
| `reserve_price` | `NULL` |
| `bid_increment` | `1000` (column default) |
| `auction_category` | `dealer` (enum default) |
| `location` | `NULL` |
| `is_featured` | `false` |
| `bids.bid_source` | `NULL` |

**No seed, backfill, or data migration** runs in F0.

---

## 6. Final SQL preview (expected)

```sql
-- ---------------------------------------------------------------------------
-- Phase F0 — expected MySQL migration (additive only)
-- Verify live: npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
-- ---------------------------------------------------------------------------

-- AlterTable: auctions
ALTER TABLE `auctions` ADD COLUMN `organizer_id` VARCHAR(191) NULL,
    ADD COLUMN `reserve_price` DECIMAL(12, 2) NULL,
    ADD COLUMN `bid_increment` DECIMAL(12, 2) NOT NULL DEFAULT 1000,
    ADD COLUMN `auction_category` ENUM('bank', 'insurance', 'fleet', 'dealer', 'government') NOT NULL DEFAULT 'dealer',
    ADD COLUMN `location` VARCHAR(128) NULL,
    ADD COLUMN `is_featured` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: auctions
CREATE INDEX `auctions_auction_category_status_idx` ON `auctions`(`auction_category`, `status`);
CREATE INDEX `auctions_organizer_id_idx` ON `auctions`(`organizer_id`);

-- AlterTable: bids
ALTER TABLE `bids` ADD COLUMN `bid_source` VARCHAR(16) NULL;

-- CreateTable: auction_auto_bids
CREATE TABLE `auction_auto_bids` (
    `id` VARCHAR(191) NOT NULL,
    `auction_id` VARCHAR(191) NOT NULL,
    `bidder_id` VARCHAR(191) NOT NULL,
    `max_amount` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `auction_auto_bids_auction_id_bidder_id_key` ON `auction_auto_bids`(`auction_id`, `bidder_id`);
CREATE INDEX `auction_auto_bids_auction_id_idx` ON `auction_auto_bids`(`auction_id`);

ALTER TABLE `auction_auto_bids` ADD CONSTRAINT `auction_auto_bids_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: auction_proxy_bids
CREATE TABLE `auction_proxy_bids` (
    `id` VARCHAR(191) NOT NULL,
    `auction_id` VARCHAR(191) NOT NULL,
    `bidder_id` VARCHAR(191) NOT NULL,
    `max_amount` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `auction_proxy_bids_auction_id_bidder_id_key` ON `auction_proxy_bids`(`auction_id`, `bidder_id`);
CREATE INDEX `auction_proxy_bids_auction_id_idx` ON `auction_proxy_bids`(`auction_id`);

ALTER TABLE `auction_proxy_bids` ADD CONSTRAINT `auction_proxy_bids_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: auction_watchlists
CREATE TABLE `auction_watchlists` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auction_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `auction_watchlists_user_id_auction_id_key` ON `auction_watchlists`(`user_id`, `auction_id`);
CREATE INDEX `auction_watchlists_user_id_idx` ON `auction_watchlists`(`user_id`);

ALTER TABLE `auction_watchlists` ADD CONSTRAINT `auction_watchlists_auction_id_fkey` FOREIGN KEY (`auction_id`) REFERENCES `auctions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: auction_bid_attempts
CREATE TABLE `auction_bid_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `auction_id` VARCHAR(191) NOT NULL,
    `bidder_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `rejection_reason` VARCHAR(255) NULL,
    `risk_score` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `auction_bid_attempts_auction_id_bidder_id_created_at_idx` ON `auction_bid_attempts`(`auction_id`, `bidder_id`, `created_at`);

-- CreateTable: auction_bidder_eligibility
CREATE TABLE `auction_bidder_eligibility` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auction_id` VARCHAR(191) NULL,
    `kyc_status` VARCHAR(24) NOT NULL,
    `eligible` BOOLEAN NOT NULL,
    `reason` VARCHAR(255) NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `auction_bidder_eligibility_user_id_checked_at_idx` ON `auction_bidder_eligibility`(`user_id`, `checked_at`);
```

**If a column already exists** (e.g. from a partial prior push), Prisma may skip or error — compare with `SHOW COLUMNS FROM auctions` before push.

---

## 7. Authoritative SQL when MySQL is running

```powershell
cd backend
# Start MySQL first, then:
npx prisma migrate diff `
  --from-schema-datasource prisma/schema.prisma `
  --to-schema-datamodel prisma/schema.prisma `
  --script > ..\PHASE-F-F0-LIVE-SQL.sql
```

Review `PHASE-F-F0-LIVE-SQL.sql` for **zero** `DROP` statements, then:

```powershell
npx prisma db push
npx prisma generate
```

---

## 8. Rollback plan

### Level A — Application (immediate, no DB change)

1. Keep all `FEATURE_AUCTION_*` and `VITE_FEATURE_AUCTION_*` **unset or false**.
2. Deploy previous backend build if any F1 code was trialed.
3. Auction UI and RPC continue on `start_price` / `current_bid` only.

### Level B — Schema rollback (dev / staging)

**Pre-push:** take a logical backup:

```powershell
mysqldump -u root -p motorcart > motorcart-pre-f0.sql
```

**After push — full restore (dev):**

```powershell
mysql -u root -p motorcart < motorcart-pre-f0.sql
cd backend
git checkout HEAD -- prisma/schema.prisma   # or revert F0 commit
npx prisma generate
```

### Level C — Surgical rollback (keep other schema changes)

Only if F0 ran in isolation and no other tables changed:

```sql
-- Drop new tables (empty in F0)
DROP TABLE IF EXISTS `auction_bidder_eligibility`;
DROP TABLE IF EXISTS `auction_bid_attempts`;
DROP TABLE IF EXISTS `auction_watchlists`;
DROP TABLE IF EXISTS `auction_proxy_bids`;
DROP TABLE IF EXISTS `auction_auto_bids`;

-- Drop new indexes on auctions
DROP INDEX `auctions_auction_category_status_idx` ON `auctions`;
DROP INDEX `auctions_organizer_id_idx` ON `auctions`;

-- Drop new columns (only if no F1 data depends on them)
ALTER TABLE `bids` DROP COLUMN `bid_source`;
ALTER TABLE `auctions`
  DROP COLUMN `is_featured`,
  DROP COLUMN `location`,
  DROP COLUMN `auction_category`,
  DROP COLUMN `bid_increment`,
  DROP COLUMN `reserve_price`,
  DROP COLUMN `organizer_id`;
```

Then revert `schema.prisma` in git and `npx prisma generate`.

**Production:** prefer backup restore over `DROP COLUMN`; never use `--force-reset`.

### Post-rollback verification

- [ ] `GET /api/auctions` returns rows with `start_price` / `current_bid`
- [ ] `place_auction_bid` RPC still works
- [ ] Auction room loads (mock + DB paths)
- [ ] `npx prisma validate` passes against reverted schema

---

## Approval

Reply **Approve db push** to run migration.  
Reply **Run live SQL diff** if you want the agent to regenerate §6 against a running MySQL instance first.
