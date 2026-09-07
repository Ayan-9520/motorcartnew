import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export type SuperAdminStat = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  format?: "currency" | "number";
  /** When set, the card navigates to this admin route on click. */
  to?: string;
};

export function SuperAdminStatGrid({ stats }: { stats: SuperAdminStat[] }) {
  return (
    <div className="sa-stats">
      {stats.map((s) => {
        const Icon = s.icon;
        const display =
          s.format === "currency" && typeof s.value === "number"
            ? formatCurrency(s.value)
            : s.value;
        const body = (
          <>
            <div className="sa-stat__top">
              <span className="sa-stat__label">{s.label}</span>
              {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary/80" aria-hidden /> : null}
            </div>
            <p className="sa-stat__value">{display}</p>
            {s.hint ? <p className="sa-stat__hint">{s.hint}</p> : null}
          </>
        );

        if (s.to) {
          return (
            <Link
              key={s.label}
              to={s.to}
              className={cn("sa-stat", "sa-stat--link")}
              aria-label={`Open ${s.label}`}
            >
              {body}
            </Link>
          );
        }

        return (
          <div key={s.label} className="sa-stat">
            {body}
          </div>
        );
      })}
    </div>
  );
}
