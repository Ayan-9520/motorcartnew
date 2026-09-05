import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HubCategorySlug, VehicleConditionSlug } from "@/features/marketplace/types";
import {
  buyListingPath,
  parseBuyMarketplaceRoute,
  partsHubPath,
  sellListingPath,
  servicesHubPath,
} from "@/features/marketplace/lib/route-utils";
import type { EcosystemHubSlug } from "@/features/ecosystem/types";

/** Six primary vehicle ecosystems — navbar & home hub grid */
export const PRIMARY_VEHICLE_HUBS: EcosystemHubSlug[] = [
  "cars",
  "bikes",
  "auto",
  "trucks",
  "buses",
  "ev",
];

export function isPrimaryVehicleHub(hub: string): hub is EcosystemHubSlug {
  return PRIMARY_VEHICLE_HUBS.includes(hub as EcosystemHubSlug);
}

export function hubBuyPath(
  hub: HubCategorySlug,
  condition: VehicleConditionSlug = "used"
): string {
  return buyListingPath(hub, condition);
}

export function hubSellPath(hub: HubCategorySlug): string {
  return sellListingPath(hub);
}

export function hubEcosystemPath(hub: EcosystemHubSlug): string {
  // Former /cars|/bikes hub landings removed — icon bar goes straight to Buy
  return hubBuyPath(hub, "used");
}

/**
 * Hub switch target — preserves new/used on buy flows and ?hub= on parts/services.
 */
export function resolveHubMarketplacePath(
  pathname: string,
  hub: HubCategorySlug,
  condition?: VehicleConditionSlug,
  search = ""
): string {
  const searchParams = search.startsWith("?")
    ? new URLSearchParams(search.slice(1))
    : new URLSearchParams(search);
  const cond =
    condition ??
    parseBuyMarketplaceRoute(pathname, searchParams)?.condition ??
    useVehicleHubStore.getState().activeCondition;

  if (pathname.startsWith("/parts")) return partsHubPath(hub);
  if (pathname.startsWith("/services")) return servicesHubPath(hub);
  if (pathname.startsWith("/sell")) return hubSellPath(hub);
  if (
    pathname.startsWith("/buy") ||
    pathname.startsWith("/new-cars") ||
    pathname.startsWith("/used-cars")
  ) {
    return hubBuyPath(hub, cond);
  }
  return hubEcosystemPath(hub as EcosystemHubSlug);
}

interface VehicleHubState {
  activeHub: HubCategorySlug;
  activeCondition: VehicleConditionSlug;
  setActiveHub: (hub: HubCategorySlug) => void;
  setActiveCondition: (condition: VehicleConditionSlug) => void;
  setBuyContext: (hub: HubCategorySlug, condition: VehicleConditionSlug) => void;
}

export const useVehicleHubStore = create<VehicleHubState>()(
  persist(
    (set) => ({
      activeHub: "cars",
      activeCondition: "used",
      setActiveHub: (activeHub) => set({ activeHub }),
      setActiveCondition: (activeCondition) => set({ activeCondition }),
      setBuyContext: (activeHub, activeCondition) => set({ activeHub, activeCondition }),
    }),
    { name: "motorcart-vehicle-hub" }
  )
);
