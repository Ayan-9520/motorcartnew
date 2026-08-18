# MotorCart Phase 3 — Organization + Partner Architecture

**Status:** Foundation implemented in code. Additive Phase 3 Organization schema is **applied in local Docker** for this baseline run (do not treat this as Phase 4 approval; commit/apply to shared environments is still gated).

Phase 3 is **not** Lead Board, PIN-code distribution, paid leads, AI voice, payments, or full CRM.

---

## 1. Organization model

One table: `organizations`.

| Field | Purpose |
|-------|---------|
| `type` | `OrganizationType` enum (DEALER, OEM, BANK, … OTHER) |
| `status` | active / pending / suspended / archived |
| `name` / `displayName` / `slug` | Identity |
| `planSlug` | free / starter / pro / premium / enterprise (no billing) |
| `legacyDealerId` | Optional unique FK to existing `dealers` — **does not alter the dealers table** |
| `typeMetadata` | JSON for type-specific extras (NBFC vs BANK, OEM brand codes, later) |
| `createdByUserId` | Actor who created the tenant |

Customers **never** become organizations (`CUSTOMER_NOT_TENANT`).

Lazy provision: a dealer hitting `GET /api/organizations/me` gets an org linked to their existing `Dealer` row (HQ branch from city/state). Existing lead routing is unchanged.

---

## 2. Partner model

`partner_profiles` is 1:1 with `organizations`.

Common fields: business/display name, logo, description, contact, website, verification status, rating, services, categories, business hours, social links, certifications JSON.

Public marketplace profile UI is **not** built. Domain + authenticated GET/PATCH only.

`partner_badge_assignments` exists so badges can be attached later by **rules**. There is no partner self-serve “give myself Verified” API.

---

## 3. Membership model

`organization_members`

- unique (`organizationId`, `userId`)
- `role` = org member role (not `AppRole`)
- `status` = invited / active / suspended / removed
- `branchId` optional
- `department` optional
- `permissions` JSON extra grants
- `joinedAt`

Invite requires an **existing MotorCart user**. Customers cannot be members.

---

## 4. Branch / location model

`organization_branches`

Stores address, city, state, country (`IN` default), postal/PIN (`postal_code`), lat/lng, contact, business hours JSON, headquarters flag.

Indexed `(country, postal_code)` for a future PIN engine. **No geospatial matching or PIN lead routing in Phase 3.**

---

## 5. Roles

**Platform `AppRole` is unchanged** (customer, dealer, … super_admin).

**Organization member roles** (inside a tenant):

OWNER, ADMIN, MANAGER, SALES, FINANCE, INSURANCE, SERVICE, PARTS, OPERATIONS, CALL_AGENT, MARKETING, VIEWER

Compatibility: `organizationTypeFromAppRole()` maps dealer variants → DEALER, `bank_nbfc` → BANK, `dsa_agent` → FINANCE_DSA, workshops → SERVICE_CENTER, etc. OEM / insurer / manufacturer **types** exist; those `AppRole`s still do not.

---

## 6. Permissions

Keys such as `inventory.read`, `lead.assign`, `team.manage`, `organization.update` (see `permissions.ts`).

Checked with `hasOrganizationPermission(role, permission, extra[])`. Do not scatter `if (role === "SALES")` in new org APIs.

Initial set is intentionally small (~24 keys), not hundreds.

---

## 7. Feature entitlements

`PLAN → FEATURE → ENTITLEMENT → ORGANIZATION`

Plan catalog in code (`entitlements.ts`), not a billing table.

Overrides: `organization_entitlements` (`granted` true/false).

**Always locked in Phase 3 (any plan):** `lead_board`, `paid_leads`, `dialer`, `ai_calling`.

Locked features remain visible in the UI with hints (“Available in Pro”, “Coming in a later phase”).

---

## 8. Plan architecture

Slugs: `free`, `starter`, `pro`, `premium`, `enterprise`.

`organizations.planSlug` defaults to `free`. Existing `subscription_plans` / dealer `subscriptionTier` are **not** replaced. No payment collection.

---

## 9. Data ownership

| Model | Current owner | Future owner | Safe now? |
|-------|---------------|--------------|-----------|
| `User` | Self / platform | Self; optional memberships | Prisma relation only — **no users column change** |
| `Dealer` | `ownerId` user | Organization (DEALER type) via `legacyDealerId` | **Not modified** |
| `NewCarInventory` | `dealerId` | Organization + branch | **NOT YET** |
| `Vehicle` | `dealerId` / seller | Organization | **NOT YET** |
| `Lead` | required `dealerId` | Organization (+ optional dealer) | **NOT YET** (Phase 2 sentinel dealer remains) |
| `Booking` / `ServiceBooking` | user / center | Organization | **NOT YET** |
| `Part*` | supplier / user | Organization | **NOT YET** |

No rewrite of the 127-model graph.

---

## 10. Security model

- Dedicated `/api/organizations/*` only. Tables are on `/api/db/query` **never-allow**.
- Auth JWT required.
- Membership + permission check on every mutating/read org API.
- Cross-org → `403 CROSS_ORGANIZATION`.
- Platform `admin` / `super_admin` may access by id.
- JWT still in localStorage (Phase 2 observation; not rewritten).

---

## 11. Existing model compatibility

- `Dealer`, `DealerMember`, `Lead`, enquiry flow, vehicle detail: **untouched**.
- Growth workspace entitlements remain isolated.
- Dealer team page (legacy `dealer_members`) remains; org team is additive at `/dashboard/dealer/organization`.

---

## 12. Required future migrations (not in Phase 3)

After approval of **this** additive org migration:

1. Optional nullable `organization_id` on `vehicles`, `leads`, `new_car_inventory`.
2. Optional nullable `Lead.dealerId` (replace sentinel dealer) — needs explicit approval.
3. OEM / insurer `AppRole` additive enum values when those portals start.

**This phase’s SQL:** `backend/prisma/proposed-migrations/20260818120000_organization_foundation/migration.sql`

**Apply (after approval):** copy folder into `prisma/migrations/` then `npx prisma migrate deploy`.

**Rollback:** DROP the six new tables and five enums (listed at the bottom of the SQL file). No existing table is dropped.

---

## 13. APIs

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/organizations` | Membership list |
| POST | `/api/organizations` | Create (business roles only) |
| GET | `/api/organizations/me` | List + lazy provision |
| GET/PATCH | `/api/organizations/:id` | Tenant isolation |
| GET/PATCH | `/api/organizations/:id/profile` | Partner profile |
| GET/POST | `/api/organizations/:id/members` | Team |
| PATCH | `/api/organizations/:id/members/:memberId` | Role / branch / status |
| GET/POST | `/api/organizations/:id/branches` | Locations |
| PATCH | `/api/organizations/:id/branches/:branchId` | Update location |
| GET | `/api/organizations/:id/entitlements` | Plan + feature matrix |
| GET | `/api/organizations/:id/features/:featureKey` | 403 if locked |

If tables are not migrated: Prisma `P2021` → `503 SCHEMA_NOT_APPLIED`.

---

## 14. Tests

`npm run test:phase3 --prefix backend`

Plus Phase 2 suite must still pass.

---

## 15. Known limitations

- Org tables are present in local Docker after the approved Phase 3 migration. (Shared/production environments still require separate approval + deployment.)
- Dealer inventory/leads still keyed by `dealerId`.
- No public partner directory.
- No badge rule engine.
- No billing.
- Frontend is a single dealer-console page, not every partner workspace.
- OEM/Bank/Insurance portals not started.
