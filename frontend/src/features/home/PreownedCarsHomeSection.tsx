import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreownedCarCard } from "@/features/preowned-cars/components/PreownedCarCard";
import { TRUST_BADGES } from "@/features/preowned-cars/data/preowned-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { HOME_DEMO_PREOWNED } from "@/features/home/data/home-demo-showcase";
import { SectionHeader } from "./SectionHeader";
import { realDataOnly } from "@/config/real-data";

export function PreownedCarsHomeSection() {
  const { preownedCars } = useHomePage();
  const list = preownedCars.length ? preownedCars.slice(0, 4) : HOME_DEMO_PREOWNED;
  const isDemo = !preownedCars.length;

  if (isDemo && realDataOnly) {
    return (
      <section className="home-section-alt">
        <div className="container home-stack">
          <SectionHeader
            eyebrow="Pre-owned"
            title="Inspected cars you can trust"
            description="Verified dealer and owner listings with EMI and inspection details."
            href="/buy/cars/used"
            linkLabel="Browse pre-owned"
          />
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-dashed p-8 text-center">
            <p className="w-full text-sm text-muted-foreground">Fresh pre-owned stock is being added. Browse all listings or list your own car.</p>
            <Button size="sm" className="rounded-lg" asChild>
              <Link to="/buy/cars/used">Browse pre-owned</Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link to="/sell/cars">Sell your car</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow={isDemo ? "Pre-owned · demo showcase" : "Certified pre-owned"}
          title="Inspected cars you can trust"
          description={
            isDemo
              ? "Sample certified listings for demo — live inventory appears here when dealers upload stock."
              : "AI fair price, 200+ point reports, warranty & loan-ready stock from verified dealers."
          }
          href="/buy/cars/used"
          linkLabel="Browse pre-owned"
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
          {list.map((v, i) => (
            <PreownedCarCard key={v.id} vehicle={v} index={i} compact />
          ))}
        </div>
        {isDemo ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Demo listings for presentation — not live marketplace stock.
          </p>
        ) : null}
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/buy/cars/used">
              Browse certified pre-owned <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
