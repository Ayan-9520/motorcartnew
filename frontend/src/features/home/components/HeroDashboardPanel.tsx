import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CheckCircle2,
  Gavel,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api/axios";
import { useHeroSearch } from "@/features/home/components/hero-search-context";
import { getHeroHubConfig, getHomeHeroDashboard, type HeroDashboardCard } from "@/features/home/data/hero-hub-config";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { buildHeroDashboardPool } from "@/features/home/lib/map-home-data";
import { useAuctionCountdown } from "@/features/home/hooks/useAuctionCountdown";
import { SEGMENT_DEFAULTS } from "@/lib/media/vehicle-media-registry";
import { realDataOnly } from "@/config/real-data";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

function AuctionCardMeta({ card }: { card: HeroDashboardCard }) {
  const countdown = useAuctionCountdown(card.endsAt);
  const meta = card.endsAt
    ? `${countdown || "Ending soon"} · ${card.bidCount ?? 0} bids`
    : card.meta;
  return <p className="hero-dash-meta">{meta}</p>;
}

function ListingCardImage({ src, alt }: { src?: string; alt: string }) {
  const [currentSrc, setCurrentSrc] = useState(src ?? "");
  const fallback = SEGMENT_DEFAULTS.cars;

  useEffect(() => {
    setCurrentSrc(src ?? "");
  }, [src]);

  if (!currentSrc) {
    return <div className="hero-dash-listing-img bg-muted" aria-hidden />;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="hero-dash-listing-img"
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback);
      }}
    />
  );
}

