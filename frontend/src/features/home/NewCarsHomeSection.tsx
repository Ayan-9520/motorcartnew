import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCarCard } from "@/features/new-cars/components/NewCarCard";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { SectionHeader } from "./SectionHeader";

export function NewCarsHomeSection() {
  const { newCars, data } = useHomePage();
  const brands = (data?.brands ?? []).slice(0, 12).map((b) => ({
    slug: b.slug,
    name: b.name,
    href: `/buy/cars/new?brand=${encodeURIComponent(b.name)}`,
  }));

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="New cars"
          title={newCars.length > 0 ? `Latest models (${newCars.length})` : "Latest models & launch offers"}
          description="On-road price, EMI, test drives and OEM dealer offers — synced live from dealer inventory."
          href="/buy/cars/new"
          linkLabel="New cars hub"
        />
        {brands.length > 0 ? (
          <div className="partner-scroll flex gap-2 pb-1">
            {brands.map((b) => (
              <Link key={b.slug} to={b.href} className="partner-pill hover:text-primary">
                {b.name}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="vehicle-card-grid">
          {newCars.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm font-semibold">No new cars listed yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dealers add OEM stock at{" "}
                <Link to="/dashboard/dealer/inventory" className="font-medium text-primary hover:underline">
                  Dealer inventory
                </Link>
                .
              </p>
            </div>
          ) : (
            newCars.map((v, i) => <NewCarCard key={v.id} vehicle={v} index={i} compact />)
          )}
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
