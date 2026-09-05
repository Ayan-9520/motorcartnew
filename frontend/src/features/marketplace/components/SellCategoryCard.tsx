import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  Tractor,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SellHubCategoryItem } from "../types";
import { sellListingPath } from "../lib/route-utils";

const ICONS: Record<string, LucideIcon> = {
  Car,
  Bike,
  Truck,
  Bus,
  CarTaxiFront,
  Tractor,
  Zap,
};

export function SellCategoryCard({
  item,
  featured = false,
}: {
  item: SellHubCategoryItem;
  featured?: boolean;
}) {
  const Icon = ICONS[item.icon] ?? Car;

  return (
    <Link
      to={sellListingPath(item.id)}
      className={cn(
        "sell-category-card group block",
        featured && "sell-category-card--featured"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="hub-category-icon sell-category-icon">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {item.label}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          <p className="mt-2 text-[11px] font-medium text-primary">{item.hint}</p>
        </div>
      </div>
      <span className="sell-category-cta">
        Sell {item.label.toLowerCase()}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
