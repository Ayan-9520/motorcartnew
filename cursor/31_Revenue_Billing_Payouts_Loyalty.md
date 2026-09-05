# Batch 8 — Revenue, billing, payouts, settlement, loyalty ledger

**Status:** implemented (local Docker PostgreSQL). Production payment gateway **OFF** unless `FEATURE_PAYMENT_GATEWAY=true` **and** a live adapter is configured (none ships). **MotorCart One card/QR is not in this batch.**  
**Batch 12:** gateway remains OFF by default; UI states online payment is not configured. No client-forged PAID.

## What this is

MotorCart’s commercial layer on top of existing Organization, entitlements, Lead Board credits, and FinanceCommission:

- Admin-configured **subscription plans** (no hardcoded frontend prices)
- **Organization subscriptions** (TRIAL / ACTIVE / PAST_DUE / CANCELLED / EXPIRED)
- **PaymentProvider** abstraction + **manual/admin** payment records
- **Invoice / GST primitives** (rates and seller GSTIN from `commercial_settings` only)
- **Partner payouts** above FinanceCommission (not a replacement)
- Bank/NBFC **CSV import** with preview → confirm
- Configurable **slabs** and **partner share %** (no invented defaults)
- **Reconciliation** EXPECTED vs RECEIVED
- **Clawback / adjustment** ledger rows
- **Lead credit top-up** via verified payment → existing `LeadCreditLedger`
- **PromotionOrder** foundation (no fake impressions)
- **RewardAccount / RewardLedger / RewardRule** (ledger is source of truth)

## What this is not

- Live Razorpay/Stripe (flag off; no secrets in frontend)
- MotorCart One
- Dialer / AI calling (still `PHASE_LOCKED`)
- Payroll / automatic employee payouts (`RevenueAllocationRule` is config-only, `active` default false)
- Quotation engine changes (Phase 5A invoices ≠ commercial invoices)

## Money movement

Every credit, debit, commission adapter row, payout, refund-class adjustment, and reward posts a **history row**. Mutable balances exist only as derived caches (`LeadCreditAccount.balance`, `RewardAccount.balance`).

## APIs (JWT)

| Area | Routes |
|------|--------|
| Plans / subs | `GET/POST /api/billing/managed-plans`, `/api/billing/organization-subscriptions`, `/api/billing/feature-matrix` |
| Payments | `/api/billing/payments`, `POST /api/billing/payments/webhook` (`x-commercial-signature`) |
| Credits | `POST /api/billing/credits/purchase` then admin `action=manual` |
| Invoices | `/api/billing/invoices` |
| Revenue | `GET /api/billing/revenue` (admin) |
| Promotions | `/api/billing/promotions` |
| Payouts | `/api/payouts`, `/api/payouts/requests`, `/api/payouts/import`, `/api/payouts/rules`, `/api/payouts/reconciliation`, `/api/payouts/finance-commission` |
| Rewards | `/api/rewards/account`, `/api/rewards/ledger`, `/api/rewards/statement`, `/api/rewards/rules` |

N2 file-store `/api/billing/plans` (singular catalog) remains for existing billing V2 UI.

## Security

All `commercial_*`, payout, reward, and import tables are **NEVER_ALLOW** on `/api/db/query`. Client cannot set payment PAID. Webhooks HMAC + event id uniqueness. Partner isolation by organization. Payout request amount is **server-summed** from APPROVED entries.

## Flags

- `FEATURE_COMMERCIAL_ENGINE` default on
- `FEATURE_PAYMENT_GATEWAY` default **off**
- `COMMERCIAL_WEBHOOK_SECRET` required for webhook processing

## Migration

`backend/prisma/migrations/20260819160000_revenue_billing_loyalty`

## Tests

`npm run test:batch8` · `npm run test:batch8-db`
