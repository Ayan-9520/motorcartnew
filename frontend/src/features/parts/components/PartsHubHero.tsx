import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleHubFilterRail } from "@/components/vehicle/VehicleHubFilterRail";
import { parseVehicleHubParam } from "@/lib/vehicle-hub-catalog";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { partsBrowsePath, partsTrustStatsForCatalog } from "../data/parts-hub-data";
import { realDataOnly } from "@/config/real-data";

interface PartsHubHeroProps {
  skuCount?: number;
}

export function PartsHubHero({ skuCount = 0 }: PartsHubHeroProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeHub = useMemo(() => parseVehicleHubParam(params.get("hub")), [params]);
  const [query, setQuery] = useState("");

  const buildHubHref = (hub: HubCategorySlug | null) => {
    const next = new URLSearchParams(params);
    if (hub) next.set("hub", hub);
    else next.delete("hub");
    const qs = next.toString();
    return qs ? `/parts?${qs}` : "/parts";
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      partsBrowsePath({
        q: query.trim() || undefined,
        hub: activeHub ?? undefined,
      })
    );
  };

  const trustStats = partsTrustStatsForCatalog(skuCount, realDataOnly);

  return (
    <section className="parts-hub-hero relative overflow-hidden">
      <div className="parts-hub-hero__mesh pointer-events-none" aria-hidden />
      <div className="parts-hub-hero__orb parts-hub-hero__orb--left pointer-events-none" aria-hidden />
      <div className="parts-hub-hero__orb parts-hub-hero__orb--right pointer-events-none" aria-hidden />

      <div className="container relative z-[1]">
        <div className="parts-hub-hero__badges">
          <span className="parts-hub-hero__badge">
            <Sparkles className="h-3 w-3" />
            Motorcart Parts
          </span>
          <span className="parts-hub-hero__badge parts-hub-hero__badge--muted">
            <ShieldCheck className="h-3 w-3" />
            B2B &amp; retail · GST ready
          </span>
        </div>

        <h1 className="parts-hub-title">
          India&apos;s{" "}
          <span className="parts-hub-title-accent">fintech-grade</span>
          <br className="hidden sm:block" />
          {" "}parts marketplace
        </h1>
        <p className="parts-hub-subtitle">
          OEM &amp; aftermarket for cars, bikes, commercial vehicles, trucks, buses &amp; equipment —
          wholesale pricing, COD &amp; same-day metro delivery
        </p>

        <div className="parts-hub-hero__stats">
          {trustStats.map(({ label, sub }) => (
            <span key={sub} className="parts-hub-stat-pill">
              <strong>{label}</strong>
              <span className="text-muted-foreground">{sub}</span>
            </span>
          ))}
        </div>

        <div className="parts-hub-hero__hub">
          <p className="parts-hub-hero__hub-label">Shop by vehicle type</p>
          <VehicleHubFilterRail
            activeHub={activeHub}
            buildHref={buildHubHref}
            className="parts-hub-vehicle-rail"
          />
        </div>

        <form onSubmit={onSearch} className="parts-hub-search">
          <div className="parts-hub-search-input flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search part name, SKU, brand…"
              className="border-0 bg-transparent text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            />
          </div>
          <Button type="submit" className="parts-hub-search-btn h-11 shrink-0 rounded-xl px-6 font-semibold shadow-[var(--shadow-primary)] md:h-12 md:px-8">
            Search parts
          </Button>
        </form>
      </div>
    </section>
  );
}
