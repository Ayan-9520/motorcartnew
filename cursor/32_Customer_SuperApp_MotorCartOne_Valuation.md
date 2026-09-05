# Batch 9 — Customer Super-App, MotorCart One, used-vehicle trust, valuation marketplace

**Status:** implemented locally (Batch 9). Later batches did not rewrite MotorCart One.

MotorCart One is an **ecosystem membership / identity card**. It is **not** a bank card, credit card, prepaid instrument, wallet, FASTag, or payment instrument. QR verification is read-only.

## Canonical identity

- Customer identity remains `User`.
- Public id: `MotorCartIdentity.publicId` (`MC-` + 8 Crockford-like chars). Server-generated, unique, immutable after issue. No phone/email encoded.
- QR: `MotorCartOneToken.tokenHash` (SHA-256 of random token). Rotatable/revocable. Not a JWT/login/bearer token.

## Reused

`User`, `CustomerVehicle`, `Wishlist`, `Notification`, `ScheduledReminder`, `RewardAccount`/`RewardLedger`, `Quotation`, `TestDriveBooking`, `Lead` (optional adapter only), `Dealer`, `Organization`, `/api/upload` storage conventions.

## Additive models

`MotorCartIdentity`, `MotorCartOneToken`, `SavedSearch`, `SavedSearchMatch`, `VehicleMediaAsset`, `VehicleSaleRequest`, `VehicleValuation`, `VehiclePurchaseOffer`. `OrganizationType.VALUATION_PARTNER`. `ScheduledReminder` status/source columns.

Migration: `backend/prisma/migrations/20260819180000_customer_superapp/`.

## APIs

| Route | Notes |
|-------|--------|
| `/api/customer/id`, `/api/customer/one`, `/api/customer/activity` | Authenticated customer |
| `/api/motorcart-one/verify/[token]` | Public, rate-limited, minimal fields |
| `/api/saved-searches`, `/api/reminders` | Owner-scoped |
| `/api/media` | Listing media; documents rejected |
| `/api/sell-requests`, `/api/sale-offers`, `/api/valuations` | Sell / offer / partner valuation |

Do not use `/api/db/query`. New tables are `NEVER_ALLOW`.

## Saved searches & reminders

- Filters whitelist only (incl. 6-digit PIN → dealer pincode).
- Notify-on-match: `runSavedSearchNotifications()` — new `SavedSearchMatch` rows only; notification `dedupe_key`.
- Reminders: reuse `ScheduledReminder`. System `INSURANCE_RENEWAL` only when `InsuranceWallet.policyEnd` exists. In-app `Notification` only.
- Scheduler: `backend/src/jobs/superapp-scheduler.ts`.

## Media trust

- Original preserved; watermark derivative (JPEG COM / PNG tEXt). No fake CV plate detection.
- Plate: `NOT_REQUIRED` / `PENDING` / `MASKED` (manual regions) / `REVIEW_REQUIRED` / `FAILED`.
- Authenticity `VERIFIED` only via admin review. Public listing should use processed URL.

## Sell / valuation / offers

Lifecycle: `DRAFT` → `OPEN_FOR_OFFERS` → `OFFER_ACCEPTED` / `CANCELLED`. Offer accept is atomic; other ACTIVE offers `REJECTED`. **No payment.** Valuation is indicative. Dealer identity from `requireDealerContext` (no spoof). PII masked on dealer-facing lists. Existing vehicle listing flow remains.

## Honesty

No Instant AI Valuation, fake buyer counts, fake FASTag recharge, MotorCart One as payment, or AI insights. Ownership alerts are deterministic.

## Tests

`npm run test:batch9` and `test:batch9-db` in `backend/`.
