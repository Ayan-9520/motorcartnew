import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Search, SlidersHorizontal, X, ArrowRight, Sparkles } from "lucide-react";
import { buildHeroBuyPath } from "@/features/home/data/homepage-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HERO_SEARCH_TABS,
  buildHeroSearchPath,
  heroBuyHubHref,
  SEARCH_CITY_SUGGESTIONS,
  type HeroSearchMode,
} from "@/features/home/data/homepage-data";
import { getHeroHubConfig } from "@/features/home/data/hero-hub-config";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { useHeroSearch } from "@/features/home/components/hero-search-context";
import { cn } from "@/lib/utils";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import type { HubCategorySlug } from "@/features/marketplace/types";

const HERO_MODE_TO_HUB: Partial<Record<HeroSearchMode, HubCategorySlug>> = {
  cars: "cars",
  bikes: "bikes",
  trucks: "trucks",
  buses: "buses",
  auto: "auto",
};

const MODE_PLACEHOLDERS: Record<HeroSearchMode, string> = {
  cars: "Brand, model, variant — e.g. Creta SX, Swift VDI…",
  bikes: "Brand, model — e.g. Activa 6G, Classic 350…",
  trucks: "Make, tonnage, body — e.g. Tata 407, Ashok Leyland…",
  auto: "Passenger or cargo — e.g. Bajaj RE, Piaggio Ape…",
  buses: "Make, seats, route — e.g. Volvo bus 49 seater…",
  auctions: "Vehicle, lot ID, city — e.g. Honda City repo Mumbai…",
  finance: "Loan need — e.g. SUV loan 12 lakh, bike EMI…",
};

function HeroFilterField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const listId = `hero-filter-${label.toLowerCase()}`;
  return (
    <label className="hero-filter-combo">
      <span className="hero-filter-label">{label}</span>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="hero-filter-input"
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}

export function HeroSearchModule() {
  const navigate = useNavigate();
  const isHome = useLocation().pathname === "/";
  const {
    mode,
    setMode,
    query,
    setQuery,
    brand,
    setBrand,
    budget,
    setBudget,
    fuel,
    setFuel,
    city,
    setCity,
    filters,
    hasFilters,
    clearFilters,
  } = useHeroSearch();
  const activeCondition = useVehicleHubStore((s) => s.activeCondition);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);

  const hub = getHeroHubConfig(mode);
  const { featuredVehicles, data } = useHomePage();
  const activeTab = HERO_SEARCH_TABS.find((t) => t.id === mode) ?? HERO_SEARCH_TABS[0];
  const searchPath = buildHeroSearchPath(mode, query, filters);
  const buyHubPath = heroBuyHubHref(mode, activeCondition);
  const cities = SEARCH_CITY_SUGGESTIONS;

  const brandOptions = useMemo(() => {
    if (isHome && data?.brands?.length) {
      return data.brands.map((b) => b.name);
    }
    return hub.brands;
  }, [isHome, data?.brands, hub.brands]);

  const quickSuggestions = useMemo(() => {
    if (isHome && featuredVehicles.length) {
      return featuredVehicles.slice(0, 4).map((v) => ({
        id: v.id,
        title: `${v.brand} ${v.model}`.trim(),
        mode: "cars" as HeroSearchMode,
        query: `${v.brand} ${v.model}`.trim(),
      }));
    }
    return hub.trending.slice(0, 4);
  }, [isHome, featuredVehicles, hub.trending]);

  const onSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate(searchPath);
  };

  return (
    <div className="hero-search-module space-y-3">
      <div className="hero-vehicle-tabs" role="tablist" aria-label="Browse category">
        {HERO_SEARCH_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setMode(item.id);
                const mapped = HERO_MODE_TO_HUB[item.id];
                if (mapped) setBuyContext(mapped, activeCondition);
              }}
              className={cn("hero-vehicle-tab", isActive && "hero-vehicle-tab-active")}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={isActive ? 2.25 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {quickSuggestions.length > 0 && (
        <div className="hero-search-suggestions">
          <span className="hero-search-suggestions-label">
            <Sparkles className="h-3 w-3 text-primary" />
            AI suggestions
          </span>
          <div className="hero-search-suggestion-chips">
            {quickSuggestions.map((pick) => (
              <Link
                key={pick.id}
                to={buildHeroBuyPath(pick.mode, pick.query, filters, activeCondition)}
                className="hero-suggestion-chip"
              >
                {pick.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="hero-search-card hero-search-card-float">
        <div className="hero-filter-toolbar">
          <span className="hero-filter-toolbar-title">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            {isHome ? "Search across ecosystem" : `Refine ${hub.label.toLowerCase()}`}
          </span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="hero-filter-clear">
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        <div className="hero-filter-row hero-filter-row-top">
          <HeroFilterField
            label="Brand"
            value={brand}
            onChange={setBrand}
            options={brandOptions}
            placeholder="Type or pick brand"
          />
          <HeroFilterField
            label="Budget"
            value={budget}
            onChange={setBudget}
            options={hub.budgets}
            placeholder="e.g. Under ₹10L"
          />
          {hub.fuels.length > 0 && (
            <HeroFilterField
              label="Fuel"
              value={fuel}
              onChange={setFuel}
              options={hub.fuels}
              placeholder="Petrol, Diesel, EV…"
            />
          )}
          <HeroFilterField
            label="City"
            value={city}
            onChange={setCity}
            options={cities}
            placeholder="Mumbai, Delhi NCR…"
          />
        </div>

        <form onSubmit={onSearch} className="hero-search-bar hero-search-bar-main">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={MODE_PLACEHOLDERS[mode]}
            className="h-11 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="h-11 shrink-0 rounded-xl px-6 text-sm font-semibold shadow-[var(--shadow-primary)]"
          >
            Search
          </Button>
        </form>

        <div className="hero-search-card-footer">
          <Link to={buyHubPath} className="hero-browse-link inline-flex items-center gap-1">
            Open {hub.label} hub
            <ArrowRight className="h-3 w-3" />
          </Link>
          <span className="text-[11px] text-muted-foreground">{hub.browseFooter}</span>
        </div>
      </div>
    </div>
  );
}