function DashboardCard({
  card,
  delay,
  aiConfigured,
}: {
  card: HeroDashboardCard;
  delay: number;
  aiConfigured: boolean;
}) {
  if (card.type === "auction") {
    return (
      <motion.div {...fade(delay)} className="hero-dash-card hero-dash-card-auction">
        <div className="hero-dash-card-head">
          <Badge className="border-0 bg-destructive text-[10px] text-destructive-foreground">
            {card.live ? (
              <>
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </>
            ) : (
              card.badge
            )}
          </Badge>
          <span className="hero-dash-kpi-label">{card.meta?.split("·")[1]?.trim()}</span>
        </div>
        <p className="hero-dash-card-title">{card.title}</p>
        {card.price != null && (
          <p className="hero-dash-kpi-value text-primary">{formatCurrency(card.price)}</p>
        )}
        <AuctionCardMeta card={card} />
        <Button size="sm" className="mt-auto w-full rounded-lg text-xs" asChild>
          <Link to={card.href}>Place bid</Link>
        </Button>
      </motion.div>
    );
  }

  if (card.type === "listing") {
    return (
      <motion.div {...fade(delay)} className="hero-dash-card hero-dash-card-listing overflow-hidden p-0">
        <Link to={card.href} className="flex h-full flex-col">
          <ListingCardImage src={card.image} alt={card.title} />
          <div className="flex flex-1 flex-col p-2.5 sm:p-3">
            <p className="hero-dash-kpi-label">{card.badge ?? "Listed"}</p>
            <p className="hero-dash-card-title">{card.title}</p>
            {card.price != null && (
              <p className="hero-dash-kpi-value">{formatCurrency(card.price)}</p>
            )}
            <p className="hero-dash-meta">{card.meta}</p>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (card.type === "loan") {
    return (
      <motion.div {...fade(delay)} className="hero-dash-card">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="hero-dash-card-title">{card.title}</span>
        </div>
        <p className="hero-dash-meta mt-2">{card.meta}</p>
        {card.price != null && (
          <p className="hero-dash-kpi-value mt-1">{formatCurrency(card.price)}</p>
        )}
        <Button variant="outline" size="sm" className="mt-auto w-full rounded-lg text-xs" asChild>
          <Link to={card.href}>View offers</Link>
        </Button>
      </motion.div>
    );
  }

  if (card.type === "ai") {
    const isCommunityCard = card.href.includes("/community");
    return (
      <motion.div {...fade(delay)} className="hero-dash-card">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-primary)]">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="hero-dash-card-title line-clamp-1">{card.title}</p>
            {isCommunityCard ? (
              <p className="flex items-center gap-1 text-[10px] font-medium text-primary">Community</p>
            ) : (
              <p className="flex items-center gap-1 text-[10px] font-medium text-primary">
                {aiConfigured ? <span className="ai-pulse" /> : null}
                {aiConfigured ? "AI ready" : "AI not configured"}
              </p>
            )}
          </div>
        </div>
        <p className="hero-dash-meta mt-2 line-clamp-2">{card.subtitle}</p>
        <Button variant="outline" size="sm" className="mt-auto w-full rounded-lg text-xs" asChild>
          <Link to={card.href}>{card.href.includes("/community") ? "Open feed" : "Ask AI"}</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div {...fade(delay)} className="hero-dash-card col-span-2">
      <div className="flex items-center justify-between">
        <p className="hero-dash-kpi-label">{card.title}</p>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>
      <p className="hero-dash-meta mt-1">{card.subtitle}</p>
      <Button size="sm" className="mt-2 rounded-lg text-xs" asChild>
        <Link to={card.href}>Explore</Link>
      </Button>
    </motion.div>
  );
}

function pickRotated<T>(items: T[], index: number, fallback: T): T {
  if (!items.length) return fallback;
  return items[index % items.length]!;
}

export function HeroDashboardPanel() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode } = useHeroSearch();
  const hub = getHeroHubConfig(mode);
  const {
    featuredVehicles,
    auctions,
    loanProducts,
    communityPosts,
    heroStats,
    data,
  } = useHomePage();

  const [rotateIndex, setRotateIndex] = useState(0);

  const readyQ = useQuery({
    queryKey: ["api-ready"],
    queryFn: async () => (await api.get("/api/ready")).data,
    staleTime: 60_000,
    retry: 0,
  });
  const aiConfigured = readyQ.data?.checks?.aiKeyConfigured === true;

  const pool = useMemo(
    () =>
      isHome
        ? buildHeroDashboardPool({
            featuredVehicles,
            auctions,
            loanProducts,
            communityPosts,
            heroStats,
          })
        : null,
    [isHome, featuredVehicles, auctions, loanProducts, communityPosts, heroStats]
  );

  const staticHomeDash = isHome && !pool && !realDataOnly ? getHomeHeroDashboard() : null;

  // Hooks must run unconditionally — never after the empty-state early return.
  useEffect(() => {
    if (!pool) return;
    const maxItems = Math.max(
      pool.listings.length,
      pool.auctions.length,
      pool.loans.length,
      pool.community.length
    );
    if (maxItems <= 1) return;
    const id = window.setInterval(() => setRotateIndex((i) => i + 1), 5500);
    return () => window.clearInterval(id);
  }, [pool]);

  const visibleCards: HeroDashboardCard[] = useMemo(() => {
    if (pool) {
      const cards = [
        pickRotated(pool.listings, rotateIndex, pool.listings[0]),
        pickRotated(pool.auctions, rotateIndex, pool.auctions[0]),
        pickRotated(pool.loans, rotateIndex, pool.loans[0]),
        pickRotated(pool.community, rotateIndex, pool.community[0]),
      ].filter(Boolean) as HeroDashboardCard[];

      if (cards.length >= 3) return cards.slice(0, 4);

      return [
        ...cards,
        {
          type: "stats" as const,
          title: "Marketplace momentum",
          subtitle:
            pool.liveAuctionCount > 0
              ? `${pool.listingCount}+ featured listings · ${pool.liveAuctionCount} auction lots`
              : `${pool.listingCount}+ featured listings`,
          href: "/buy",
        },
      ];
    }
    return staticHomeDash?.cards ?? (!realDataOnly ? hub.dashboard : []);
  }, [pool, rotateIndex, staticHomeDash, hub.dashboard]);

  const panelTitle = pool?.panelTitle ?? staticHomeDash?.panelTitle ?? `${hub.label} dashboard`;
  const dashboardTags = pool?.tags ?? staticHomeDash?.tags ?? hub.dashboardTags;
  const dealerCountText =
    pool?.dealerCount ??
    (typeof data?.stats?.dealers === "number" ? data.stats.dealers.toLocaleString("en-IN") : undefined);
  const liveAuctionsCount = pool?.liveAuctionCount ?? data?.stats?.live_auctions ?? 0;
  const hasLiveAuctions = liveAuctionsCount > 0;

  if (realDataOnly && isHome && !pool) return null;

  return (
    <motion.div {...fade(0.1)} className="hero-intelligence-panel">
      <div className="hero-intelligence-head">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {hasLiveAuctions ? "Live intelligence" : "Marketplace intelligence"}
            </p>
            <p className="text-sm font-bold tracking-tight text-foreground">{panelTitle}</p>
          </div>
        </div>
        {hasLiveAuctions ? (
          <span className="hero-intelligence-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        ) : null}
      </div>

      <div className="hero-dashboard-grid">
        <AnimatePresence mode="popLayout">
          {visibleCards.slice(0, 4).map((card, i) => (
            <motion.div
              key={`${card.type}-${card.title}-${rotateIndex}-${i}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className={card.type === "stats" ? "col-span-2" : undefined}
            >
              <DashboardCard card={card} delay={0.05 + i * 0.04} aiConfigured={aiConfigured} />
            </motion.div>
          ))}
        </AnimatePresence>

        {visibleCards.length === 3 && (
          <motion.div {...fade(0.35)} className="hero-dash-card col-span-2">
            <div className="flex items-center justify-between">
              <p className="hero-dash-kpi-label">Marketplace momentum</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {hasLiveAuctions ? liveAuctionsCount : pool?.listingCount ?? 0}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">
                  {hasLiveAuctions ? "auction lots" : "featured listings"}
                </span>
              </p>
              <div className="flex h-10 flex-1 max-w-[130px] items-end gap-0.5">
                {[40, 65, 45, 80, 55, 95, 70].map((h, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-sm bg-primary/85 transition-all duration-500"
                    style={{ height: `${h + (rotateIndex % 3) * 3}%` }}
                  />
                ))}
              </div>
            </div>
            <p className="hero-dash-meta mt-2 flex items-center gap-1">
              <Users className="h-3 w-3" />{" "}
              {dealerCountText ? `${dealerCountText} verified dealers` : "Verified dealers"}
            </p>
          </motion.div>
        )}
      </div>

      <div className="hero-dashboard-tags">
        {dashboardTags.map((tag) => (
          <span key={tag} className="hero-dashboard-tag">
            {tag.toLowerCase().includes("auction") ? <Gavel className="h-3 w-3" /> : null}
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
