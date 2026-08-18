# MotorCart — Role Audit

**Date:** 2026-08-18  
**Sources:** `backend/prisma/schema.prisma` `enum AppRole`, `frontend/src/types/database.ts`, `frontend/src/auth/signup-roles.ts`, `frontend/src/permissions/matrix.ts`, `cursor/16_Roles_and_Permissions.md`  
**Phase 1:** report only. No new roles implemented.

---

## 1. Prisma `AppRole` (database — source of truth)

```
customer
dealer
used_car_dealer
preowned_dealer
new_car_dealer
bike_dealer
truck_dealer
dsa_agent
bank_nbfc
finance_manager
service_center
service_partner
service_technician
parts_seller
admin
super_admin
auction_partner
employee
finance_partner
broker
```

Frontend `AppRole` type **omits** `employee` and `finance_partner` (legacy aliases documented; Prisma has them).

User lifecycle: `UserStatus` = `active | suspended | pending_verification | closed`. KYC: `pending | submitted | verified | rejected`. Business approval gate exists for partner signups.

---

## 2. Requested personas vs code

| Persona | Status | Evidence |
|---------|--------|----------|
| Customer | EXISTS | Role + `/dashboard/customer` + `/signup/customer` |
| Dealer | EXISTS | `dealer` / `used_car_dealer` / `preowned_dealer` → `/dashboard/dealer` |
| New car dealer | EXISTS | `new_car_dealer` → `/dashboard/new-car` |
| Bike / truck dealer | EXISTS | Roles map to dealer workspace |
| OEM | MISSING | Vision only (`cursor/16`) |
| Bank | PARTIAL | Folded into `bank_nbfc` + `/dashboard/lender` |
| NBFC | PARTIAL | Same as Bank (`bank_nbfc`) |
| Insurance company | MISSING | Insurance **UI** exists; no insurer tenant role. Growth enum has `insurance_agent` for workspaces only |
| Workshop | PARTIAL | `service_center` / `service_partner` / `service_technician` |
| Parts seller | EXISTS | `parts_seller` → `/dashboard/parts` |
| Manufacturer | MISSING | Same gap as OEM |
| Employee | PARTIAL | Prisma enum value; not a first-class workspace in signup/router |
| Professional | MISSING | No role |
| Admin | EXISTS | `admin` → `/dashboard/admin` |
| Super Admin | EXISTS | `super_admin` → `/dashboard/super-admin` |
| Broker | EXISTS | `broker` → `/dashboard/broker` (shell-ish) |
| DSA | EXISTS | `dsa_agent` |
| Finance manager | EXISTS | `finance_manager` |
| Auction partner | EXISTS | `auction_partner` |
| Growth marketer | PARTIAL | Any authenticated user can hit `/dashboard/growth` (`ProtectedRoute` without role list) |
| Billing | PARTIAL | `/dashboard/billing` is also any-auth (cross-role add-on) |

---

## 3. Public signup roles

From `SIGNUP_ROLE_OPTIONS` (business signup — not customer):

- Dealer
- Pre-Owned Car Dealer
- New Car Dealer
- DSA Agent
- Parts seller
- Service partner

Customer uses `/signup/customer`. Default business role: `dealer`.

**Not on public signup:** admin, super_admin, bank_nbfc, broker, auction_partner, OEM, insurer.

---

## 4. Workspace routing (high level)

| Role cluster | Dashboard |
|--------------|-----------|
| customer | `/dashboard/customer` |
| dealer / used / preowned / bike / truck | `/dashboard/dealer` |
| new_car_dealer | `/dashboard/new-car` |
| dsa_agent | `/dashboard/dsa` (finance feature) |
| bank_nbfc | `/dashboard/lender` |
| finance_manager | `/dashboard/finance-manager` |
| service_* | `/dashboard/service` |
| parts_seller | `/dashboard/parts` |
| broker | `/dashboard/broker` |
| auction_partner | `/dashboard/auction` |
| admin | `/dashboard/admin` |
| super_admin | `/dashboard/super-admin` |

Normalization lives in `frontend/src/auth/workspace-role.ts` (`service_partner` → `service_center`, dealer aliases).

---

## 5. Capability matrix (UI only)

`ROLE_CAPABILITIES` flags: `manageUsers`, `manageMarketplace`, `financeConsole`, `dealerConsole`, `partsConsole`, `serviceConsole`.

`admin` and `super_admin` have all true. This is **not** fine-grained RBAC and is **not** sufficient server-side authorization.

---

## 6. Community / growth extra roles

- `CommunityMemberRole` on groups
- `GrowthBusinessType`: dealer, broker, dsa, insurance_agent, workshop, parts_seller, influencer

These are **not** login `AppRole` values.

---

## 7. Gap for MotorCart One

A future Organization/Partner platform needs additive roles (OEM, insurer, fleet) **without renaming** existing enums. Until then, many “portals” are UIs on dealer/customer/admin roles plus mock data.
