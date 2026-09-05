import { Link } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_TAGLINE } from "@/lib/constants";
import { getAllVehicleHubs } from "../data/ecosystem-registry";
import { EcosystemHubCard } from "./EcosystemHubCard";

export function EcosystemHomeOverview() {
  const hubs = getAllVehicleHubs();

  return (
    <div className="eco-home">
      <section className="eco-home-hero">
        <div className="container eco-home-hero-inner">
          <p className="eco-home-eyebrow">
            <Shield className="h-3.5 w-3.5" />
            India&apos;s unified vehicle platform
          </p>
          <h1 className="eco-home-title">Choose your vehicle world</h1>
          <p className="eco-home-subtitle">{SITE_TAGLINE}</p>
          <p className="eco-home-lead">
            Six dedicated ecosystems — cars, bikes, trucks, buses, electric &amp; auto.
            Each hub has its own listings, finance, service &amp; sell flows.
          </p>
          <div className="eco-home-ctas">
            <Button asChild className="h-11 rounded-xl px-6 font-semibold shadow-[var(--shadow-primary)]">
              <Link to="/buy">
                Browse vehicles <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl px-6">
              <Link to="/dealers">Find dealers</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="eco-home-hubs container pb-16 md:pb-20">
        <div className="eco-home-hubs-header">
          <h2 className="eco-home-hubs-title">Vehicle hubs</h2>
          <p className="eco-home-hubs-desc">Tap a category — opens only that ecosystem</p>
        </div>
        <div className="eco-hub-grid">
          {hubs.map((hub) => (
            <EcosystemHubCard key={hub.slug} hub={hub} />
          ))}
        </div>
      </section>

      <section className="eco-home-trust border-t border-border/80">
        <div className="container eco-home-trust-inner">
          <div className="eco-home-trust-item">
            <strong>Trusted</strong>
            <span>Buyers</span>
          </div>
          <div className="eco-home-trust-item">
            <strong>Verified</strong>
            <span>Dealers</span>
          </div>
          <div className="eco-home-trust-item">
            <strong>Lender</strong>
            <span>Lenders</span>
          </div>
          <div className="eco-home-trust-item">
            <strong>AI</strong>
            <span>Fair price &amp; match</span>
          </div>
        </div>
      </section>
    </div>
  );
}
