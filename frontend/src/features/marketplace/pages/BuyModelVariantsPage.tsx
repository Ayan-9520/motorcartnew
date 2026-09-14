import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Fuel, GitBranch, Box } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  buyListingPath,
  hubCategoryLabel,
  parseConditionSlug,
  parseHubCategorySlug,
  buyDetailPath,
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
  const [heroImage, setHeroImage] = useState<string | undefined>();
  const [priceFrom, setPriceFrom] = useState<number | null>(null);
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
      setHeroImage(match?.image);
      setPriceFrom(match?.priceFrom ?? null);

      const result = await loadModelVariants(hub, condition, brand, resolvedModel);
      if (cancelled) return;
      setVariants(result.variants);
      setNoVariantCount(result.listingsWithoutVariant);
      if (!match?.image && result.variants[0]?.image) {
        setHeroImage(result.variants[0].image);
      }
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

  const displayModel = modelName || modelSlug?.replace(/-/g, " ") || "";
  const lowestPrice = useMemo(() => {
    const priced = variants
      .map((v) => v.priceFrom)
      .filter((p): p is number => p != null && p > 0);
    if (!priced.length) return priceFrom;
    return Math.min(...priced, ...(priceFrom != null && priceFrom > 0 ? [priceFrom] : []));
  }, [variants, priceFrom]);

  if (!hub || !condition || !brandSlug || !modelSlug) {
    return <Navigate to="/buy" replace />;
  }

  const hubLabel = hubCategoryLabel(hub);
  const modelListingsHref = buyFilteredListingsPath(hub, condition, {
    brand,
    model: displayModel,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/70 bg-card">
        <div className="container py-6 md:py-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link to="/buy" className="hover:text-primary">
              Buy
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={buyListingPath(hub, condition)} className="hover:text-primary">
              {hubLabel}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={buyBrandModelsPath(hub, condition, brand)} className="hover:text-primary">
              {brand}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{displayModel}</span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted lg:aspect-[16/9]">
              {loading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : heroImage ? (
                <img
                  src={heroImage}
                  alt={`${brand} ${displayModel}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {brand} {displayModel}
                </div>
              )}
            </div>
            <div className="space-y-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Choose variant</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {brand} {displayModel}
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick a trim to see live dealer price and stock — same flow as OEM / CarWale.
              </p>
              <p className="text-2xl font-bold text-primary">
                {lowestPrice != null && lowestPrice > 0
                  ? `From ${formatCurrency(lowestPrice)}`
                  : "Price on request"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={buyListingPath(hub, condition)}>← All models</Link>
                </Button>
                <Button variant="ghost" className="rounded-xl text-muted-foreground" asChild>
                  <Link to={modelListingsHref}>All {displayModel} stock</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 md:py-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {loading ? "Loading variants…" : `${variants.length || noVariantCount} variant${(variants.length || noVariantCount) === 1 ? "" : "s"}`}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : variants.length === 0 && noVariantCount === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No variants listed yet</p>
            <Button className="mt-4 rounded-xl" asChild>
              <Link to={modelListingsHref}>Browse {displayModel} stock</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {noVariantCount > 0 ? (
              <Link
                to={modelListingsHref}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <span>
                  {noVariantCount} listing{noVariantCount === 1 ? "" : "s"} without variant label
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
            <ul className="divide-y divide-border">
              {variants.map((v) => {
                const href =
                  v.detailSlug && v.count === 1
                    ? buyDetailPath(hub, condition, v.detailSlug)
                    : buyFilteredListingsPath(hub, condition, {
                        brand,
                        model: displayModel,
                        variant: v.variant,
                      });
                return (
                  <li key={v.slug}>
                    <Link
                      to={href}
                      className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/35 sm:gap-4 sm:px-5"
                    >
                      <span
                        className={cn(
                          "hidden h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:block",
                        )}
                      >
                        {v.image ? (
                          <img src={v.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs font-semibold text-muted-foreground">
                            {v.variant.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-[15px] font-semibold text-foreground group-hover:text-primary">
                          {v.variant}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {v.fuelType ? (
                            <span className="inline-flex items-center gap-1">
                              <Fuel className="h-3 w-3 text-primary/80" />
                              {v.fuelType}
                            </span>
                          ) : null}
                          {v.transmission ? (
                            <span className="inline-flex items-center gap-1">
                              <Box className="h-3 w-3 text-primary/80" />
                              {v.transmission}
                            </span>
                          ) : null}
                          <span>
                            {v.count} in stock
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold tabular-nums text-primary sm:text-base">
                          {v.priceFrom != null && v.priceFrom > 0
                            ? formatCurrency(v.priceFrom)
                            : "POR"}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground group-hover:text-primary">
                          Select
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
