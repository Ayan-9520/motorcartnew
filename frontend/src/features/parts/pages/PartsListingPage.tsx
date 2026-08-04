import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Filter, Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { usePartsList } from "../hooks/usePartsList";
import { PartCategoryNav } from "../components/PartCategoryNav";
import { PartCard } from "../components/PartCard";
import { PartsAiRecommendations } from "../components/PartsAiRecommendations";
import { PartsCatalogShell } from "../components/PartsCatalogShell";
import { PartsCatalogEmpty } from "../components/PartsCatalogEmpty";
import { recommendParts } from "../lib/ai-parts";
import { realDataOnly } from "@/config/real-data";
import { parseCategoryParam } from "../lib/part-utils";
import { PART_CATEGORIES, PART_ORIGIN_LABELS, type PartOrigin } from "../types";
import { usePartsCartStore } from "@/store/partsCartStore";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { VehicleHubFilterRail } from "@/components/vehicle/VehicleHubFilterRail";
import {
  parseVehicleHubParam,
  VEHICLE_HUB_ENTRIES,
} from "@/lib/vehicle-hub-catalog";

export function PartsListingPage() {
  const { category: catParam } = useParams<{ category?: string }>();
  const [params, setParams] = useSearchParams();
  const category = parseCategoryParam(catParam);
  const vehicle = params.get("vehicle") ?? "";
  const hub = useMemo(() => parseVehicleHubParam(params.get("hub")), [params]);
  const origin = (params.get("origin") as PartOrigin | null) ?? undefined;
  const [q, setQ] = useState(params.get("q") ?? "");
  const { parts, loading } = usePartsList(category, q, hub, origin);
  const cartCount = usePartsCartStore((s) => s.itemCount());

  const preserveSearch = useMemo(() => {
    const p = new URLSearchParams();
    const h = params.get("hub");
    const veh = params.get("vehicle");
    const qp = params.get("q");
    if (h) p.set("hub", h);
    if (veh) p.set("vehicle", veh);
    if (qp) p.set("q", qp);
    return p.toString();
  }, [params]);

  const buildHubHref = useCallback(
    (h: HubCategorySlug | null) => {
      const next = new URLSearchParams(params);
      if (h) next.set("hub", h);
      else next.delete("hub");
      const qs = next.toString();
      const base = category ? `/parts/${category}` : `/parts/browse`;
      return qs ? `${base}?${qs}` : base;
    },
    [params, category]
  );

  const filtered = useMemo(() => {
    if (!vehicle) return parts;
    const v = vehicle.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(v) ||
        p.compatibility.some((c) => c.toLowerCase().includes(v))
    );
  }, [parts, vehicle]);

  const aiPicks = useMemo(
    () =>
      recommendParts(parts, {
        category: category ?? undefined,
        vehicle: vehicle || undefined,
        hub,
      }, 6),
    [category, vehicle, hub, parts]
  );

  const catMeta = category ? PART_CATEGORIES.find((c) => c.slug === category) : null;
  const hubLabel = hub ? VEHICLE_HUB_ENTRIES.find((e) => e.id === hub)?.label : null;

  useEffect(() => {
    setPageMeta({
      title: catMeta ? `${catMeta.label} — Parts | Motorcart` : "Parts Catalogue — Motorcart",
      description: "Genuine OEM & aftermarket parts with GST invoices, wholesale & COD.",
    });
  }, [catMeta]);

  const applySearch = () => {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    setParams(next);
  };

  return (
    <PartsCatalogShell
      title={catMeta ? catMeta.label : "Full parts catalogue"}
      subtitle={
        catMeta
          ? `${catMeta.description}${hubLabel ? ` · ${hubLabel}` : ""}`
          : realDataOnly
            ? `Live catalogue · cars, bikes, auto, trucks, buses, equipment & EV${hubLabel ? ` · ${hubLabel}` : ""}`
            : `50,000+ SKUs · cars, bikes, auto, trucks, buses, equipment & EV${hubLabel ? ` · ${hubLabel}` : ""}`
      }
      category={category}
    >
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Vehicle type
        </p>
        <VehicleHubFilterRail activeHub={hub} buildHref={buildHubHref} className="parts-catalog-vehicle-rail" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full">
          OEM & aftermarket
        </span>
        {(["", "oem", "aftermarket", "genuine_accessory"] as const).map((o) => {
          const next = new URLSearchParams(params);
          if (o) next.set("origin", o);
          else next.delete("origin");
          const qs = next.toString();
          const base = category ? `/parts/${category}` : `/parts/browse`;
          const href = qs ? `${base}?${qs}` : base;
          const active = (origin ?? "") === o;
          return (
            <Button key={o || "all"} variant={active ? "default" : "outline"} size="sm" className="rounded-full" asChild>
              <Link to={href}>{o ? PART_ORIGIN_LABELS[o] : "All parts"}</Link>
            </Button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search parts…"
            className="rounded-xl pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
        </div>
        <Button className="rounded-xl" onClick={applySearch}>
          Search
        </Button>
        {cartCount > 0 && (
          <Button variant="outline" className="gap-2 rounded-xl" asChild>
            <Link to="/cart">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cartCount})
            </Link>
          </Button>
        )}
        {vehicle ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Filter className="h-3 w-3" />
            {vehicle}
          </span>
        ) : null}
        {hubLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
            {hubLabel}
          </span>
        ) : null}
      </div>

      <PartCategoryNav active={category ?? "all"} basePath="/parts" preserveSearch={preserveSearch} />

      <div className="mt-6">
        <PartsAiRecommendations parts={aiPicks} title="PartsBot recommendations" />
      </div>

      <section className="mt-8">
        <p className="mb-4 text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{filtered.length}</strong> products
        </p>

        {loading ? (
          <div className="parts-product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <PartsCatalogEmpty hubLabel={hubLabel} />
        ) : (
          <div className="parts-product-grid">
            {filtered.map((part, i) => (
              <PartCard key={part.id} part={part} index={i} />
            ))}
          </div>
        )}
      </section>
    </PartsCatalogShell>
  );
}
