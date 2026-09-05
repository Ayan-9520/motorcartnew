import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { DealersHubHero } from "../components/DealersHubHero";
import { DealersFintechStrip } from "../components/DealersFintechStrip";
import { DealerCategoryCard } from "../components/DealerCategoryCard";
import { DealerNetworkCard } from "../components/DealerNetworkCard";
import { DealersBrandStrip } from "../components/DealersBrandStrip";
import {
  DEALER_CATEGORIES,
  DEALERS_TRUST_STATS,
  HOW_DEALER_WORKS,
  dealersBrowsePath,
} from "../data/dealers-hub-data";
import { fetchHomePageApi } from "@/integrations/api/home";
import { useDealerDirectory } from "../hooks/useDealerDirectory";

export function DealersHubPage() {
  const homeQ = useQuery({
    queryKey: ["home-page"],
    queryFn: fetchHomePageApi,
    staleTime: 30_000,
    retry: 0,
  });
  const dealerCount = homeQ.data?.stats?.dealers ?? 0;
  const { dealers: directoryDealers } = useDealerDirectory({ verifiedOnly: true });
  const featured = directoryDealers.filter((d) => d.isVerified).slice(0, 6);

  useEffect(() => {
    setPageMeta({
      title: "Dealer Network — Motorcart",
      description: "Find verified automotive dealers across India — new, used, bikes, commercial & EV with CRM & AI leads.",
    });
  }, []);

  return (
    <div className="dealers-hub-page min-h-screen">
      <DealersHubHero dealerCount={dealerCount} />

      <div className="container -mt-2 mb-6 flex flex-wrap justify-center gap-3">
        {DEALERS_TRUST_STATS.map(({ label, sub }) => (
          <span key={sub} className="dealers-hub-stat-pill">
            <strong>{label}</strong> {sub}
          </span>
        ))}
      </div>

      <DealersFintechStrip />

      <section className="container pb-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="dealers-hub-section-title">Browse by vertical</h2>
            <p className="mt-1 text-sm text-muted-foreground">OEM, pre-owned, 2W, fleet &amp; EV specialists</p>
          </div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={dealersBrowsePath()}>
              Full directory <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="dealers-hub-category-grid">
          {DEALER_CATEGORIES.map((cat) => (
            <DealerCategoryCard key={cat.slug} category={cat} />
          ))}
        </div>
      </section>

      <DealersBrandStrip />

      <section className="container border-t border-border/80 pb-10 pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="dealers-hub-section-title flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              Featured dealers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Verified partners from the dealer directory</p>
          </div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={dealersBrowsePath({ verified: true })}>All verified</Link>
          </Button>
        </div>
        <div className="dealers-network-grid">
          {featured.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No featured dealers yet.</p>
          ) : (
            featured.map((d, i) => <DealerNetworkCard key={d.id} dealer={d} index={i} />)
          )}
        </div>
      </section>

      <section className="container pb-10">
        <h2 className="dealers-hub-section-title mb-6 text-center">How partner onboarding works</h2>
        <ol className="dealers-how-grid">
          {HOW_DEALER_WORKS.map((step) => (
            <li key={step.step} className="dealers-how-step">
              <span className="dealers-how-num">{step.step}</span>
              <h3 className="font-bold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container pb-14">
        <div className="dealers-hub-footer-cta text-center">
          <h3 className="text-lg font-bold text-foreground">Grow with Motorcart Dealer CRM</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            AI-scored leads, WhatsApp automation, bulk inventory &amp; analytics — join verified partners.
          </p>
          <Button className="mt-5 rounded-xl shadow-[var(--shadow-primary)]" asChild>
            <Link to="/dashboard/dealer">
              Apply as dealer <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
