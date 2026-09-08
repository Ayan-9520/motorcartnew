import { useEffect, useMemo, useRef, useState } from "react";
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
import { PHASE1_ROTATING_LINES } from "@/features/home/data/phase1-home-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { HUB_HERO_IMAGES } from "@/lib/media/india-media-catalog";

/** Local muted cinematic car loop for homepage hero. */
const HERO_CAR_VIDEO_SRC = "/brand/hero-car-loop.mp4";
const HERO_HOME_POSTER = "/brand/hero-automotive-premium-v2.webp";

const HOME_TAGLINE = "Buy · sell · finance · auction — one automotive operating system.";

const HOME_ROTATING = [
  "Live dealer inventory across India",
  "Bank-grade vehicle finance in one flow",
  "Auctions, community & services — unified",
  "AI-powered search for every vehicle type",
] as const;

export function HeroSection() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode } = useHeroSearch();
  const hub = getHeroHubConfig(mode);
  const { heroStats, data } = useHomePage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);

  const hubPoster =
    mode in HUB_HERO_IMAGES
      ? HUB_HERO_IMAGES[mode as keyof typeof HUB_HERO_IMAGES]
      : undefined;
  const posterSrc = isHome ? HERO_HOME_POSTER : (hubPoster ?? HERO_HOME_POSTER);
  const showHeroVideo = isHome && !preferReducedMotion;

  const rotatingLines = useMemo(() => {
    if (isHome) {
      const lines: string[] = [...HOME_ROTATING];
      heroStats.slice(0, 2).forEach((s) => {
        lines.push(`${s.value} ${s.label.toLowerCase()}`);
      });
      if (data?.generated_at) {
        lines.push("Marketplace synced in real time");
      }
      return lines.length ? lines : [...PHASE1_ROTATING_LINES];
    }
    return [...HERO_HEADLINE_WORDS];
  }, [isHome, heroStats, data?.generated_at]);

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPreferReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingLines.length);
    }, 3400);
    return () => clearInterval(id);
  }, [rotatingLines.length]);

  useEffect(() => {
    setVideoReady(false);
    const el = videoRef.current;
    if (!el || !showHeroVideo) return;
    el.muted = true;
    const play = () => {
      void el.play().then(() => setVideoReady(true)).catch(() => setVideoReady(false));
    };
    if (el.readyState >= 2) play();
    else el.addEventListener("loadeddata", play, { once: true });
    return () => el.removeEventListener("loadeddata", play);
  }, [showHeroVideo, posterSrc]);

  return (
    <section
      className={`hero-section hero-section--photo relative overflow-hidden border-b border-border${
        isHome ? " hero-section--cinematic hero-section--premium" : ""
      }`}
    >
      <div className="hero-section-bg" aria-hidden>
        <img
          src={posterSrc}
          alt=""
          className={`hero-section-bg-photo${videoReady && showHeroVideo ? " hero-section-bg-photo--behind-video" : ""}`}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {showHeroVideo ? (
          <video
            ref={videoRef}
            className={`hero-section-bg-video${videoReady ? " hero-section-bg-video--ready" : ""}`}
            src={HERO_CAR_VIDEO_SRC}
            poster={HERO_HOME_POSTER}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            aria-hidden
          />
        ) : null}
        <div className="hero-section-bg-cinematic" />
        <div className="hero-section-bg-overlay" />
        <div className="hero-section-bg-mesh" />
      </div>

      <div className={`container relative z-[1]${isHome ? " hero-premium-inner" : " py-8 md:py-11 lg:py-12"}`}>
        <div className={isHome ? "hero-layout-premium" : "hero-layout-grid"}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="hero-layout-left min-w-0 space-y-4 md:space-y-5"
          >
            {!isHome ? <HeroLiveStatsBar /> : null}

            <div className="space-y-3">
              {isHome ? (
                <h1 className="hero-headline hero-headline--cinematic">
                  <span className="hero-headline-kicker">India&apos;s automotive OS</span>
                  <span className="hero-headline-line">Buy, finance &amp; auction</span>
                  <span className="hero-headline-line hero-headline-accent hero-headline-shimmer">
                    with AI speed
                  </span>
                </h1>
              ) : (
                <h1 className="hero-headline">
                  <span className="hero-headline-line hero-headline-muted">India&apos;s</span>
                  <span className="hero-headline-line hero-headline-accent">AI-powered</span>
                  <span className="hero-headline-line">automotive ecosystem</span>
                </h1>
              )}
              <p className="hero-rotating-line hero-rotating-line--premium">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${mode}-${wordIndex}-${rotatingLines[wordIndex]}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="font-semibold text-primary"
                  >
                    {rotatingLines[wordIndex]}
                  </motion.span>
                </AnimatePresence>
                {!isHome && (
                  <span className="text-muted-foreground"> — {hub.headlineSuffix}.</span>
                )}
              </p>
              {isHome ? <p className="hero-tagline-cinematic">{HOME_TAGLINE}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {isHome ? (
                <>
                  <Button
                    size="lg"
                    className="hero-cta-primary h-11 rounded-xl px-6 font-semibold shadow-[var(--shadow-primary)]"
                    asChild
                  >
                    <Link to="/buy">
                      Explore vehicles <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="hero-cta-ghost h-11 rounded-xl px-5" asChild>
                    <Link to="/auctions">Live auctions</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="hero-cta-ghost h-11 rounded-xl px-5" asChild>
                    <Link to="/community">Join community</Link>
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

            <div className={isHome ? "hero-search-premium-wrap" : undefined}>
              <HeroSearchModule />
            </div>
          </motion.div>

          {!isHome ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="hero-layout-right hidden min-w-0 md:flex md:flex-col lg:sticky lg:top-[calc(var(--nav-height,4rem)+0.75rem)]"
            >
              <HeroDashboardPanel />
            </motion.div>
          ) : null}
        </div>

        {/* Home: no vehicle cards / AI picks here — inventory lives below hero once */}
        {!isHome ? <HeroSearchInsights /> : null}
      </div>
    </section>
  );
}
