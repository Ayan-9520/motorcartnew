import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerLogoMarquee } from "@/features/home/components/PartnerLogoMarquee";
import { SectionHeader } from "./SectionHeader";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { mapBanksToPartnerLogos, mapBrandsToPartnerLogos } from "@/features/home/lib/map-home-data";

export function HomePartnersPremium() {
  const { banks, data } = useHomePage();
  const bankLogos = banks.length ? mapBanksToPartnerLogos(banks) : undefined;
  const carLogos = data?.brands?.length ? mapBrandsToPartnerLogos(data.brands) : undefined;

  if (!bankLogos?.length && !carLogos?.length) return null;

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
          <PartnerLogoMarquee bankLogos={bankLogos} carLogos={carLogos} />
        </motion.div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="sm" className="home-section-cta rounded-xl font-semibold" asChild>
            <Link to="/finance/compare">
              Compare all lenders <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl" asChild>
            <Link to="/vehicles">Browse by brand</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
