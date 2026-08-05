import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreownedCarCard } from "@/features/preowned-cars/components/PreownedCarCard";
import { TRUST_BADGES } from "@/features/preowned-cars/data/preowned-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { SectionHeader } from "./SectionHeader";

export function PreownedCarsHomeSection() {
  const { preownedCars } = useHomePage();

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Certified pre-owned"
          title={preownedCars.length > 0 ? `Inspected pre-owned (${preownedCars.length})` : "Inspected pre-owned you can trust"}
          description="AI fair price, 200+ point reports, warranty & loan-ready inventory from verified dealers."
          href="/used-cars"
          linkLabel="Pre-owned cars hub"
        />
        <div className="flex flex-wrap gap-2">
          {TRUST_BADGES.map((b) => (
            <span
              key={b.id}
              className="hero-trust-pill border-primary/20 bg-primary/5 text-foreground"
            >
              {b.label}
            </span>
          ))}
        </div>
        <div className="vehicle-card-grid">
          {preownedCars.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm font-semibold">No pre-owned cars listed yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload at{" "}
                <Link to="/dashboard/dealer/inventory/excel" className="font-medium text-primary hover:underline">
                  Bulk Excel upload
                </Link>{" "}
                or{" "}
                <Link to="/sell/cars" className="font-medium text-primary hover:underline">
                  sell your car
                </Link>
                .
              </p>
            </div>
          ) : (
            preownedCars.map((v, i) => <PreownedCarCard key={v.id} vehicle={v} index={i} compact />)
          )}
        </div>
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/used-cars/browse">
              Browse certified pre-owned <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
