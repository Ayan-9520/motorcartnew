import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Radio, Calendar, Archive, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { useAuctionList } from "../hooks/useAuctionList";
import { AuctionCard } from "../components/AuctionCard";
import { AuctionHeroBanner } from "../components/AuctionHeroBanner";
import { CategoryTabs } from "../components/CategoryTabs";
import { MOCK_AUCTION_EVENTS } from "../data/auction-hub-data";
import { auctionAssetClass } from "../lib/auction-utils";

const STATUS_TABS = [
  { id: "live", label: "Live now", icon: Radio },
  { id: "upcoming", label: "Upcoming", icon: Calendar },
  { id: "ended", label: "Closed", icon: Archive },
] as const;

export function AuctionListingPage() {
  const [params, setParams] = useSearchParams();
  const { featured, live, upcoming, ended, loading, status, type, setStatus, setType } = useAuctionList();

  const q = (params.get("q") ?? "").toLowerCase();
  const state = params.get("state");
  const eventSlug = params.get("event");
  const assetCategory = params.get("category");

  const filterBySearch = (list: typeof live) => {
    let result = list;
    if (q) {
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.auctionType.includes(q)
      );
    }
    if (state && state !== "All States") {
      result = result.filter((a) => a.location.toLowerCase().includes(state.toLowerCase().split(" ")[0]!));
    }
    if (assetCategory) {
      result = result.filter((a) => auctionAssetClass(a) === assetCategory);
    }
    if (eventSlug) {
      const ev = MOCK_AUCTION_EVENTS.find((e) => e.slug === eventSlug);
      if (ev) {
        result = result.filter(
          (a) =>
            a.location.toLowerCase().includes(ev.city.toLowerCase()) ||
            (ev.featuredAuctionSlug && a.slug === ev.featuredAuctionSlug)
        );
      }
    }
    return result;
  };

  const activeListRaw =
    status === "upcoming" ? upcoming : status === "ended" ? ended : live;
  const activeList = useMemo(() => filterBySearch(activeListRaw), [activeListRaw, q, state, eventSlug, assetCategory]);

  const heroAuction = featured[0] ?? live[0];

  useEffect(() => {
    setPageMeta({
      title: "Browse Auction Inventory — Motorcart",
      description: "Search and bid on bank repo, dealer & government vehicle auctions.",
    });
  }, []);

  const eventMeta = eventSlug ? MOCK_AUCTION_EVENTS.find((e) => e.slug === eventSlug) : null;

  return (
    <div className="auction-browse-page min-h-screen pb-14">
      <div className="auction-browse-hero border-b border-border/80">
        <div className="container py-6">
          <Link
            to="/auctions"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Auction hub
          </Link>
          <h1 className="text-2xl font-bold md:text-3xl">
            {eventMeta ? `${eventMeta.city} — auction lots` : "Browse auction inventory"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {eventMeta
              ? `${eventMeta.vehicleCount} vehicles · ${eventMeta.mode} bidding`
              : "Filter by status, type & location"}
          </p>
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              defaultValue={params.get("q") ?? ""}
              placeholder="Search lots…"
              className="pl-9 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const next = new URLSearchParams(params);
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) next.set("q", v);
                  else next.delete("q");
                  setParams(next);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="container space-y-8 py-8">
        {heroAuction && status === "live" && !eventSlug && (
          <AuctionHeroBanner auction={heroAuction} viewerCount={heroAuction.viewerCount} />
        )}

        <nav className="flex flex-wrap gap-2">
          {STATUS_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                status === id
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-primary)]"
                  : "border border-border bg-card hover:border-primary/40"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <CategoryTabs activeType={type} onTypeChange={setType} />

        <section className="space-y-4">
          <h2 className="text-lg font-bold">
            {status === "live" ? "Live lots" : status === "upcoming" ? "Starting soon" : "Closed auctions"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({activeList.length})</span>
          </h2>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[16/10] w-full rounded-xl" />
              ))}
            </div>
          ) : activeList.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              No lots match your filters.{" "}
              <Link to="/auctions" className="font-medium text-primary hover:underline">
                Back to hub
              </Link>
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeList.map((a, i) => (
                <AuctionCard key={a.id} auction={a} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
