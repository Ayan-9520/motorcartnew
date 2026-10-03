import { Link } from "react-router-dom";
import { ArrowRight, FileCheck, GitCompare } from "lucide-react";
import {
  Bike,
  Car,
  CarFront,
  Landmark,
  RefreshCw,
  Shield,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceHubCategoryItem } from "../data/finance-hub-categories";
import { financeApplyPath, financeComparePath } from "../lib/finance-hub-routes";

const ICONS: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Bike,
  Truck,
  Zap,
  RefreshCw,
  Shield,
  Landmark,
};

export function FinanceHubCard({
  item,
  compact = true,
  rateFrom,
}: {
  item: FinanceHubCategoryItem;
  compact?: boolean;
  /** e.g. "7.45%" — lowest published rate for this product */
  rateFrom?: string | null;
}) {
  const Icon = ICONS[item.icon] ?? Car;

  return (
    <article className={cn("buy-hub-card finance-hub-card group h-full", compact && "buy-hub-card-compact")}>
      <div className="buy-hub-card-glow finance-hub-card-glow" aria-hidden />
      <div className={cn("buy-hub-card-inner", compact && "p-3.5")}>
        <div className={cn("buy-hub-card-head", compact && "gap-3")}>
          <span className={cn("buy-hub-card-icon finance-hub-card-icon", compact && "h-11 w-11")}>
            <Icon className={cn(compact ? "h-5 w-5" : "h-7 w-7")} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={cn("font-bold tracking-tight text-foreground", compact ? "text-sm" : "text-lg")}>
              {item.label}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {item.description}
            </p>
            {rateFrom ? (
              <p className="fin-rate-from mt-1.5">
                from <strong>{rateFrom}</strong> p.a.
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn("buy-hub-card-divider", compact && "my-2.5")} />

        <div className="grid grid-cols-2 gap-2">
          <FinanceActionTile
            to={financeComparePath(item.id)}
            label="Compare"
            stat={item.stats.compare}
            variant="compare"
            compact={compact}
          />
          <FinanceActionTile
            to={financeApplyPath(item.id)}
            label="Apply"
            stat={item.stats.apply}
            variant="apply"
            compact={compact}
          />
        </div>
      </div>
    </article>
  );
}

function FinanceActionTile({
  to,
  label,
  stat,
  variant,
  compact,
}: {
  to: string;
  label: string;
  stat: string;
  variant: "compare" | "apply";
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "buy-hub-pill group/pill",
        variant === "compare" ? "finance-hub-pill-compare" : "finance-hub-pill-apply",
        compact && "p-2.5"
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span className={cn("flex items-center gap-1 font-semibold", compact ? "text-xs" : "text-sm")}>
          {variant === "compare" ? (
            <GitCompare className="h-3.5 w-3.5 text-primary" />
          ) : (
            <FileCheck className="h-3.5 w-3.5 text-primary" />
          )}
          {label}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-30 transition-all group-hover/pill:translate-x-0.5 group-hover/pill:opacity-100" />
      </span>
      <span className="mt-1 block text-[10px] font-medium text-muted-foreground">{stat}</span>
    </Link>
  );
}
