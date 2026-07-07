import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCarCard } from "@/features/new-cars/components/NewCarCard";
import { NEW_CAR_BRANDS } from "@/features/new-cars/data/new-cars-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { SectionHeader } from "./SectionHeader";

export function NewCarsHomeSection() {
  const { newCars, data } = useHomePage();
  const featured = newCars.slice(0, 4);
  const brands =
    data?.brands?.length && data.brands.length >= 4
      ? data.brands.slice(0, 8).map((b) => ({ slug: b.slug, name: b.name, href: `/buy/cars?brand=${encodeURIComponent(b.name)}` }))
      : NEW_CAR_BRANDS.slice(0, 8);

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="New cars"
          title="Latest models & launch offers"
          description="On-road price, EMI, test drives and OEM dealer offers — AI compared for you."
          href="/new-cars"
          linkLabel="New cars hub"
        />
        <div className="partner-scroll flex gap-2 pb-1">
          {brands.map((b) => (
            <Link key={b.slug} to={b.href} className="partner-pill hover:text-primary">
              {b.name}
            </Link>
          ))}
        </div>
        <div className="vehicle-card-grid">
          {featured.map((v, i) => (
            <NewCarCard key={v.id} vehicle={v} index={i} compact />
          ))}
        </div>
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/new-cars/browse">
              Browse all new cars <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
