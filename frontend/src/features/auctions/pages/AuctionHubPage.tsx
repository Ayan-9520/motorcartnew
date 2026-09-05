import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gavel, MapPin, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setPageMeta } from "@/utils/seo";
import { AuctionHubHero } from "../components/AuctionHubHero";
import { AuctionServicesStrip } from "../components/AuctionServicesStrip";
import { AuctionEventCard } from "../components/AuctionEventCard";
import { AuctionAssetCategoryGrid } from "../components/AuctionAssetCategoryGrid";
import { AuctionCard } from "../components/AuctionCard";
import { useAuctionHub } from "../hooks/useAuctionHub";
import { auctionBrowsePath } from "../lib/auction-hub-routes";

export function AuctionHubPage() {
  const { liveEvents, upcomingEvents, liveAuctions, loading, stats } = useAuctionHub();

  useEffect(() => {
    setPageMeta({
      title: "Auctions — Phygital Marketplace | Motorcart",
      description:
        "India's phygital auction hub for pre-owned vehicles, equipment & assets. Live yards, online bidding & bank repo sales.",
    });
  }, []);

  return (
    <div className="auction-hub-page min-h-screen">
      <AuctionHubHero />

      <div className="container -mt-2 mb-6 flex flex-wrap justify-center gap-3">
        {stats.liveLots > 0 ? (
          <span className="auction-hub-stat-pill">
            <Radio className="h-3.5 w-3.5 text-red-500" />
            <strong>{stats.liveLots}</strong> auction lots
          </span>
        ) : (
          <span className="auction-hub-stat-pill">
            <Gavel className="h-3.5 w-3.5 text-primary" />
            Auction listings
          </span>
        )}
        <span className="auction-hub-stat-pill">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {stats.cities > 0 ? <><strong>{stats.cities}</strong> cities</> : "Pan-India coverage"}
        </span>
        <span className="auction-hub-stat-pill">
          <Users className="h-3.5 w-3.5 text-primary" />
          {stats.eventsToday > 0 ? <><strong>{stats.eventsToday}</strong> events today</> : "Scheduled events"}
        </span>
      </div>

      <AuctionServicesStrip />

      <section className="container pb-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="auction-hub-section-title">Live &amp; upcoming auctions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Phygital yards with catalogue, schedule &amp; instant registration
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={auctionBrowsePath({ status: "live" })}>
              Browse all lots <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {liveEvents.length > 0 && (
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-600">Live events</p>
            <div className="auction-events-grid">
              {liveEvents.map((event) => (
                <AuctionEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600">Upcoming</p>
            <div className="auction-events-grid">
              {upcomingEvents.map((event) => (
                <AuctionEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="container border-t border-border/80 pb-10 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="auction-hub-section-title">Featured auction lots</h2>
            <p className="mt-1 text-sm text-muted-foreground">Bid in real time — transparent reserve &amp; auto-bid</p>
          </div>
          <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
            <Link to={auctionBrowsePath()}>
              <Gavel className="mr-2 h-4 w-4" />
              Enter auction hall
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] w-full rounded-xl" />
            ))}
          </div>
        ) : liveAuctions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No auction lots right now — check upcoming events.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liveAuctions.slice(0, 6).map((a, i) => (
              <AuctionCard key={a.id} auction={a} index={i} />
            ))}
          </div>
        )}
      </section>

      <AuctionAssetCategoryGrid />

      <section className="container pb-14">
        <div className="auction-hub-footer-cta text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Dealer, bank repo or government fleet — register once, bid everywhere
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
              <Link to="/login?redirect=/auctions/browse">Register to bid</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/dashboard/auction">Partner dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
