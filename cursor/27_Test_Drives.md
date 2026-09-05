# Phase 5B — Real Test Drive product

**Status:** COMPLETE. Batch 12 did not rewrite test drives.  
**Phase 5C (exact PIN stock discovery):** IMPLEMENTED — `cursor/28_Stock_By_PIN.md`

## What a test drive is

A persistent operational object (`test_drive_bookings`) with its own lifecycle. It is **not** a Lead, quotation, workshop booking, payment, or PIN-routed assignment.

A quotation or lead may optionally link to a test drive. Neither replaces the other.

## Model

`TestDriveBooking` references existing `User` (customer + createdBy), `Dealer`, optional `Organization` (resolved from `legacyDealerId`, never trusted from the client), optional `OrganizationBranch`, optional `Vehicle`, `NewCarInventory`, `Quotation`, and `Lead`.

Timestamps are stored as UTC `DateTime`. The UI displays them in `en-IN` locale. The schema is not India-only.

There is **no** live dealer availability calendar in Phase 5B. The customer submits a requested time; the dealer confirms or reschedules.

## Status lifecycle

`requested` → `confirmed` → `completed`

Also:

- `requested` → `rescheduled` → `confirmed`
- `requested` → `rejected` | `cancelled`
- `confirmed` → `cancelled` | `no_show` | `rescheduled`

Terminal: `completed`, `cancelled`, `rejected`, `no_show`. No reopen workflow.

A customer submit is always `requested`. It is never auto-confirmed.

## APIs

JWT required. Dedicated REST (not `/api/db/query`). Table `test_drive_bookings` is on the never-allow list.

- `POST/GET /api/test-drives`
- `GET/PATCH /api/test-drives/[id]`
- `POST /api/test-drives/[id]/confirm`
- `POST /api/test-drives/[id]/reschedule`
- `POST /api/test-drives/[id]/reject`
- `POST /api/test-drives/[id]/complete`
- `POST /api/test-drives/[id]/cancel`
- `POST /api/test-drives/[id]/no-show`

Server owns `customerUserId` (JWT `sub`), `dealerId` (from vehicle/inventory), and `organizationId` (from dealer). Forged tenant/customer IDs are rejected. Cross-tenant reads return 404.

## Notifications

Reuses `prisma.notification` (`kind: test_drive`). In-app only. No new SMS/WhatsApp provider.

- Customer: submitted, confirmed, rescheduled, rejected, cancelled, completed, no-show
- Dealer owner: new request; customer cancellation

## UI

- Vehicle detail: request form (login required). Success copy: “Test-drive request submitted.”
- Customer: `/dashboard/customer/test-drives`
- Dealer CRM: `/dashboard/dealer/test-drives`
- New Car OS: `/dashboard/new-car/test-drives` (same real list, not lead-stage placeholder)

Empty lists stay empty. No mock booking rows on production fetch paths.

## Out of scope (later than 5B)

Radius matching, branch capacity, exclusive/shared routing, payments, GST invoices, live availability engine. Exact PIN stock discovery is Phase 5C (`cursor/28_Stock_By_PIN.md`) and does not create test drives.
