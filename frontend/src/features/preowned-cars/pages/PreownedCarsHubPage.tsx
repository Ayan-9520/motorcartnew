import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreownedCarCard } from "../components/PreownedCarCard";
import {
  CERTIFIED_PROGRAMS,
  PREOWNED_STATS,
  PREOWNED_TAGLINE,
  TRUST_BADGES,
} from "../data/preowned-data";
import { fetchFeaturedPreowned, getFeaturedPreowned } from "../services/preowned-cars.service";
import type { PreownedCarListing } from "../types";
import { setPageMeta } from "@/utils/seo";

export function PreownedCarsHubPage() {
  const [featured, setFeatured] = useState<PreownedCarListing[]>(() => getFeaturedPreowned(8));

  useEffect(() => {
    let cancelled = false;
    void fetchFeaturedPreowned(8).then((rows) => {
      if (!cancelled) setFeatured(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPageMeta({
      title: "Certified Pre-Owned Cars",
      description: PREOWNED_TAGLINE,
    });
  }, []);

  return (
    <div className="wa-pattern min-h-screen">
      <section className="border-b border-border bg-card">
        <div className="container mx-auto space-y-6 px-4 py-10 md:py-14">
          <Badge className="border-primary/30 bg-primary/10 text-primary">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            200+ point inspection · AI fair price
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
            Certified <span className="text-primary">pre-owned cars</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground md:text-lg">{PREOWNED_TAGLINE}</p>
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
              >
                {b.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-xl" asChild>
              <Link to="/used-cars/browse">
                Browse certified stock <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link to="/sell">Sell your car</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PREOWNED_STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-3 text-center">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="container mx-auto space-y-6 px-4">
          <h2 className="text-2xl font-bold">OEM certified programs</h2>
          <p className="text-muted-foreground">
            Marketplace logic inspired by India&apos;s leading certified networks — original Motorcart experience.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {CERTIFIED_PROGRAMS.map((p) => (
              <Link
                key={p.id}
                to={`/used-cars/browse?certified=1&program=${p.id}`}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{p.brand}</p>
                <p className="mt-1 font-semibold text-foreground">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.inventoryCount} listings</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section-alt">
        <div className="container mx-auto space-y-6 px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Featured</p>
              <h2 className="text-2xl font-bold">Certified picks</h2>
            </div>
            <Link to="/used-cars/browse" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v, i) => (
              <PreownedCarCard key={v.id} vehicle={v} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
