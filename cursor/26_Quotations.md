# Phase 5A — Quotation engine

**Status:** COMPLETE. Batch 12 did not rewrite quotations.  
**Not included:** payments, GST invoices. Phase 5B test-drive is a separate object (`cursor/27_Test_Drives.md`). Phase 5C stock-by-PIN is discovery only (`cursor/28_Stock_By_PIN.md`) and does not create quotations. Quotation `pincode` is commercial/RTO context, not inventory location.

## What a quotation is

A persistent commercial object (`quotations`) with lifecycle, dealer ownership, customer ownership, frozen pricing snapshot, validity window, and audit fields.

It is **not** a Lead, listing, permission string, invoice, booking, or loan sanction.

## Model

`Quotation` references existing `User`, `Dealer`, optional `Organization` (resolved from `legacyDealerId`), optional `Lead`, `Vehicle`, `NewCarInventory`.

Server calculates:

`total = exShowroom + rto + insurance + accessories + otherCharges + tax - discount - exchange`

`financeAmount` is stored as an indicative figure only. It is not a sanction and is not added to payable total.

## APIs

JWT required. Dedicated REST (not `/api/db/query`).

- `POST/GET /api/quotations`
- `GET/PATCH /api/quotations/[id]`
- `POST /api/quotations/[id]/issue`
- `POST /api/quotations/[id]/cancel`

Client-supplied `dealerId` (outside scope), `organizationId`, `customerUserId` (invalid), `totalAmount`, and `quotationNumber` are ignored or rejected.

## Lifecycle

`draft` → `issued` → `expired` (lazy on read after `validityEnd`) or `cancelled`.  
`accepted` is reserved and unused in 5A.

Customers never see drafts.

## UI

- Customer: My Quotations (empty until issued)
- Dealer CRM + New Car OS: create / issue / history / cancel
- Print: browser print of the quotation view. Not a GST invoice.
