import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerLogoMarquee } from "@/features/home/components/PartnerLogoMarquee";
import { SectionHeader } from "./SectionHeader";
import { PARTNER_BANK_LOGOS, PARTNER_CAR_LOGOS } from "@/features/home/data/homepage-data";

/**
 * Always uses curated partner logos so the home never flickers empty / broken
 * when /api/home brands are partial or slow.
 */
export function HomePartnersPremium() {
  return (
    <section className="home-partners-premium home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Trusted nationwide"
          title="Banking partners & automobile brands on one platform"
          description="Compare loans from RBI-regulated lenders. Browse inventory from India's leading OEMs and verified dealers."
          align="center"
          className="mx-auto"
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="home-partners-premium-panel"
        >
          <PartnerLogoMarquee bankLogos={PARTNER_BANK_LOGOS} carLogos={PARTNER_CAR_LOGOS} />
        </motion.div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="sm" className="home-section-cta rounded-xl font-semibold" asChild>
            <Link to="/finance/compare">
              Compare all lenders <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl" asChild>
            <Link to="/buy">Browse by brand</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
