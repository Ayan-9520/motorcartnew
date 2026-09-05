import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  HandCoins,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import { SELL_HUB_CATEGORIES } from "../data/sell-hub-categories";
import { SellCategoryCard } from "../components/SellCategoryCard";
import { MarketplaceHubHero } from "../components/MarketplaceHubHero";
import { getHubCopy } from "../data/marketplace-hub-config";
import { buyListingPath, parseHubCategorySlug, sellListingPath } from "../lib/route-utils";

const STEPS = [
  {
    title: "Choose category",
    desc: "Car, bike, truck, bus, auto, equipment or EV.",
  },
  {
    title: "Add vehicle details",
    desc: "Brand, year, kms, city & photos — about 5 minutes.",
  },
  {
    title: "Get dealer offers",
    desc: "Open a sell request so verified dealers can bid.",
  },
];

const BENEFITS = [
  {
    icon: HandCoins,
    title: "Real purchase offers",
    desc: "Dealers respond on open sell requests — not fake lead spam.",
  },
  {
    icon: ShieldCheck,
    title: "Verified marketplace",
    desc: "List once. Reach serious buyers across Motorcart.",
  },
  {
    icon: Clock3,
    title: "List in minutes",
    desc: "Simple form, photo upload, indicative estimate on the side.",
  },
  {
    icon: BadgeCheck,
    title: "Free for owners",
    desc: "Individual sellers list free. Dealers use bulk upload tools.",
  },
];

export function SellHubPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeHub = useVehicleHubStore((s) => s.activeHub);
  const setActiveHub = useVehicleHubStore((s) => s.setActiveHub);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);
  const copy = getHubCopy(activeHub);

  const hubParam = searchParams.get("hub");
  const typeParam = searchParams.get("type");

  useEffect(() => {
    const parsed = parseHubCategorySlug(hubParam ?? undefined);
    if (parsed) {
      setActiveHub(parsed);
      setBuyContext(parsed, "used");
    }
  }, [hubParam, setActiveHub, setBuyContext]);

  useEffect(() => {
    const hub = parseHubCategorySlug(hubParam ?? undefined);
    if (hub) {
      navigate(sellListingPath(hub), { replace: true });
    }
  }, [hubParam, navigate]);

  useEffect(() => {
    const hub = parseHubCategorySlug(typeParam ?? undefined);
    if (hub) {
      navigate(sellListingPath(hub), { replace: true });
    }
  }, [typeParam, navigate]);

  useEffect(() => {
    setPageMeta({
      title: copy.sellTitle,
      description: `${copy.sellSubtitle} on Motorcart.in`,
    });
  }, [copy]);

  return (
    <div className="sell-hub-page sell-hub-premium min-h-screen">
      <MarketplaceHubHero mode="sell" />

      <div className="sell-trust-strip">
        <div className="container">
          <ul className="sell-trust-strip-list">
            <li>Free individual listings</li>
            <li>Verified dealer network</li>
            <li>Indicative price estimate</li>
            <li>Pan-India reach</li>
          </ul>
        </div>
      </div>

      <div className="container space-y-12 pb-16 pt-8 md:space-y-14 md:pb-20 md:pt-10">
        <section aria-labelledby="sell-how-heading">
          <div className="sell-section-header">
            <h2 id="sell-how-heading" className="sell-section-title">
              How selling works
            </h2>
            <p className="sell-section-sub">Three clear steps from photo to offers.</p>
          </div>
          <ol className="sell-steps-grid">
            {STEPS.map((step, i) => (
              <li key={step.title} className="sell-step-card">
                <span className="sell-step-num">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="sell-categories-heading">
          <div className="sell-section-header sell-section-header--row">
            <div>
              <h2 id="sell-categories-heading" className="sell-section-title">
                What are you selling?
              </h2>
              <p className="sell-section-sub">
                Pick a category to open the listing form. Hub icons above switch the featured type.
              </p>
            </div>
            <Button className="hidden shrink-0 rounded-xl shadow-[var(--shadow-primary)] sm:inline-flex" asChild>
              <Link to={sellListingPath(activeHub)}>
                List {copy.plural.toLowerCase()}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="sell-category-grid mt-6">
            {SELL_HUB_CATEGORIES.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className={item.id === activeHub ? "sell-category-grid-item--active" : undefined}
              >
                <SellCategoryCard item={item} featured={item.id === activeHub} />
              </motion.div>
            ))}
          </div>
        </section>

        <section aria-labelledby="sell-benefits-heading" className="sell-benefits-panel">
          <div className="sell-section-header">
            <h2 id="sell-benefits-heading" className="sell-section-title">
              Why sell on Motorcart
            </h2>
            <p className="sell-section-sub">Built for owners — not another classified spam wall.</p>
          </div>
          <div className="sell-benefits-grid">
            {BENEFITS.map((b) => (
              <div key={b.title} className="sell-benefit-card">
                <span className="sell-benefit-icon">
                  <b.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sell-secondary-actions">
          <div className="sell-secondary-card">
            <div>
              <p className="text-sm font-semibold text-foreground">Check the buyers’ market</p>
              <p className="mt-1 text-xs text-muted-foreground">
                See live pre-owned prices for {copy.plural.toLowerCase()} before you list.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={buyListingPath(activeHub, "used")}>Browse pre-owned</Link>
            </Button>
          </div>
          <div className="sell-secondary-card">
            <div>
              <p className="text-sm font-semibold text-foreground">Dealer or fleet seller?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bulk inventory tools live in the dealer workspace.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/dashboard/dealer">
                <Store className="mr-1.5 h-4 w-4" />
                Dealer workspace
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
