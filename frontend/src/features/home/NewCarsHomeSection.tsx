import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { NewCarModelCard } from "@/features/new-cars/components/NewCarModelCard";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { HOME_DEMO_NEW_MODELS } from "@/features/home/data/home-demo-showcase";
import { BUY_CAR_BRANDS } from "@/features/marketplace/data/buy-brands";
import { groupNewCarsByModel } from "@/features/new-cars/services/new-cars.service";
import { SectionHeader } from "./SectionHeader";

const HOME_BRAND_CHIPS = BUY_CAR_BRANDS.slice(0, 8);

export function NewCarsHomeSection() {
  const { newCars, isLive } = useHomePage();
  const fromLive = groupNewCarsByModel(newCars).slice(0, 4);
  const models = fromLive.length ? fromLive : HOME_DEMO_NEW_MODELS;
  const isDemo = !fromLive.length;

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow={isDemo ? "New cars · demo showcase" : "New cars"}
          title="Popular models"
          description={
            isDemo
              ? "Preview how OEM model cards look — live dealer stock replaces this when inventory is synced."
              : "On-road price, variants and dealer offers — synced from showroom inventory."
          }
          href="/buy/cars/new"
          linkLabel="Browse new cars"
        />
        <div className="partner-scroll flex gap-2 pb-1">
          {HOME_BRAND_CHIPS.map((b) => (
            <Link
              key={b.id}
              to={`/buy/cars/new?brand=${encodeURIComponent(b.brand)}`}
              className="partner-pill group inline-flex h-11 items-center gap-2 px-3.5 hover:text-primary"
              aria-label={`Browse ${b.name}`}
            >
              {b.logo ? <BrandLogo src={b.logo} alt={b.name} size="sm" /> : null}
              <span className="text-xs font-semibold">{b.name}</span>
            </Link>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {models.map((g, i) => (
            <NewCarModelCard key={g.id} group={g} index={i} />
          ))}
        </div>
        {!isLive && isDemo ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Demo models for presentation — not live dealer stock.
          </p>
        ) : null}
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/buy/cars/new">
              View all new cars <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
