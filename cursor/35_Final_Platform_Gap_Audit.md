# Final platform gap audit (Batch 12)

**Date:** 2026-08-20  
**Scope:** Features already built through Batch 11. Launch-critical gaps only. No Batch 13.

Legend: **IMPLEMENTED** · **PARTIAL** · **UI_ONLY** · **PROVIDER_REQUIRED** · **DATA_REQUIRED** · **DEFERRED** · **NOT_APPLICABLE** · **MISSING_BUT_REQUIRED_FOR_LAUNCH** (none remaining as software P0 after Batch 12)

## Customer

| Area | Status | Notes |
|------|--------|-------|
| Account / profile | IMPLEMENTED | Canonical `User` |
| Customer ID | IMPLEMENTED | `MotorCartIdentity.publicId` |
| MotorCart One | IMPLEMENTED | Identity card + QR; explicit non-payment disclaimers |
| Garage | IMPLEMENTED | Customer vehicles |
| Documents | PARTIAL | Upload hardened; private buckets not public listing URLs |
| Wishlist | IMPLEMENTED | JWT scoped |
| Saved searches | IMPLEMENTED | Ownership enforced |
| Reminders | IMPLEMENTED | `ScheduledReminder` + scheduler entry |
| Notifications | IMPLEMENTED | Unified list/read/read-all + `Notification` |
| Recently viewed | PARTIAL | If present in customer 360 activity |
| Enquiries | IMPLEMENTED | `Lead` |
| Quotations | IMPLEMENTED | Phase 5A |
| Test drives | IMPLEMENTED | Phase 5B |
| Finance history | IMPLEMENTED | Applications scoped to user |
| Insurance | PARTIAL | Quotes/policies when partners exist |
| Rewards | IMPLEMENTED | Ledger balance |
| Activity | IMPLEMENTED | Customer 360 |
| Sell vehicle | IMPLEMENTED | Sale requests |
| Valuation / offers | IMPLEMENTED | Indicative / partner; not AI |
| PIN stock | IMPLEMENTED | Exact PIN; empty if none |
| Best Deal | IMPLEMENTED | Deterministic ranking from real stock |
| AI assistant | PROVIDER_REQUIRED | Honest fallback without `OPENAI_API_KEY` |

## Dealer

| Area | Status |
|------|--------|
| Profile / inventory / leads / CRM / pipeline / opportunities / follow-ups / calls / tasks | IMPLEMENTED (Sales OS; dialer PROVIDER_REQUIRED) |
| Quotations / test drives / PIN coverage | IMPLEMENTED |
| Lead Board / acquire / credits | IMPLEMENTED, flag+entitlement gated |
| Communication | IMPLEMENTED abstraction; PROVIDER_REQUIRED for WhatsApp/SMS |
| Earnings / payouts / subscriptions | IMPLEMENTED ledgers |
| Community / company presence | IMPLEMENTED via Organization + community profiles |

## Community / professional network

IMPLEMENTED: profile, headline, experience, skills, posts, comments, likes, saves, shares, follow, discover, reports, companies, jobs, applications. Counts are persisted, never fabricated.

## Partner ecosystem

OEM, Dealer, Bank/NBFC, DSA, Insurer, valuation partner, parts seller, workshop, recruiter/company: **IMPLEMENTED** on Organization tenants. Live LOS/bureau/courier: **PROVIDER_REQUIRED** / **FUTURE**. VIN live match: **DEFERRED** (architecture-ready).

## Commercial

Subscriptions, plans, entitlements, lead credits, invoices, GST config (must be configured), payouts, bank import, reconciliation, adjustments, rewards, partner earnings: **IMPLEMENTED**. Payment gateway: **PROVIDER_REQUIRED** (flag default off).

## Communication / AI

In-app + provider abstraction: **IMPLEMENTED**. WhatsApp/SMS/email/telephony/recordings: **PROVIDER_REQUIRED**. Transcripts/summaries: **PARTIAL** when provider+consent exist. Quiet hours / frequency / consent: **IMPLEMENTED** where policies exist. No provider = disabled, not fake-delivered.

## Batch 12 launch closures

- Unified PostgreSQL search (`GET /api/search?q=&type=`) with min length, pagination, no catalog-as-stock, no PII
- Admin command center real counts + ops queues (zeros if empty)
- Analytics point-in-time (no fake monthly series)
- Health vs ready
- Upload MIME/size/private buckets
- Rate limits on search, jobs apply, sell, AI start
- Additive search indexes only
