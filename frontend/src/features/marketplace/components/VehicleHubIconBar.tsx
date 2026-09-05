import { useLocation, useNavigate } from "react-router-dom";
import {
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIMARY_VEHICLE_HUBS,
  hubEcosystemPath,
  resolveHubMarketplacePath,
  useVehicleHubStore,
} from "@/store/vehicleHubStore";
import { parseBuyMarketplaceRoute } from "../lib/route-utils";
import type { EcosystemHubSlug } from "@/features/ecosystem/types";
import type { HubCategorySlug } from "../types";
import { hubCategoryLabel } from "../lib/route-utils";
import { getHubCopy } from "../data/marketplace-hub-config";

const HUB_ICONS: Record<HubCategorySlug, LucideIcon> = {
  cars: Car,
  bikes: Bike,
  trucks: Truck,
  buses: Bus,
  auto: CarTaxiFront,
  equipment: Truck,
  ev: Zap,
};

type VehicleHubIconBarProps = {
  variant?: "nav" | "page" | "inline";
  className?: string;
  onNavigate?: () => void;
};

export function VehicleHubIconBar({
  variant = "page",
  className,
  onNavigate,
}: VehicleHubIconBarProps) {
  const activeHub = useVehicleHubStore((s) => s.activeHub);
  const activeCondition = useVehicleHubStore((s) => s.activeCondition);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const route = parseBuyMarketplaceRoute(pathname, new URLSearchParams(search));

  const onSelect = (hub: EcosystemHubSlug) => {
    const condition = route?.condition ?? activeCondition;
    setBuyContext(hub, condition);

    // Stay on Buy/Sell hub landing — update headline + brands for the selected icon
    if (pathname === "/buy" || pathname === "/sell") {
      window.dispatchEvent(
        new CustomEvent("motorcart:hub-change", { detail: { hub, condition } })
      );
      onNavigate?.();
      return;
    }

    const target =
      pathname.startsWith("/buy") ||
      pathname.startsWith("/sell") ||
      pathname.startsWith("/parts") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/new-cars") ||
      pathname.startsWith("/used-cars")
        ? resolveHubMarketplacePath(pathname, hub, condition, search)
        : hubEcosystemPath(hub);
    navigate(target);
    window.dispatchEvent(
      new CustomEvent("motorcart:hub-change", { detail: { hub, condition } })
    );
    onNavigate?.();
  };

  const isSellContext = pathname.startsWith("/sell");
  const condLabel = activeCondition === "new" ? "New" : "Pre-owned";

  return (
    <nav
      className={cn(
        "vehicle-hub-icon-bar",
        variant === "nav" && "vehicle-hub-icon-bar-nav",
        variant === "inline" && "vehicle-hub-icon-bar-inline",
        variant === "page" && "vehicle-hub-icon-bar-page",
        className
      )}
      aria-label="Vehicle ecosystems"
    >
      {PRIMARY_VEHICLE_HUBS.map((hub) => {
        const Icon = HUB_ICONS[hub];
        const isActive = route?.hub === hub || activeHub === hub;
        const copy = getHubCopy(hub);
        const title = isSellContext
          ? `Sell ${copy.plural.toLowerCase()} — Motorcart`
          : `Buy ${condLabel.toLowerCase()} ${copy.plural.toLowerCase()} — Motorcart`;

        return (
          <button
            key={hub}
            type="button"
            title={title}
            onClick={() => onSelect(hub)}
            aria-pressed={isActive}
            aria-label={title}
            className={cn("vehicle-hub-icon-btn", isActive && "vehicle-hub-icon-btn-active")}
          >
            <span className="vehicle-hub-icon-glyph">
              <Icon
                className={
                  variant === "inline" ? "h-3.5 w-3.5" : variant === "nav" ? "h-4 w-4" : "h-5 w-5"
                }
                strokeWidth={
                  variant === "inline"
                    ? isActive
                      ? 2.25
                      : 1.75
                    : variant === "nav"
                      ? isActive
                        ? 2.25
                        : 1.75
                      : isActive
                        ? 2.35
                        : 1.85
                }
              />
            </span>
            <span className="vehicle-hub-icon-label">{hubCategoryLabel(hub)}</span>
          </button>
        );
      })}
    </nav>
  );
}
