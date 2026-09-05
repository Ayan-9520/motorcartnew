# Batch 7 — Sales OS, PIN lead routing, Lead Board

**Status:** Implemented, gated  
**Does not rewrite:** Phase 4–5C, Batch 6 Community, canonical `Lead` / `DealerLead` / `BrokerLead` / `FinanceLead`  
**Batch 12:** Lead Board / Sales OS unchanged; isolation re-tested.

---

## What this is

MotorCart’s **sales operating system** for dealers:

Customer enquiry → canonical **Lead** → quality → assignment / PIN routing → CRM activities → **Opportunity** → quotation / test drive → won/lost.

**Lead Board** is a controlled marketplace of *published* leads, paid with **credits** (no payment gateway).

---

## Not the same as Phase 5C

| Feature | Batch | Meaning |
|---------|-------|---------|
| **Stock-by-PIN** | Phase 5C | Customer inventory discovery: exact dealer/branch PIN → available stock |
| **PIN lead routing** | Batch 7 | CRM assignment: exact PIN coverage → which dealer gets the *lead* |

No radius. No Haversine. No “nearest dealer.”

---

## Canonical objects

| Object | Table | Role |
|--------|-------|------|
| Lead | `leads` | Enquiry / prospect (unchanged identity; additive quality/PIN columns) |
| Opportunity | `opportunities` | Commercial pursuit — **not** a Lead |
| CrmActivity | `crm_activities` | Timeline (notes/calls are logs, not VoIP) |
| LeadCall | `lead_calls` | Call **logging** + disposition |
| CrmTask | `crm_tasks` | Follow-ups |
| PartnerCoverage | `partner_coverages` | Exact PIN × domain coverage |
| LeadAssignment | `lead_assignments` | Assignment history (never silent overwrite) |
| LeadBoardListing | `lead_board_listings` | Published board item |
| LeadAcquisition | `lead_acquisitions` | Purchase row |
| LeadCreditAccount / Ledger | credit tables | Balance **and** immutable ledger |
| CustomerConsent | `customer_consents` | Channel × purpose; not implied by “submitted a lead” |

`DealerLead`, `BrokerLead`, `FinanceLead` remain separate. No table merge. No `Lead.organizationId`.

---

## Lead quality (deterministic, not AI)

Signals: verified contact, vehicle, budget, timeline, finance, exchange, PIN, repeat enquiry, quotation exists, test drive exists.

Bands: `HOT` ≥ 70, `WARM` ≥ 40, `COLD` ≥ 15, else `UNQUALIFIED`.

Dealer override is authorized + audited (`quality_overridden`).

---

## Consent

Created only when the customer **explicitly** consents (enquiry `consent: true` or CRM create). Channels: PHONE, WHATSAPP, SMS, EMAIL. Purposes: ENQUIRY_FOLLOWUP, MARKETING, SERVICE_UPDATES. Status: GRANTED / WITHDRAWN.

Community engagement is **not** sales consent.

---

## PIN routing (VEHICLE)

1. Exact PIN on coverage  
2. Active dealer  
3. Domain `VEHICLE`  
4. Optional capacity only if stored  
5. Order: priority desc, then id  
6. Persist `LeadAssignment` history  

Unassigned queue (`UNASSIGNED_DEALER_SLUG`) is the only “no dealer” sink. No spray, no random.

---

## Lead Board + credits

- Default **off**: `FEATURE_LEAD_BOARD` / `FEATURE_PAID_LEADS` plus org entitlement override (`lead_board`, `paid_leads`). Not granted by plan math.  
- PII masked until acquisition. Acquisition does **not** grant customer 360, documents, finance history, or community data.  
- Atomic: availability + balance + debit + acquisition + assignment. Unique `(listing, dealer)` prevents double buy. Exclusive: one acquire.  
- Admin grants credits; no Razorpay/GST.

**Still locked:** `dialer`, `ai_calling`.

---

## APIs (dedicated REST — not `/api/db/query`)

`/api/crm/leads|activities|calls|tasks|opportunities|pipeline`  
`/api/consents`  
`/api/lead-routing` `.../coverage` `.../assignments`  
`/api/lead-board` `.../[id]` `.../[id]/acquire` `.../credits` `.../credits/ledger`  
`POST /api/crm/dialer` and `/api/crm/ai-calling` always 403.

Existing `/api/leads`, `/api/quotations`, `/api/test-drives`, `/api/inventory/by-pincode` unchanged.

---

## Dealer UI

Existing dealer CRM nav extended (same shell): Pipeline, Follow-ups, Lead Board, Credits. Calls/tasks use REST. Empty states stay empty.

Customer dashboard is **not** CRM.

---

## Tests

`npm run test:batch7`  
`npm run test:batch7-db` (local Docker Postgres)

---

## Out of scope (Batch 8+)

VoIP, recording, AI calling, WhatsApp provider, payments, GST, radius routing, MotorCart One.
