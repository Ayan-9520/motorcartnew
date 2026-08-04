# MotorCart — Vehicle Categories & Hubs

**All supported and planned vehicle types**

---

## Active vehicle hubs (marketplace)

Configured in ecosystem registry and `VehicleHubIconBar`:

| Hub key | Display | Route pattern | Insurance | Services | Parts |
|---------|---------|---------------|-----------|----------|-------|
| `cars` | Cars | `/vehicles/cars`, `/buy?hub=cars` | ✅ 7-type hub | ✅ | ✅ |
| `bikes` | Bikes | `/vehicles/bikes` | ✅ | ✅ | ✅ |
| `scooters` | Scooters | `/vehicles/scooters` | ✅ | ✅ | ✅ |
| `ev` | Electric | `/vehicles/ev` | ✅ | ✅ | ✅ |
| `luxury` | Luxury cars | `/vehicles/luxury` | ✅ | ✅ | ✅ |
| `commercial` | Commercial | `/vehicles/commercial` | ✅ | ✅ | ✅ |
| `trucks` | Trucks | `/vehicles/trucks` | ✅ | ✅ | ✅ |
| `buses` | Buses | `/vehicles/buses` | ✅ | ✅ | ✅ |
| `pickup` | Pickup | `/vehicles/pickup` | ✅ | ✅ | ✅ |
| `mini-trucks` | Mini trucks | `/vehicles/mini-trucks` | ✅ | ✅ | ✅ |
| `heavy-trucks` | Heavy trucks | `/vehicles/heavy-trucks` | ✅ | ✅ | ✅ |
| `tractors` | Tractors | `/vehicles/tractors` | ✅ | ✅ | ✅ |
| `construction` | Construction equip. | `/vehicles/construction` | ✅ | ✅ | ✅ |
| `auto` | Auto rickshaw | `/vehicles/auto` | ✅ | ✅ | ✅ |

**Hub-aware navigation:** Use `?hub=` query param for active state in `VehicleHubIconBar.tsx`.

---

## Listing types

| Type | Route | Notes |
|------|-------|-------|
| New vehicles | `/new-cars`, new-car dealer OS | Brochure, waiting period — extend |
| Used / preowned | `/used-cars`, used dealer CRM | Sale modes metadata — planned |
| Certified | filters on used | Badge field — extend |
| Upcoming | launch / upcoming sections | CMS or vehicle status |
| Auction inventory | `/auctions` | Linked to auction lots |

---

## Dealer roles by vehicle vertical

| AppRole | Vertical |
|---------|----------|
| `dealer` / `used_car_dealer` / `preowned_dealer` | Used cars (legacy aliases normalized) |
| `new_car_dealer` | New car OEM/dealer |
| `bike_dealer` | Two-wheelers |
| `truck_dealer` | Commercial / trucks |

---

## Data model (vehicles)

Primary table: Prisma `Vehicle` model (see `backend/prisma/schema.prisma`).

Key fields for hubs:

- `category` / `vehicleType` — hub mapping
- `status` — draft, available, reserved, sold
- `price`, `specs`, `images`
- `dealerId` — FK to dealer/business account

Mock catalog merges with DB in `vehicle.service.ts` / `getVehiclePool()`.

---

## Insurance & finance by vehicle

Insurance hub supports **all 7 primary consumer types** with vehicle toggle (`InsuranceVehicleToggle.tsx`).

Finance calculators and apply flows should pass vehicle category context.

---

## Parts compatibility (planned)

- VIN search
- Registration number lookup
- Compatibility matrix API

Extend `features/parts/` — do not create parallel parts system.

---

## Equipment & fleet (vision)

| Mode | Status |
|------|--------|
| Rent | 📋 Planned |
| Finance | 📋 Extend finance marketplace |
| Auction | 📋 Extend auction categories |
| Fleet CRM | 📋 New role + dashboard |

---

## SEO & URLs

- Prefer stable slugs: `/vehicles/:slug` for detail
- Hub pages: indexable category landing
- Future: sitemap generation from vehicle slugs (roadmap Phase B5)

---

## Implementation checklist (new vehicle type)

- [ ] Add to ecosystem registry
- [ ] Add hub icon in `VehicleHubIconBar`
- [ ] Add insurance quote defaults if applicable
- [ ] Add filter keys in marketplace hooks
- [ ] Update this document
