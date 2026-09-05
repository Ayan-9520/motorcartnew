import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, GitBranch } from "lucide-react";
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
  buyBrandModelsPath,
  buyFilteredListingsPath,
  loadBrandModels,
  loadModelVariants,
  resolveBrandLabel,
  type CatalogVariantCard,
} from "../lib/buy-catalog-flow";
import { useVehicleHubStore } from "@/store/vehicleHubStore";

export function BuyModelVariantsPage() {
  const { category, condition: condParam, brandSlug, modelSlug } = useParams<{
    category: string;
    condition: string;
    brandSlug: string;
    modelSlug: string;
  }>();
  const hub = parseHubCategorySlug(category);
  const condition = parseConditionSlug(condParam);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);

  const brand = hub && brandSlug ? resolveBrandLabel(hub, brandSlug) : "";
  const [modelName, setModelName] = useState("");
  const [variants, setVariants] = useState<CatalogVariantCard[]>([]);
  const [noVariantCount, setNoVariantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hub || !condition) return;
    setBuyContext(hub, condition);
  }, [hub, condition, setBuyContext]);

  useEffect(() => {
    if (!hub || !condition || !brand || !modelSlug) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const models = await loadBrandModels(hub, condition, brand);
      if (cancelled) return;
      const match = models.find((m) => m.slug === modelSlug);
      const resolvedModel = match?.model ?? modelSlug.replace(/-/g, " ");
      setModelName(resolvedModel);

      const result = await loadModelVariants(hub, condition, brand, resolvedModel);
      if (cancelled) return;
      setVariants(result.variants);
      setNoVariantCount(result.listingsWithoutVariant);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hub, condition, brand, modelSlug]);

  useEffect(() => {
    if (!brand || !modelName) return;
    setPageMeta({
      title: `${brand} ${modelName} variants — Buy on Motorcart`,
      description: `Choose a ${brand} ${modelName} variant, then see live dealer stock on Motorcart.`,
    });
  }, [brand, modelName]);

  if (!hub || !condition || !brandSlug || !modelSlug) {
    return <Navigate to="/buy" replace />;
  }

  const hubLabel = hubCategoryLabel(hub);
  const displayModel = modelName || modelSlug.replace(/-/g, " ");
  const modelListingsHref = buyFilteredListingsPath(hub, condition, {
    brand,
    model: displayModel,
  });

  return (
    <div className="buy-flow-page min-h-screen">
      <div className="buy-flow-hero">
        <div className="container py-8 md:py-10">
          <nav className="buy-flow-crumb">
            <Link to="/buy">Buy</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={buyListingPath(hub, condition)}>{hubLabel}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={buyBrandModelsPath(hub, condition, brand)}>{brand}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{displayModel}</span>
          </nav>
          <p className="buy-flow-eyebrow">Step 2 of 3 · Choose variant</p>
          <h1 className="buy-flow-title">
            {brand} {displayModel}
          </h1>
          <p className="buy-flow-sub">Select a variant to see matching dealer listings.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={buyBrandModelsPath(hub, condition, brand)}>All {brand} models</Link>
            </Button>
            <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
              <Link to={modelListingsHref}>View all {displayModel} listings</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-10">
        {loading ? (
          <div className="buy-flow-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : variants.length === 0 && noVariantCount === 0 ? (
          <div className="buy-flow-empty">
            <GitBranch className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No variants listed yet</p>
            <Button className="mt-4 rounded-xl" asChild>
              <Link to={modelListingsHref}>Browse {displayModel} stock</Link>
            </Button>
          </div>
        ) : (
          <>
            {noVariantCount > 0 && (
              <Link to={modelListingsHref} className="buy-flow-skip mb-4">
                {noVariantCount} listing{noVariantCount === 1 ? "" : "s"} without variant label —
                view all {displayModel}
              </Link>
            )}
            <div className="buy-flow-grid">
              {variants.map((v) => (
                <Link
                  key={v.slug}
                  to={buyFilteredListingsPath(hub, condition, {
                    brand,
                    model: displayModel,
                    variant: v.variant,
                  })}
                  className="buy-flow-card"
                >
                  <span className="buy-flow-card-media buy-flow-card-media-sm">
                    {v.image ? (
                      <img src={v.image} alt="" className="buy-flow-card-img" loading="lazy" />
                    ) : (
                      <span className="buy-flow-card-placeholder">{v.variant.charAt(0)}</span>
                    )}
                  </span>
                  <span className="buy-flow-card-body">
                    <span className="buy-flow-card-title">{v.variant}</span>
                    <span className="buy-flow-card-meta">
                      {v.count} listing{v.count === 1 ? "" : "s"}
                      {v.fuelType ? ` · ${v.fuelType}` : ""}
                      {v.transmission ? ` · ${v.transmission}` : ""}
                    </span>
                    <span className="buy-flow-card-price">
                      {v.priceFrom != null && v.priceFrom > 0
                        ? `From ${formatCurrency(v.priceFrom)}`
                        : "Price on request"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
