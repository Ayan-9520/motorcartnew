import { Link } from "react-router-dom";
import { Calculator, ChevronRight, GitCompare, Landmark, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { vehicleLoanPath } from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";
import { cn } from "@/lib/utils";

type MarketplaceVehicleToolsProps = {
  vehicle: VehicleListing;
  emi: number;
  inCompare: boolean;
  onToggleCompare: () => void;
  /** Sidebar on detail page — 2×2 compact grid (never 4 columns) */
  variant?: "sidebar" | "full";
};

export function MarketplaceVehicleTools({
  vehicle,
  emi,
  inCompare,
  onToggleCompare,
  variant = "sidebar",
}: MarketplaceVehicleToolsProps) {
  const isSidebar = variant === "sidebar";

  const tiles = [
    {
      key: "emi",
      icon: Calculator,
      label: "EMI calculator",
      hint: isSidebar ? formatCurrency(emi) + "/mo" : `From ${formatCurrency(emi)}/mo`,
      href: `/finance/tools?price=${vehicle.price}`,
      external: true,
    },
    {
      key: "loan",
      icon: Landmark,
      label: "Check eligibility",
      hint: "Pre-approved",
      href: vehicleLoanPath(vehicle),
      external: true,
    },
    {
      key: "compare",
      icon: GitCompare,
      label: inCompare ? "In compare" : "Add to compare",
      hint: "Up to 4",
      onClick: onToggleCompare,
      active: inCompare,
    },
    {
      key: "dealer",
      icon: ShieldCheck,
      label: "Dealer profile",
      hint: vehicle.dealerName.split(" ")[0] ?? "Verified",
      href: vehicle.dealerSlug ? `/dealers/${vehicle.dealerSlug}` : "/dealers/browse",
      external: true,
    },
  ];

  return (
    <div className={cn("vm-detail-tools", isSidebar && "vm-detail-tools--sidebar")}>
      {tiles.map((t) => {
        const Icon = t.icon;
        const content = (
          <>
            <span className="vm-tool-card__icon">
              <Icon className="h-4 w-4" />
            </span>
            <span className="vm-tool-card__body">
              <span className="vm-tool-card__label">{t.label}</span>
              <span className="vm-tool-card__hint">{t.hint}</span>
            </span>
            <ChevronRight className="vm-tool-card__arrow h-4 w-4 shrink-0 opacity-40" />
          </>
        );

        const className = cn("vm-tool-card", t.active && "vm-tool-card--active");

        if (t.onClick) {
          return (
            <button key={t.key} type="button" className={className} onClick={t.onClick}>
              {content}
            </button>
          );
        }

        return (
          <Link key={t.key} to={t.href!} className={className}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
