import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, TrendingUp, MapPin, Gavel, ChevronRight } from "lucide-react";
import { buildHeroBuyPath } from "@/features/home/data/homepage-data";
import { useHeroSearch } from "@/features/home/components/hero-search-context";
import { getHeroHubConfig } from "@/features/home/data/hero-hub-config";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { HeroHubQuickLinks } from "@/features/home/components/HeroHubQuickLinks";
import { formatPrice } from "@/lib/vehicle-utils";
import { formatCurrency } from "@/lib/utils";

export function HeroSearchInsights() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode, filters } = useHeroSearch();
  const hub = getHeroHubConfig(mode);
  const { featuredVehicles, auctions, loanProducts, newCars } = useHomePage();

  const pickPath = (pickMode: typeof mode, pickQuery: string) =>
    buildHeroBuyPath(pickMode, pickQuery, filters);

  const homePicks = useMemo(() => {
    if (!isHome) return [];
    const picks: Array<{
      id: string;
      badge: string;
      title: string;
      subtitle: string;
      mode: typeof mode;
      query: string;
    }> = [];

    featuredVehicles.slice(0, 2).forEach((v) => {
      picks.push({
        id: v.id,
        badge: v.isCertified ? "Certified" : "Featured",
        title: `${v.brand} ${v.model}`.trim(),
        subtitle: `${formatPrice(v.price)} · ${v.city ?? "India"}`,
        mode: "cars",
        query: `${v.brand} ${v.model}`.trim(),
      });
    });

    newCars.slice(0, 1).forEach((v) => {
      picks.push({
        id: `new-${v.id}`,
        badge: "New launch",
        title: `${v.brand} ${v.model}`.trim(),
        subtitle: `On-road from ${formatPrice(v.price)}`,
        mode: "cars",
        query: `${v.brand} ${v.model}`.trim(),
      });
    });

    auctions.slice(0, 1).forEach((a) => {
      picks.push({
        id: a.id,
        badge: "Live bid",
        title: a.title,
        subtitle: `${formatCurrency(a.currentBid)} · ${a.bidCount} bids`,
        mode: "auctions",
        query: a.title,
      });
    });

    loanProducts.slice(0, 1).forEach((l) => {
      picks.push({
        id: l.id,
        badge: "Low EMI",
        title: `${l.bank_name} auto loan`,
        subtitle: `From ${l.interest_rate_min}% · up to ₹${Math.round(l.max_loan_amount / 100000)}L`,
        mode: "finance",
        query: l.bank_name,
      });
    });

    return picks.slice(0, 4);
  }, [isHome, featuredVehicles, newCars, auctions, loanProducts]);

  const aiPicks = homePicks.length ? homePicks : hub.aiPicks;

  const trending = useMemo(() => {
    if (isHome && featuredVehicles.length) {
      return featuredVehicles.slice(0, 5).map((v) => ({
        id: v.id,
        title: `${v.brand} ${v.model}`.trim(),
        mode: "cars" as typeof mode,
        query: v.model,
      }));
    }
    return hub.trending;
  }, [isHome, featuredVehicles, hub.trending]);

  return (
    <section className="hero-insights hero-insights-row space-y-6" aria-label="Search suggestions">
      <HeroHubQuickLinks />

      <div>
        <header className="hero-insights-head">
          <span className="hero-insights-label">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            AI picks for you
          </span>
          <span className="hero-insights-meta">
            {isHome && homePicks.length ? "From live marketplace" : `Curated for ${hub.label.toLowerCase()}`}
          </span>
        </header>

        <div className="hero-ai-picks-row">
          {aiPicks.map((pick) => (
            <Link key={pick.id} to={pickPath(pick.mode, pick.query)} className="hero-ai-pick-card group">
              <div className="hero-ai-pick-card-top">
                <span className="hero-ai-pick-badge">{pick.badge}</span>
                {pick.mode === "auctions" ? (
                  <Gavel className="h-4 w-4 text-primary/80" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary/80" />
                )}
              </div>
              <p className="hero-ai-pick-title">{pick.title}</p>
              <p className="hero-ai-pick-sub">{pick.subtitle}</p>
              <span className="hero-ai-pick-cta">
                {hub.pickCta}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="hero-trending-block">
          <div className="hero-trending-head">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-semibold text-foreground">Trending {hub.label.toLowerCase()}</span>
          </div>
          <div className="hero-trending-chips-row">
            {trending.map((pick, index) => (
              <Link
                key={pick.id}
                to={pickPath(pick.mode, pick.query)}
                className="hero-trending-chip-pill group"
              >
                <span className="hero-trending-rank">{index + 1}</span>
                <span className="hero-trending-title">{pick.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <p className="hero-insights-foot">
          <MapPin className="h-3 w-3 shrink-0 text-primary" />
          {hub.insightsFoot}
        </p>
      </div>
    </section>
  );
}
