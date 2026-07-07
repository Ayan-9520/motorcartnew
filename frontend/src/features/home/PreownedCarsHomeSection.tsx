import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreownedCarCard } from "@/features/preowned-cars/components/PreownedCarCard";
import { TRUST_BADGES } from "@/features/preowned-cars/data/preowned-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { SectionHeader } from "./SectionHeader";

export function PreownedCarsHomeSection() {
  const { preownedCars } = useHomePage();
  const featured = preownedCars.slice(0, 4);

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Certified pre-owned"
          title="Inspected pre-owned you can trust"
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
          {featured.map((v, i) => (
            <PreownedCarCard key={v.id} vehicle={v} index={i} compact />
          ))}
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
