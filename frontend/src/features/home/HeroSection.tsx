import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSearchModule } from "@/features/home/components/HeroSearchModule";
import { HeroSearchInsights } from "@/features/home/components/HeroSearchInsights";
import { HeroDashboardPanel } from "@/features/home/components/HeroDashboardPanel";
import { HeroLiveStatsBar } from "@/features/home/components/HeroLiveStatsBar";
import { useHeroSearch } from "@/features/home/components/hero-search-context";
import { getHeroHubConfig } from "@/features/home/data/hero-hub-config";
import { HERO_HEADLINE_WORDS } from "@/features/home/data/homepage-data";
import { PHASE1_ROTATING_LINES, PHASE1_TAGLINE } from "@/features/home/data/phase1-home-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { realDataOnly } from "@/config/real-data";
import { formatPrice } from "@/lib/vehicle-utils";
import { formatCurrency } from "@/lib/utils";
import { HUB_HERO_IMAGES, MEDIA_DEFAULTS } from "@/lib/media/india-media-catalog";

export function HeroSection() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode } = useHeroSearch();
  const hub = getHeroHubConfig(mode);
  const { featuredVehicles, auctions, heroStats, data } = useHomePage();

  const rotatingLines = useMemo(() => {
    if (!isHome) return [...HERO_HEADLINE_WORDS];

    const dynamic: string[] = [];
    featuredVehicles.slice(0, 3).forEach((v) => {
      dynamic.push(`${v.brand} ${v.model} — ${formatPrice(v.price)}`);
    });
    auctions.slice(0, 2).forEach((a) => {
      dynamic.push(`Live auction: ${a.title} · ${formatCurrency(a.currentBid)}`);
    });
    heroStats.slice(0, 2).forEach((s) => {
      dynamic.push(`${s.value} ${s.label.toLowerCase()}`);
    });
    if (data?.generated_at) {
      dynamic.push("Inventory refreshed from live marketplace");
    }

    return dynamic.length >= 1
      ? dynamic
      : realDataOnly
        ? ["Live marketplace — browse dealer inventory"]
        : [...PHASE1_ROTATING_LINES];
  }, [isHome, featuredVehicles, auctions, heroStats, data?.generated_at]);

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingLines.length);
    }, 3200);
    return () => clearInterval(id);
  }, [rotatingLines.length]);

  return (
    <section className="hero-section hero-section--photo relative overflow-hidden border-b border-border">
      <div className="hero-section-bg" aria-hidden>
        <img
          src={MEDIA_DEFAULTS.vehicleWide}
          alt=""
          className="hero-section-bg-photo"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <img
          src={HUB_HERO_IMAGES.cars}
          alt=""
          className="hero-section-bg-brand"
          loading="eager"
          decoding="async"
          aria-hidden
        />
        <div className="hero-section-bg-overlay" />
        <div className="hero-section-bg-mesh" />
      </div>
      <div className="hero-section-glow" aria-hidden />

      <div className="container relative z-[1] py-8 md:py-11 lg:py-12">
        <div className="hero-layout-grid">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="hero-layout-left min-w-0 space-y-5"
          >
            <HeroLiveStatsBar />

            <motion.div className="space-y-3">
              <h1 className="hero-headline">
                <span className="hero-headline-line hero-headline-muted">India&apos;s</span>
                <span className="hero-headline-line hero-headline-accent">AI-powered</span>
                <span className="hero-headline-line">automotive ecosystem</span>
              </h1>
              <p className="hero-rotating-line">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${mode}-${wordIndex}-${rotatingLines[wordIndex]}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="font-semibold text-primary"
                  >
                    {rotatingLines[wordIndex]}
                  </motion.span>
                </AnimatePresence>
                {!isHome && (
                  <span className="text-muted-foreground"> — {hub.headlineSuffix}.</span>
                )}
              </p>
              {isHome && (
                <p className="max-w-xl text-sm text-muted-foreground md:text-base">{PHASE1_TAGLINE}</p>
              )}
            </motion.div>

            <div className="flex flex-wrap gap-2">
              {isHome ? (
                <>
                  <Button
                    size="default"
                    className="h-10 rounded-xl px-5 font-semibold shadow-[var(--shadow-primary)]"
                    asChild
                  >
                    <Link to="/buy/cars/used">
                      Explore vehicles <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="default" variant="outline" className="h-10 rounded-xl px-5" asChild>
                    <Link to="/community">Join community</Link>
                  </Button>
                  <Button size="default" variant="outline" className="h-10 rounded-xl px-5" asChild>
                    <Link to="/auctions">Live auctions</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="default"
                    className="h-10 rounded-xl px-5 font-semibold shadow-[var(--shadow-primary)]"
                    asChild
                  >
                    <Link to={hub.primaryCta.href}>
                      {hub.primaryCta.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="default" variant="outline" className="h-10 rounded-xl px-5" asChild>
                    <Link to={hub.secondaryCta.href}>{hub.secondaryCta.label}</Link>
                  </Button>
                </>
              )}
            </div>

            <HeroSearchModule />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="hero-layout-right hidden min-w-0 md:flex md:flex-col lg:sticky lg:top-[calc(var(--nav-height,4rem)+0.75rem)]"
          >
            <HeroDashboardPanel />
          </motion.div>
        </div>

        <HeroSearchInsights />
      </div>
    </section>
  );
}
