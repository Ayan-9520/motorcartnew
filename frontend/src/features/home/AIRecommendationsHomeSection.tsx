import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { HOME_AI_RECOMMENDATIONS } from "@/features/home/data/homepage-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { auctionDetailPath } from "@/features/auctions/lib/auction-utils";
import { formatPrice, vehicleDetailPath } from "@/lib/vehicle-utils";
import { SectionHeader } from "./SectionHeader";

export function AIRecommendationsHomeSection() {
  const { featuredVehicles, auctions, loanProducts, isLive } = useHomePage();

  const liveItems =
    isLive && (featuredVehicles.length || auctions.length || loanProducts.length)
      ? [
          ...featuredVehicles.slice(0, 2).map((v) => ({
            id: v.id,
            title: `${v.brand} ${v.model}`,
            subtitle: `${formatPrice(v.price)} · ${v.city ?? "India"} · AI match`,
            href: vehicleDetailPath(v),
            badge: v.isCertified ? "Certified" : "AI Pick",
          })),
          ...auctions.slice(0, 1).map((a) => ({
            id: a.id,
            title: a.title,
            subtitle: `Live auction · ${a.bidCount} bids`,
            href: auctionDetailPath(a),
            badge: "Live bid",
          })),
          ...loanProducts.slice(0, 1).map((l) => ({
            id: l.id,
            title: `${l.bank_name} auto loan`,
            subtitle: `From ${l.interest_rate_min}% · up to ₹${Math.round(l.max_loan_amount / 100000)}L`,
            href: "/finance",
            badge: "Low EMI",
          })),
        ].slice(0, 4)
      : [];

  const items = liveItems.length ? liveItems : HOME_AI_RECOMMENDATIONS;

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="AI recommendations"
          title="AI picks for you"
          description="Personalized inventory, finance, and auction opportunities — updated in real time."
          href="/vehicles"
          linkLabel="See all picks"
        />
        <div className="home-ai-rec-grid">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={item.href} className="home-ai-rec-card group">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3 w-3" />
                    {item.badge}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.subtitle}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
