import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Car, Package, Sparkles, Loader2 } from "lucide-react";
import { isUnifiedSearchEnabled } from "@/integrations/api/unified-search";
import { UnifiedSearchPage } from "@/features/unified-search/pages/UnifiedSearchPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPageMeta } from "@/utils/seo";
import { runGlobalSearch, buildBuySearchUrl } from "@/lib/global-search";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import { filtersFromSearchParams } from "@/lib/vehicle-utils";
import type { VehicleListing, VehicleFilters } from "@/types/vehicle";
import { fetchParts } from "@/features/parts/services/parts.service";
import { searchVehicles } from "@/services/vehicle.service";

export function SearchResultsPage() {
  if (isUnifiedSearchEnabled()) {
    return <UnifiedSearchPage />;
  }
  return <LegacySearchResultsPage />;
}

function LegacySearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const hub = params.get("hub");
  const [vehicleResults, setVehicleResults] = useState<VehicleListing[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [partResults, setPartResults] = useState<Awaited<ReturnType<typeof fetchParts>>>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  const quickLinks = useMemo(() => runGlobalSearch(q, 6).filter((r) => r.type === "page"), [q]);

  useEffect(() => {
    if (!q.trim()) {
      setPartResults([]);
      return;
    }
    let cancelled = false;
    setLoadingParts(true);
    fetchParts({ search: q })
      .then((rows) => {
        if (!cancelled) setPartResults(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingParts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  useEffect(() => {
    const filters: VehicleFilters = { ...filtersFromSearchParams(params) };

    if (hub === "cars") {
      filters.category = undefined;
    } else if (hub === "bikes") {
      filters.category = "bikes";
    } else if (hub === "trucks") {
      filters.category = "trucks";
    } else if (hub === "buses") {
      filters.category = "buses";
    } else if (hub === "auto") {
      filters.hubCategory = "auto";
    } else if (hub === "ev") {
      filters.category = "ev";
    }

    if (hub === "cars") {
      const hasCriteria =
        Boolean(filters.q?.trim()) ||
        Boolean(filters.brand) ||
        Boolean(filters.fuel) ||
        Boolean(filters.city) ||
        filters.priceMin != null ||
        filters.priceMax != null;

      if (!hasCriteria) {
        setVehicleResults([]);
        return;
      }

      let cancelled = false;
      setLoadingVehicles(true);

      Promise.all([
        searchVehicles({ filters: { ...filters, category: "new-cars" }, sort: "newest", page: 1, pageSize: 60 }),
        searchVehicles({ filters: { ...filters, category: "used-cars" }, sort: "newest", page: 1, pageSize: 60 }),
      ])
        .then(([newRes, usedRes]) => {
          if (cancelled) return;
          const merged = [...newRes.vehicles, ...usedRes.vehicles];
          const seen = new Set<string>();
          setVehicleResults(merged.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true))));
        })
        .finally(() => {
          if (!cancelled) setLoadingVehicles(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const hasCriteria =
      Boolean(filters.q?.trim()) ||
      Boolean(filters.brand) ||
      Boolean(filters.fuel) ||
      Boolean(filters.city) ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      Boolean(hub) ||
      Boolean(filters.category);

    if (!hasCriteria) {
      setVehicleResults([]);
      return;
    }

    let cancelled = false;
    setLoadingVehicles(true);

    searchVehicles({ filters, sort: "newest", page: 1, pageSize: 120 })
      .then((res) => {
        if (!cancelled) setVehicleResults(res.vehicles);
      })
      .finally(() => {
        if (!cancelled) setLoadingVehicles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, hub]);

  useEffect(() => {
    setPageMeta({
      title: q ? `Search: ${q} — Motorcart` : "Search — Motorcart",
      description: "Search vehicles, parts, dealers and more on Motorcart.in",
    });
  }, [q]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("q") as HTMLInputElement;
    const next = input.value.trim();
    if (next) setParams({ q: next });
    else setParams({});
  };

  return (
    <div className="search-results-page min-h-screen">
      <section className="search-results-hero">
        <div className="container py-10 md:py-12">
          <h1 className="search-results-title flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Search Motorcart
          </h1>
          <p className="mt-2 text-muted-foreground">Vehicles, parts, finance, auctions &amp; more</p>

          <form onSubmit={onSearch} className="search-results-form relative mt-6 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <Input
              name="q"
              key={q}
              defaultValue={q}
              placeholder="Brand, model, city, part name…"
              className="h-12 rounded-xl border-border/80 bg-card pl-12 pr-28 shadow-[var(--shadow-card)]"
            />
            <Button type="submit" className="absolute right-1.5 top-1.5 h-9 rounded-lg px-5">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="container pb-14">
        {vehicleResults.length === 0 && !q.trim() && !params.get("brand") && !hub ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Type a keyword or pick filters to search across the marketplace
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {q.trim() ? (
                <>
                  Results for <strong className="text-foreground">&quot;{q}&quot;</strong>
                </>
              ) : (
                <>Filtered results</>
              )}
              {hub ? (
                <>
                  {" "}
                  in <strong className="text-foreground capitalize">{hub}</strong>
                </>
              ) : null}{" "}
              — {loadingVehicles ? "…" : vehicleResults.length} vehicles, {partResults.length} parts
            </p>

            {quickLinks.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Sparkles className="h-5 w-5 text-primary" /> Quick links
                </h2>
                <div className="flex flex-wrap gap-2">
                  {quickLinks.map((l) => (
                    <Button key={l.id} variant="outline" size="sm" className="rounded-full" asChild>
                      <Link to={l.href}>{l.title}</Link>
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {loadingVehicles && (
              <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
              </p>
            )}

            {vehicleResults.length > 0 && (
              <section className="mb-10">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <Car className="h-5 w-5 text-primary" />
                    Vehicles ({vehicleResults.length})
                  </h2>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link to={buildBuySearchUrl(q)}>Browse in catalog</Link>
                  </Button>
                </div>
                <div className="vehicle-listing-grid marketplace-results-grid">
                  {vehicleResults.map((v, i) => (
                    <VehicleCard key={v.id} vehicle={v} index={i} />
                  ))}
                </div>
              </section>
            )}

            {partResults.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Package className="h-5 w-5 text-primary" />
                  Parts ({partResults.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {partResults.map((p) => (
                    <Link
                      key={p.id}
                      to={`/parts/browse?q=${encodeURIComponent(p.name)}`}
                      className="search-part-card group"
                    >
                      <img src={p.images[0]} alt="" className="h-24 w-full rounded-lg object-cover" />
                      <p className="mt-2 font-semibold group-hover:text-primary">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                      <p className="mt-1 text-sm font-bold text-primary">₹{p.price.toLocaleString("en-IN")}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {!loadingVehicles && vehicleResults.length === 0 && partResults.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <p className="font-semibold">No matches found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different spelling or browse categories</p>
                <Button className="mt-4 rounded-xl" asChild>
                  <Link to="/buy">Browse vehicles</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
