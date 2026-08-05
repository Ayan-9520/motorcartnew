import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { SITE_STATS } from "@/content/site-content";
import { HERO_STATS } from "@/features/home/data/homepage-data";
import { useHomePage, type HomeHeroStatItem } from "@/features/home/context/HomePageContext";
import { realDataOnly } from "@/config/real-data";

function pickStat(keywords: string[], stats: ReadonlyArray<HomeHeroStatItem>) {
  return stats.find((s) => keywords.some((k) => s.label.toLowerCase().includes(k)));
}

export function HeroLiveStatsBar() {
  const { heroStats, isLoading } = useHomePage();
  const stats: HomeHeroStatItem[] = heroStats.length
    ? heroStats
    : realDataOnly
      ? []
      : [...HERO_STATS];

  const items = [
    pickStat(["dealer", "verified"], stats),
    pickStat(["finance", "bank", "lender", "loan"], stats),
    pickStat(["community", "post", "member", "customer", "user"], stats),
    pickStat(["auction", "live"], stats),
    pickStat(["listing", "vehicle"], stats),
  ].filter(Boolean) as Array<{ label: string; value: string; href: string }>;

  const fallback = realDataOnly ? [] : SITE_STATS.map((s) => ({
    label: s.label,
    value: s.value,
    href: "#",
  }));

  const pills = items.length >= 2 ? items : fallback;

  if (!pills.length && !isLoading) return null;

  return (
    <div className="hero-live-stats-bar">
      <Shield className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      {isLoading ? (
        <span className="text-primary/80">Syncing live marketplace…</span>
      ) : (
        pills.map((item, i) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            {i > 0 && <span className="hero-live-stat-sep" aria-hidden>·</span>}
            <Link to={item.href} className="hero-live-stat-link group">
              <span className="font-bold text-foreground group-hover:text-primary">{item.value}</span>
              <span className="text-primary/90">{item.label}</span>
            </Link>
          </span>
        ))
      )}
    </div>
  );
}
