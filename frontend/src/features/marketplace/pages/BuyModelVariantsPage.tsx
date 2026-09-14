import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, GitBranch, Images, Palette } from "lucide-react";
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
import { formatPriceLakhs } from "@/features/new-cars/lib/format-price-lakhs";
import { useVehicleHubStore } from "@/store/vehicleHubStore";

type VariantFilter = "all" | "petrol" | "diesel" | "electric" | "automatic" | "manual";

function matchesFilter(v: CatalogVariantCard, filter: VariantFilter): boolean {
  if (filter === "all") return true;
  const fuel = (v.fuelType ?? "").toLowerCase();
  const tx = (v.transmission ?? "").toLowerCase();
  if (filter === "petrol") return fuel.includes("petrol");
  if (filter === "diesel") return fuel.includes("diesel");
  if (filter === "electric") return fuel.includes("electric") || fuel.includes("ev");
  if (filter === "automatic") return /auto|amt|cvt|dct|ivt/.test(tx);
  if (filter === "manual") return tx.includes("manual");
  return true;
}

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
  const [bodyType, setBodyType] = useState<string | undefined>();
  const [priceFrom, setPriceFrom] = useState<number | null>(null);
  const [variants, setVariants] = useState<CatalogVariantCard[]>([]);
  const [noVariantCount, setNoVariantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VariantFilter>("all");

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
      setBodyType(match?.bodyType);
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
      title: `${brand} ${modelName} — Price, Variants & Offers | Motorcart`,
      description: `Explore ${brand} ${modelName} variants, ex-showroom price and dealer offers on Motorcart.`,
    });
  }, [brand, modelName]);

  const displayModel = modelName || modelSlug?.replace(/-/g, " ") || "";

  const priceHigh = useMemo(() => {
    const priced = variants.map((v) => v.priceFrom).filter((p): p is number => p != null && p > 0);
    if (!priced.length) return null;
    return Math.max(...priced);
  }, [variants]);

  const priceLow = useMemo(() => {
    const priced = variants.map((v) => v.priceFrom).filter((p): p is number => p != null && p > 0);
    if (!priced.length) return priceFrom;
    const min = Math.min(...priced);
    if (priceFrom != null && priceFrom > 0) return Math.min(min, priceFrom);
    return min;
  }, [variants, priceFrom]);

  const priceRangeLabel =
    priceLow != null && priceLow > 0
      ? priceHigh != null && priceHigh > priceLow
        ? `${formatPriceLakhs(priceLow)} - ${formatPriceLakhs(priceHigh)}*`
        : `${formatPriceLakhs(priceLow)}*`
      : "Price on request";

  const filtered = useMemo(
    () => variants.filter((v) => matchesFilter(v, filter)),
    [variants, filter],
  );

  const fuelChips = useMemo(() => {
    const chips: { id: VariantFilter; label: string }[] = [{ id: "all", label: "All Version" }];
    const fuels = new Set(variants.map((v) => (v.fuelType ?? "").toLowerCase()).filter(Boolean));
    const txs = new Set(variants.map((v) => (v.transmission ?? "").toLowerCase()).filter(Boolean));
    if ([...fuels].some((f) => f.includes("petrol"))) chips.push({ id: "petrol", label: "Petrol" });
    if ([...fuels].some((f) => f.includes("diesel"))) chips.push({ id: "diesel", label: "Diesel" });
    if ([...fuels].some((f) => f.includes("electric") || f.includes("ev"))) {
      chips.push({ id: "electric", label: "Electric" });
    }
    if ([...txs].some((t) => /auto|amt|cvt|dct|ivt/.test(t))) {
      chips.push({ id: "automatic", label: "Automatic" });
    }
    if ([...txs].some((t) => t.includes("manual"))) chips.push({ id: "manual", label: "Manual" });
    return chips;
  }, [variants]);

  if (!hub || !condition || !brandSlug || !modelSlug) {
    return <Navigate to="/buy" replace />;
  }

  const hubLabel = hubCategoryLabel(hub);
  const modelListingsHref = buyFilteredListingsPath(hub, condition, {
    brand,
    model: displayModel,
  });
  const variantsAnchor = "#variants";

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur">
        <div className="container flex gap-1 overflow-x-auto py-0 text-sm">
          {[
            { id: "overview", label: displayModel || "Overview", href: "#overview" },
            { id: "variants", label: "Variants", href: variantsAnchor },
            { id: "price", label: "Price", href: variantsAnchor },
            { id: "offers", label: "Offers", href: variantsAnchor },
          ].map((tab, i) => (
            <a
              key={tab.id}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 font-semibold transition-colors",
                i === 0
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      <div id="overview" className="border-b border-border/60 bg-card">
        <div className="container py-6 md:py-8">
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border/50 bg-[#eef1f4] shadow-sm">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : heroImage ? (
                <img
                  src={heroImage}
                  alt={`${brand} ${displayModel}`}
                  className="h-full w-full object-contain object-center p-4 md:p-6"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {brand} {displayModel}
                </div>
              )}
            </div>

            <div className="flex min-h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={buyListingPath(hub, condition)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Change Car
                </Link>
                {bodyType ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {bodyType}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                {brand} {displayModel}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {brand} {displayModel}
                {bodyType ? ` is a ${bodyType}` : ""} available in{" "}
                {variants.length || Math.max(1, noVariantCount)} variant
                {(variants.length || noVariantCount) === 1 ? "" : "s"} with live dealer stock on Motorcart.
                Compare trims and get the best offer near you.
              </p>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                  {priceRangeLabel}
                </p>
                <Link to={modelListingsHref} className="text-sm font-semibold text-primary hover:underline">
                  On-road price & stock
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-background px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Colours</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary/70" />
                    <span className="text-sm font-semibold text-foreground">See on listing</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gallery</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Images className="h-5 w-5 text-primary/70" />
                    <span className="text-sm font-semibold text-foreground">
                      {variants.filter((v) => v.image).length || 0}+ photos
                    </span>
                  </div>
                </div>
              </div>

              <Button className="mt-6 h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-primary)]" asChild>
                <a href={variantsAnchor}>View Offers</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div id="variants" className="container py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              {brand} {displayModel} Variants
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by fuel or transmission, then open dealer offers for that trim.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {fuelChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    filter === chip.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
                ))}
              </div>
            ) : variants.length === 0 && noVariantCount === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <GitBranch className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-semibold">No variants listed yet</p>
                <Button className="mt-4 rounded-xl" asChild>
                  <Link to={modelListingsHref}>Browse stock</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {noVariantCount > 0 ? (
                  <Link
                    to={modelListingsHref}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <span>
                      {noVariantCount} listing{noVariantCount === 1 ? "" : "s"} without variant label
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : null}

                {filtered.length === 0 ? (
                  <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                    No variants match this filter.
                  </p>
                ) : (
                  filtered.map((v) => {
                    const href =
                      v.detailSlug && v.count === 1
                        ? buyDetailPath(hub, condition, v.detailSlug)
                        : buyFilteredListingsPath(hub, condition, {
                            brand,
                            model: displayModel,
                            variant: v.variant,
                          });
                    const specs = [v.fuelType, v.transmission, v.count ? `${v.count} in stock` : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div
                        key={v.slug}
                        className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-foreground">
                            {displayModel} {v.variant}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{specs || "Dealer stock"}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2 md:flex-row md:items-center">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Ex-showroom
                            </p>
                            <p className="text-base font-extrabold tabular-nums text-foreground">
                              {v.priceFrom != null && v.priceFrom > 0
                                ? formatCurrency(v.priceFrom)
                                : "Price on request"}
                            </p>
                          </div>
                          <Button className="h-10 min-w-[7.5rem] rounded-xl font-semibold" asChild>
                            <Link to={href}>View Offers</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold text-foreground">Explore {displayModel}</p>
              </div>
              <div className="divide-y divide-border">
                <a
                  href={variantsAnchor}
                  className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <span>Variants</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
                <Link
                  to={modelListingsHref}
                  className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <span>All stock</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  to={buyBrandModelsPath(hub, condition, brand)}
                  className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <span>{brand} models</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  to={buyListingPath(hub, condition)}
                  className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <span>New cars</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-primary px-4 py-5 text-primary-foreground shadow-[var(--shadow-primary)]">
              <p className="text-sm font-bold">Get the best deal</p>
              <p className="mt-1 text-xs text-primary-foreground/85">
                Compare dealer offers and EMI for {brand} {displayModel}.
              </p>
              <Button
                variant="secondary"
                className="mt-4 h-10 w-full rounded-xl font-semibold"
                asChild
              >
                <Link to={modelListingsHref}>View dealer stock</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
