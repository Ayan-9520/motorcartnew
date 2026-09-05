import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Layers } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  buyListingPath,
  hubCategoryLabel,
  parseConditionSlug,
  parseHubCategorySlug,
} from "../lib/route-utils";
import {
  buyFilteredListingsPath,
  buyModelVariantsPath,
  loadBrandModels,
  resolveBrandLabel,
  type CatalogModelCard,
} from "../lib/buy-catalog-flow";
import { useVehicleHubStore } from "@/store/vehicleHubStore";

export function BuyBrandModelsPage() {
  const { category, condition: condParam, brandSlug } = useParams<{
    category: string;
    condition: string;
    brandSlug: string;
  }>();
  const hub = parseHubCategorySlug(category);
  const condition = parseConditionSlug(condParam);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);

  const brand = hub && brandSlug ? resolveBrandLabel(hub, brandSlug) : "";
  const [models, setModels] = useState<CatalogModelCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hub || !condition) return;
    setBuyContext(hub, condition);
  }, [hub, condition, setBuyContext]);

  useEffect(() => {
    if (!hub || !condition || !brand) return;
    let cancelled = false;
    setLoading(true);
    void loadBrandModels(hub, condition, brand).then((rows) => {
      if (cancelled) return;
      setModels(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hub, condition, brand]);

  useEffect(() => {
    if (!brand) return;
    setPageMeta({
      title: `${brand} models — Buy on Motorcart`,
      description: `Browse ${brand} models, then pick a variant and dealer listing on Motorcart.`,
    });
  }, [brand]);

  if (!hub || !condition || !brandSlug) {
    return <Navigate to="/buy" replace />;
  }

  const hubLabel = hubCategoryLabel(hub);
  const allListingsHref = buyFilteredListingsPath(hub, condition, { brand });

  return (
    <div className="buy-flow-page min-h-screen">
      <div className="buy-flow-hero">
        <div className="container py-8 md:py-10">
          <nav className="buy-flow-crumb">
            <Link to="/buy">Buy</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={buyListingPath(hub, condition)}>{hubLabel}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{brand}</span>
          </nav>
          <p className="buy-flow-eyebrow">Step 1 of 3 · Choose model</p>
          <h1 className="buy-flow-title">{brand} models</h1>
          <p className="buy-flow-sub">
            Pick a model, then choose a variant — then see dealer listings.
          </p>
          <div className="mt-4">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={allListingsHref}>View all {brand} listings</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-10">
        {loading ? (
          <div className="buy-flow-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="buy-flow-empty">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No {brand} models in stock yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dealers can upload inventory — check back soon.
            </p>
            <Button className="mt-4 rounded-xl" asChild>
              <Link to="/buy">Back to brands</Link>
            </Button>
          </div>
        ) : (
          <div className="buy-flow-grid">
            {models.map((m) => (
              <Link
                key={m.slug}
                to={buyModelVariantsPath(hub, condition, brand, m.model)}
                className="buy-flow-card"
              >
                <span className="buy-flow-card-media">
                  {m.image ? (
                    <img src={m.image} alt="" className="buy-flow-card-img" loading="lazy" />
                  ) : (
                    <span className="buy-flow-card-placeholder">{m.model.charAt(0)}</span>
                  )}
                </span>
                <span className="buy-flow-card-body">
                  <span className="buy-flow-card-title">{m.model}</span>
                  <span className="buy-flow-card-meta">
                    {m.count} listing{m.count === 1 ? "" : "s"}
                    {m.bodyType ? ` · ${m.bodyType}` : ""}
                  </span>
                  <span className="buy-flow-card-price">
                    {m.priceFrom != null && m.priceFrom > 0
                      ? `From ${formatCurrency(m.priceFrom)}`
                      : "Price on request"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
