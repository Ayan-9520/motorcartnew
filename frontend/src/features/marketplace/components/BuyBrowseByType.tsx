import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BUY_BODY_TYPES } from "../data/buy-brands";
import { HUB_BUDGET_PRESETS } from "../data/hub-filter-catalog";
import { getHubCopy } from "../data/marketplace-hub-config";
import { buyListingPath } from "../lib/route-utils";
import type { HubCategorySlug, VehicleConditionSlug } from "../types";

type Props = {
  hub: HubCategorySlug;
  condition: VehicleConditionSlug;
  className?: string;
};

export function BuyBrowseByType({ hub, condition, className }: Props) {
  const [activeType, setActiveType] = useState("suv");
  const showBody = hub === "cars" || hub === "ev";
  const budgets = HUB_BUDGET_PRESETS[hub] ?? HUB_BUDGET_PRESETS.cars;
  const base = buyListingPath(hub, condition);
  const copy = getHubCopy(hub);

  return (
    <section className={cn("buy-types", className)}>
      {showBody && (
        <>
          <h2 className="buy-types-title">{copy.plural} by Type</h2>
          <div className="buy-types-pills" role="tablist" aria-label="Body type">
            {BUY_BODY_TYPES.map((t) => {
              const active = activeType === t.id;
              const href =
                t.id === "all"
                  ? base
                  : `${base}?bodyType=${encodeURIComponent(t.label)}`;
              return (
                <Link
                  key={t.id}
                  to={href}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveType(t.id)}
                  className={cn("buy-types-pill", active && "buy-types-pill-active")}
                >
                  {t.id === "all" ? `All ${copy.plural}` : t.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <h2 className={cn("buy-types-title", showBody && "mt-8")}>Browse by Budget</h2>
      <div className="buy-budget-row">
        {budgets.map((b) => {
          const params = new URLSearchParams();
          if (b.priceMin != null) params.set("priceMin", String(b.priceMin));
          if (b.priceMax != null) params.set("priceMax", String(b.priceMax));
          const qs = params.toString();
          return (
            <Link
              key={b.label}
              to={qs ? `${base}?${qs}` : base}
              className="buy-budget-chip"
            >
              {b.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
