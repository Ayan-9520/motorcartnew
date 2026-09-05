# MotorCart — Roles & Permissions

**RBAC reference for frontend guards and backend authorization**

---

## AppRole enum (source: `frontend/src/types/database.ts`)

| Role | Workspace route | Primary console |
|------|-----------------|-----------------|
| `customer` | `/dashboard/customer` | Customer dashboard |
| `dealer` | `/dashboard/dealer` | Used car dealer CRM |
| `used_car_dealer` | `/dashboard/dealer` | Same (normalized) |
| `preowned_dealer` | `/dashboard/dealer` | Legacy alias |
| `new_car_dealer` | `/dashboard/new-car-dealer` | New car OS |
| `bike_dealer` | `/dashboard/dealer` | Bike dealer |
| `truck_dealer` | `/dashboard/dealer` | Truck/commercial |
| `dsa_agent` | `/dashboard/dsa` | DSA desk |
| `bank_nbfc` | `/dashboard/finance` | Lender portal (BANK vs NBFC is Organization.type) |
| `finance_manager` | `/dashboard/finance-manager` | Finance manager |
| `service_center` | `/dashboard/service` | Service ERP |
| `service_technician` | `/dashboard/technician` | Technician jobs |
| `service_partner` | `/dashboard/service` | Legacy → service_center |
| `parts_seller` | `/dashboard/parts` | Parts ERP |
| `broker` | `/dashboard/broker` + `/dashboard/insurance` | Broker CRM; insurer console when org type is insurance |
| `auction_partner` | `/dashboard/auctions` | Auction admin |
| `admin` | `/dashboard/admin` | Platform admin |
| `super_admin` | `/dashboard/super-admin` | Full ERP |

---

## Vision roles (not first-class AppRole)

OEM and insurance **organizations** use existing membership + `/dashboard/oem` (dealer/admin) and `/dashboard/insurance` (broker/admin). Do not split `bank_nbfc`.

Still not first-class AppRole:

- Fleet owner
- Equipment dealer
- Auction buyer / seller (split from auction_partner)

**Do not** rename existing roles.

---

## Capability matrix

Defined in `frontend/src/permissions/matrix.ts` — `ROLE_CAPABILITIES`:

| Capability | Description |
|------------|-------------|
| `manageUsers` | User admin, approvals |
| `manageMarketplace` | Vehicle moderation, featured |
| `financeConsole` | Finance desks access |
| `dealerConsole` | Dealer workspace |
| `partsConsole` | Parts supplier ERP |
| `serviceConsole` | Service partner ERP |

`super_admin` and `admin` have all capabilities `true`.

---

## Guard components & utilities

| File | Purpose |
|------|---------|
| `ProtectedRoute` | Route-level auth |
| `permissions/matrix.ts` | UI capability flags |
| `permissions/role-matching.ts` | `DEALER_ROLES`, `isDealerRole()` |
| `workspace-role.ts` | Normalize legacy role aliases |
| `features/platform-admin/config/role-workspaces.ts` | Admin workspace config |

Backend: enforce on every mutation — never rely on UI-only guards.

---

## Business approval gate

Business signups may be `pending` until super-admin approval.

- Check pending state before full workspace access
- Pages: `BusinessApprovalsPage`, dealer verification flows

---

## Generic DB query hardening (critical)

`/api/db/query` with auth can access many tables — **high risk**.

Planned: role-based table allowlist (`STRICT_DB_QUERY` flag).

When adding tables:

1. Define which roles may read/write
2. Implement in query route allowlist
3. Prefer dedicated API for sensitive data

---

## Permission extension process

1. Add role to Prisma `User.role` enum if needed (migration)
2. Add to `AppRole` type in `database.ts`
3. Add row to `ROLE_CAPABILITIES`
4. Add workspace route + sidebar in appropriate `*Sidebar.tsx`
5. Backend: guard routes and query allowlist
6. Update this document

Batch 10: dialer and AI calling stay out of plan math (`PHASE_LOCKED_FEATURES`). Runtime grant is `OrganizationEntitlement` + env flag + provider.

---

## Dealer role normalization

These map to dealer workspace via `workspace-role.ts`:

- `dealer` ≈ `used_car_dealer` ≈ `preowned_dealer`
- `service_partner` → `service_center`

Keep normalizers — do not break existing user records.
