import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getBuyBrandsForHub, type BuyBrandItem } from "../data/buy-brands";
import { buyBrandModelsPath } from "../lib/buy-catalog-flow";
import type { HubCategorySlug, VehicleConditionSlug } from "../types";

type Props = {
  hub: HubCategorySlug;
  condition: VehicleConditionSlug;
  className?: string;
};

function BrandTile({
  brand,
  href,
}: {
  brand: BuyBrandItem;
  href: string;
}) {
  const [broken, setBroken] = useState(false);
  const showLogo = Boolean(brand.logo) && !broken;

  return (
    <Link to={href} className="buy-brand-tile" title={brand.name}>
      <span className="buy-brand-tile-icon">
        {showLogo ? (
          <img
            src={brand.logo}
            alt=""
            className="buy-brand-tile-img"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="buy-brand-tile-fallback" aria-hidden>
            {brand.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="buy-brand-tile-name">{brand.name}</span>
    </Link>
  );
}

export function BuyBrowseByBrand({ hub, condition, className }: Props) {
  const brands = getBuyBrandsForHub(hub);

  return (
    <section className={cn("buy-brands", className)}>
      <h2 className="buy-brands-title">Browse by Brand</h2>
      <div className="buy-brands-grid" role="list">
        {brands.map((b) => (
          <div key={b.id} role="listitem">
            <BrandTile brand={b} href={buyBrandModelsPath(hub, condition, b.brand)} />
          </div>
        ))}
      </div>
    </section>
  );
}
