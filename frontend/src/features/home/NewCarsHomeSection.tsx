import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCarModelCard } from "@/features/new-cars/components/NewCarModelCard";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { HOME_DEMO_NEW_MODELS } from "@/features/home/data/home-demo-showcase";
import { groupNewCarsByModel } from "@/features/new-cars/services/new-cars.service";
import { SectionHeader } from "./SectionHeader";

export function NewCarsHomeSection() {
  const { newCars, data, isLive } = useHomePage();
  const fromLive = groupNewCarsByModel(newCars).slice(0, 4);
  const models = fromLive.length ? fromLive : HOME_DEMO_NEW_MODELS;
  const isDemo = !fromLive.length;
  const brands = (data?.brands ?? []).slice(0, 10).map((b) => ({
    slug: b.slug,
    name: b.name,
    href: `/buy/cars/new?brand=${encodeURIComponent(b.name)}`,
  }));

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
        {brands.length > 0 ? (
          <div className="partner-scroll flex gap-2 pb-1">
            {brands.map((b) => (
              <Link key={b.slug} to={b.href} className="partner-pill hover:text-primary">
                {b.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className="partner-scroll flex gap-2 pb-1">
            {["Hyundai", "Maruti", "Tata", "Mahindra", "Toyota", "Kia"].map((name) => (
              <Link
                key={name}
                to={`/buy/cars/new?brand=${encodeURIComponent(name)}`}
                className="partner-pill hover:text-primary"
              >
                {name}
              </Link>
            ))}
          </div>
        )}
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
