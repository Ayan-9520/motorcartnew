import { Link } from "react-router-dom";
import {
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  LayoutGrid,
  Tractor,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_HUB_ENTRIES } from "@/lib/vehicle-hub-catalog";
import type { HubCategorySlug } from "@/features/marketplace/types";

const HUB_ICONS: Record<HubCategorySlug, LucideIcon> = {
  cars: Car,
  bikes: Bike,
  trucks: Truck,
  buses: Bus,
  auto: CarTaxiFront,
  equipment: Tractor,
  ev: Zap,
};

type VehicleHubFilterRailProps = {
  activeHub: HubCategorySlug | null;
  buildHref: (hub: HubCategorySlug | null) => string;
  className?: string;
  variant?: "cards" | "icons";
  ariaLabel?: string;
};

export function VehicleHubFilterRail({
  activeHub,
  buildHref,
  className,
  variant = "icons",
  ariaLabel = "Filter by vehicle type",
}: VehicleHubFilterRailProps) {
  if (variant === "icons") {
    return (
      <div className={cn("vehicle-hub-rail-wrap", className)}>
        <nav
          className="vehicle-hub-rail vehicle-hub-rail--icons"
          aria-label={ariaLabel}
        >
          <Link
            to={buildHref(null)}
            className={cn(
              "vehicle-hub-icon-pill",
              activeHub === null && "vehicle-hub-icon-pill--active"
            )}
          >
            <span className="vehicle-hub-icon-pill__icon" aria-hidden>
              <LayoutGrid className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <span className="vehicle-hub-icon-pill__label">All types</span>
          </Link>
          {VEHICLE_HUB_ENTRIES.map((h) => {
            const Icon = HUB_ICONS[h.id];
            const active = activeHub === h.id;
            return (
              <Link
                key={h.id}
                to={buildHref(h.id)}
                title={`${h.label} — ${h.tagline}`}
                className={cn("vehicle-hub-icon-pill", active && "vehicle-hub-icon-pill--active")}
              >
                <span className="vehicle-hub-icon-pill__icon" aria-hidden>
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span className="vehicle-hub-icon-pill__label">{h.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <nav
      className={cn(
        "vehicle-hub-rail flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label={ariaLabel}
    >
      <Link
        to={buildHref(null)}
        className={cn(
          "vehicle-hub-rail-item vehicle-hub-rail-all snap-start rounded-xl border text-center text-xs font-semibold transition-all",
          activeHub === null
            ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-primary)]"
            : "border-border/80 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground"
        )}
      >
        All types
      </Link>
      {VEHICLE_HUB_ENTRIES.map((h) => {
        const active = activeHub === h.id;
        return (
          <Link
            key={h.id}
            to={buildHref(h.id)}
            title={`${h.label} — ${h.tagline}`}
            className={cn(
              "vehicle-hub-rail-item group snap-start flex w-[5.75rem] shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-all sm:w-[6.5rem]",
              active
                ? "border-primary ring-2 ring-primary/30 shadow-[var(--shadow-card)]"
                : "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
            )}
          >
            <div className="relative aspect-[5/3] w-full overflow-hidden bg-muted">
              <img
                src={h.heroImage}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              {active ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent py-1 text-center text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  Active
                </span>
              ) : null}
            </div>
            <div className="px-1.5 py-1.5">
              <p className="truncate text-[11px] font-bold leading-tight text-foreground">{h.label}</p>
              <p className="truncate text-[9px] text-muted-foreground">{h.tagline}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
