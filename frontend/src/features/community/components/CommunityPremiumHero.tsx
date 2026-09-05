import { Link } from "react-router-dom";
import { ArrowRight, Radio, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMUNITY_LIVE_STATS } from "../data/community-premium-data";

export function CommunityPremiumHero() {
  return (
    <section className="community-premium-hero" aria-labelledby="community-premium-title">
      <div className="community-premium-hero-mesh" aria-hidden />
      <div className="community-premium-hero-grid" aria-hidden />

      <div className="container relative">
        <div className="community-premium-hero-inner">
          <div className="community-premium-hero-copy">
            <p className="community-premium-eyebrow">
              <span className="community-premium-live-dot" aria-hidden />
              <Radio className="h-3.5 w-3.5" />
              Motorcart Social · Live across India
            </p>
            <h1 id="community-premium-title" className="community-premium-title">
              Where India&apos;s <span className="text-primary">auto passion</span> meets
            </h1>
            <p className="community-premium-lead">
              Verified dealers, real owners, and creators — reviews, launches, deals, and honest
              vehicle talk in one premium feed.
            </p>
            <div className="community-premium-hero-actions">
              <Button className="h-11 rounded-xl px-6 font-semibold shadow-[var(--shadow-primary)]" asChild>
                <Link to="/signup">
                  Join the community
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="h-11 rounded-xl border-primary/25 px-6" asChild>
                <Link to="/community/groups">
                  <Users className="mr-2 h-4 w-4" />
                  Explore groups
                </Link>
              </Button>
            </div>
          </div>

          <div className="community-premium-hero-card">
            <div className="community-premium-hero-card-head">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Today on Motorcart</span>
            </div>
            <ul className="community-premium-hero-card-list">
              <li>
                <strong>0</strong> new posts in the last 24h
              </li>
              <li>
                <strong>0</strong> dealer promotions live
              </li>
              <li>
                <strong>0</strong> expert reviews published
              </li>
            </ul>
            <p className="community-premium-hero-card-foot">
              AI-moderated · Verified badges · Spam-safe
            </p>
          </div>
        </div>

        <dl className="community-premium-stats">
          {COMMUNITY_LIVE_STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="community-premium-stat">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <dt className="sr-only">{label}</dt>
                <dd className="community-premium-stat-value">{value}</dd>
                <dd className="community-premium-stat-label">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
