import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  Bot,
  Bus,
  Car,
  CarTaxiFront,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import { getHubCopy } from "../data/marketplace-hub-config";
import { buyListingPath, parseBuyMarketplaceRoute, sellListingPath } from "../lib/route-utils";
import type { HubCategorySlug } from "../types";
import { VehicleHubIconBar } from "./VehicleHubIconBar";

const HERO_ICONS: Record<HubCategorySlug, typeof Car> = {
  cars: Car,
  bikes: Bike,
  trucks: Truck,
  buses: Bus,
  auto: CarTaxiFront,
  equipment: Truck,
  ev: Car,
};

type MarketplaceHubHeroProps = {
  mode: "buy" | "sell";
};

type HubTab = "new" | "used" | "sell" | "auction" | "finance";

function titleCaseSingular(singular: string): string {
  if (singular === "EV" || singular === "ev") return "EV";
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

export function MarketplaceHubHero({ mode }: MarketplaceHubHeroProps) {
  const activeHub = useVehicleHubStore((s) => s.activeHub);
  const activeCondition = useVehicleHubStore((s) => s.activeCondition);
  const setActiveCondition = useVehicleHubStore((s) => s.setActiveCondition);
  const copy = getHubCopy(activeHub);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<HubTab>(
    mode === "sell" ? "sell" : activeCondition
  );

  useEffect(() => {
    const route = parseBuyMarketplaceRoute(pathname);
    if (route) setActiveCondition(route.condition);
  }, [pathname, setActiveCondition]);

  useEffect(() => {
    if (mode === "buy" && (activeCondition === "new" || activeCondition === "used")) {
      setActiveTab(activeCondition);
    }
    if (mode === "sell") setActiveTab("sell");
  }, [activeCondition, mode]);

  const HeroIcon = HERO_ICONS[activeHub];
  const sellAccent = titleCaseSingular(copy.singular);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const cond = activeTab === "new" ? "new" : "used";
    setActiveCondition(cond);
    const path = buyListingPath(activeHub, cond);
    navigate(q ? `${path}?q=${encodeURIComponent(q)}` : path);
  };

  const selectCondition = (cond: "new" | "used") => {
    setActiveCondition(cond);
    setActiveTab(cond);
    if (mode === "buy") {
      navigate(buyListingPath(activeHub, cond));
    }
  };

  const tabs: { id: HubTab; label: string; href?: string }[] =
    mode === "sell"
      ? [
          { id: "sell", label: `Sell ${copy.plural}` },
          { id: "used", label: "Browse Pre-Owned", href: buyListingPath(activeHub, "used") },
          { id: "auction", label: "Auction", href: "/auctions" },
          { id: "finance", label: "Apply Loan", href: "/finance" },
        ]
      : [
          { id: "new", label: `New ${copy.plural}` },
          { id: "used", label: `Pre-Owned ${copy.plural}` },
          { id: "sell", label: `Sell ${copy.singular}`, href: sellListingPath(activeHub) },
          { id: "auction", label: "Auction", href: "/auctions" },
          { id: "finance", label: "Apply Loan", href: "/finance" },
        ];

  return (
    <section
      className={cn(
        "marketplace-hub-hero",
        mode === "sell" && "marketplace-hub-hero-sell"
      )}
    >
      <div className="container">
        <VehicleHubIconBar variant="page" className="mb-5 md:hidden" />

        <div className="marketplace-hub-hero-grid">
          <div className="marketplace-hub-hero-copy">
            <p className="marketplace-hub-eyebrow">
              {mode === "buy" ? "Buy on Motorcart" : "Sell on Motorcart"}
            </p>
            {mode === "sell" ? (
              <>
                <h1 className="marketplace-hub-hero-headline" key={`sell-${activeHub}`}>
                  Get the best price for your{" "}
                  <span className="text-primary">{sellAccent}</span>
                </h1>
                <p className="marketplace-hub-subtitle mt-3 max-w-xl">{copy.sellHeroLead}</p>
              </>
            ) : (
              <h1 className="marketplace-hub-hero-headline" key={activeHub}>
                Find your <span className="text-primary">{copy.dreamLabel}</span>
              </h1>
            )}

            <div className="marketplace-hub-tabs" role="tablist">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const className = cn(
                  "marketplace-hub-tab",
                  isActive && "marketplace-hub-tab-active"
                );
                if (tab.href) {
                  return (
                    <Link key={tab.id} to={tab.href} className={className}>
                      {tab.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      if (tab.id === "new") selectCondition("new");
                      else if (tab.id === "used") selectCondition("used");
                      else setActiveTab(tab.id);
                    }}
                    className={className}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {mode === "buy" && (activeTab === "new" || activeTab === "used") && (
              <form onSubmit={onSearch} className="marketplace-hub-search">
                <Search className="h-5 w-5 shrink-0 text-primary" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="hidden h-11 shrink-0 gap-1.5 rounded-xl px-4 text-xs font-semibold sm:inline-flex"
                  onClick={() => navigate("/ai")}
                >
                  <Bot className="h-4 w-4" />
                  AI Search
                  <span className="rounded bg-destructive px-1 py-0.5 text-[9px] font-bold text-destructive-foreground">
                    Beta
                  </span>
                </Button>
                <Button type="submit" className="h-11 shrink-0 rounded-xl px-6 font-semibold shadow-[var(--shadow-primary)]">
                  Find {copy.plural}
                </Button>
              </form>
            )}

            {mode === "sell" && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
                  <Link to={sellListingPath(activeHub)}>
                    Start free listing
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={buyListingPath(activeHub, "used")}>
                    See what buyers pay
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="marketplace-hub-hero-visual" aria-hidden key={activeHub}>
            <div
              className={cn(
                "marketplace-hub-hero-visual-inner",
                mode === "sell" && "marketplace-hub-hero-visual-inner--sell"
              )}
            >
              <HeroIcon className="marketplace-hub-hero-vehicle-icon" strokeWidth={1.25} />
              <p className="marketplace-hub-hero-visual-label">
                {mode === "sell" ? `Sell ${copy.plural}` : copy.plural}
              </p>
              <p className="marketplace-hub-hero-visual-sub">
                {mode === "sell" ? (
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Free · Dealer offers · Pan-India
                  </span>
                ) : (
                  "Verified · AI priced · EMI ready"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
