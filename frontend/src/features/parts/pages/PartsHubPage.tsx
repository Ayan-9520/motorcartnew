import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Package, ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setPageMeta } from "@/utils/seo";
import { usePartsCartStore } from "@/store/partsCartStore";
import { PartsHubHero } from "../components/PartsHubHero";
import { PartsServicesStrip } from "../components/PartsServicesStrip";
import { PartsHubCategoryCard } from "../components/PartsHubCategoryCard";
import { PartsBrandStrip } from "../components/PartsBrandStrip";
import { PartCard } from "../components/PartCard";
import { PartsAiRecommendations } from "../components/PartsAiRecommendations";
import { PartsCatalogEmpty } from "../components/PartsCatalogEmpty";
import { PART_CATEGORIES, partsBrowsePath } from "../data/parts-hub-data";
import { recommendParts } from "../lib/ai-parts";
import { usePartsList } from "../hooks/usePartsList";
import { parseVehicleHubParam, partMatchesVehicleHub, VEHICLE_HUB_ENTRIES } from "@/lib/vehicle-hub-catalog";
import { X } from "lucide-react";

export function PartsHubPage() {
  const [params] = useSearchParams();
  const hub = useMemo(() => parseVehicleHubParam(params.get("hub")), [params]);
  const hubSuffix = hub ? `?hub=${hub}` : "";

  const cartCount = usePartsCartStore((s) => s.itemCount());
  const { parts: allParts, loading } = usePartsList(undefined, "", null);

  const parts = useMemo(
    () => (hub ? allParts.filter((p) => partMatchesVehicleHub(p, hub)) : allParts),
    [allParts, hub]
  );

  const featured = useMemo(() => parts.filter((p) => p.isFeatured).slice(0, 8), [parts]);

  const aiPicks = useMemo(() => recommendParts(parts, { hub }, 6), [hub, parts]);

  const displayParts = featured.length ? featured : parts.slice(0, 8);
  const showEmpty = !loading && displayParts.length === 0;
  const showBrands = allParts.length > 0;

  const hubLabel = hub ? VEHICLE_HUB_ENTRIES.find((e) => e.id === hub)?.label : null;

  useEffect(() => {
    setPageMeta({
      title: hubLabel ? `${hubLabel} parts — Motorcart` : "Auto Parts Marketplace — Motorcart",
      description:
        "Premium B2B & retail spare parts for every vehicle class — GST invoice, wholesale, COD, AI fitment & fast delivery across India.",
    });
  }, [hubLabel]);

  return (
    <div className="parts-hub-page min-h-screen">
      <PartsHubHero skuCount={allParts.length} />

      {hubLabel ? (
        <div className="container -mt-3 mb-1 flex justify-center px-4">
          <span className="parts-hub-filter-chip">
            {hubLabel} parts
            <Link to="/parts" className="parts-hub-filter-chip__clear" aria-label="Clear vehicle filter">
              <X className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
      ) : null}

      {cartCount > 0 ? (
        <div className="container -mt-4 mb-2 flex justify-center">
          <Link to="/cart" className="parts-hub-stat-pill border-primary/40 bg-primary/10 text-primary shadow-[var(--shadow-primary)]">
            <ShoppingCart className="h-3.5 w-3.5" />
            <strong>{cartCount}</strong> in cart
          </Link>
        </div>
      ) : null}

      <PartsServicesStrip />

      <section className="container pb-10 pt-2">
        <div className="parts-hub-section-head mb-6">
          <div>
            <p className="parts-hub-section-eyebrow">Catalogue</p>
            <h2 className="parts-hub-section-title">Shop by category</h2>
            <p className="parts-hub-section-desc mt-1">
              9 verticals · OEM &amp; aftermarket{hubLabel ? ` · filtered for ${hubLabel}` : ""}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={partsBrowsePath({ hub: hub ?? undefined })}>
              Full catalogue <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="parts-hub-category-grid">
          {PART_CATEGORIES.map((cat) => (
            <PartsHubCategoryCard key={cat.slug} category={cat} searchSuffix={hubSuffix} />
          ))}
        </div>
      </section>

      {showBrands ? <PartsBrandStrip browseHref={partsBrowsePath({ hub: hub ?? undefined })} /> : null}

      <section className="container border-t border-border/60 pb-10 pt-10">
        <PartsAiRecommendations parts={aiPicks} title="PartsBot — AI matched for your garage" />

        <div className="parts-hub-section-head mb-6 mt-10">
          <div>
            <p className="parts-hub-section-eyebrow">Deals</p>
            <h2 className="parts-hub-section-title">Featured deals</h2>
            <p className="parts-hub-section-desc mt-1">GST-inclusive · bulk MOQ shown</p>
          </div>
          <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
            <Link to={partsBrowsePath({ hub: hub ?? undefined })}>
              <Package className="mr-2 h-4 w-4" />
              Browse all SKUs
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="parts-product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : showEmpty ? (
          <PartsCatalogEmpty hubLabel={hubLabel} />
        ) : (
          <div className="parts-product-grid">
            {displayParts.map((part, i) => (
              <PartCard key={part.id} part={part} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="container pb-14">
        <div className="parts-fintech-banner">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Fintech for garages</p>
            <h3 className="mt-2 text-xl font-bold md:text-2xl">GST credit notes · pay later · dealer slabs</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Download invoices from orders, unlock wholesale after KYC, and split payments via finance partners.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl" asChild>
              <Link to="/login?redirect=/parts/browse">Unlock wholesale</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/dashboard/parts">
                <Store className="mr-2 h-4 w-4" />
                Sell as supplier
              </Link>
            </Button>
          </div>
        </div>

        <div className="parts-hub-footer-cta mt-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Need a quote for 50+ units? WhatsApp our parts desk.</p>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={partsBrowsePath({ hub: hub ?? undefined })}>Open catalogue</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
