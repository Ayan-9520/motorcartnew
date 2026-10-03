import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AUCTION_ASSET_CATEGORIES } from "../data/auction-hub-data";
import { auctionAssetClass } from "../lib/auction-utils";
import type { AuctionListing } from "../types";

type AuctionAssetCategoryGridProps = {
  /** Live + upcoming lots used for the per-category counts. */
  auctions?: AuctionListing[];
  loading?: boolean;
};

export function AuctionAssetCategoryGrid({ auctions = [], loading = false }: AuctionAssetCategoryGridProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of auctions) {
      const key = auctionAssetClass(a);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [auctions]);

  return (
    <section className="container pb-14">
      <div className="auction-hub-category-header">
        <h2 className="auction-hub-section-title text-primary">Browse by vehicle type</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Cars, bikes, trucks, buses, tractors &amp; construction equipment — live &amp; upcoming lots across India.
        </p>
      </div>

      <div className="auction-category-grid">
        {AUCTION_ASSET_CATEGORIES.map((cat) => {
          const n = counts[cat.id] ?? 0;
          return (
            <Link key={cat.id} to={cat.href} className="auction-category-card group">
              <img src={cat.image} alt={cat.label} loading="lazy" className="auction-category-bg" />
              <span className="auction-category-overlay" />
              <span className="auction-category-content">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  {loading ? "\u00a0" : n > 0 ? `${n} ${n === 1 ? "lot" : "lots"}` : "Coming soon"}
                </span>
                <span className="text-lg font-bold text-white md:text-xl">{cat.label}</span>
                <span className="text-xs text-white/85">{cat.subtitle}</span>
                <span className="auction-category-cta">
                  View all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
