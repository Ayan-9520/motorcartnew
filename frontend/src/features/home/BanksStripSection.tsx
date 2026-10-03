import { Link } from "react-router-dom";
import { ArrowRight, Building2, Percent } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SectionHeader } from "./SectionHeader";

export function BanksStripSection() {
  const { banks: offers } = useHomePage();
  if (!offers.length) return null;

  return (
    <section className="home-section-card">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Finance marketplace"
          title={`Compare loans from ${offers.length} banks & NBFCs`}
          description="New-car rates from each lender's published rate card · EMI shown for ₹10 lakh over 5 years."
          href="/finance/compare"
          linkLabel="Compare all lenders"
        />
        <motion.div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {offers.map((bank, i) => (
            <motion.div
              key={bank.code}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to="/finance"
                className="mc-card-interactive flex h-full items-center gap-3 p-3"
              >
                <span className="partner-logo-slot shrink-0">
                  <BrandLogo src={bank.logo} alt={bank.name} size="sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold leading-tight">{bank.name}</span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Building2 className="h-2.5 w-2.5" />
                      {bank.approval}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-sm font-bold text-primary">
                    <Percent className="h-3 w-3" />
                    {bank.rate} onwards
                  </span>
                  <span className="text-[10px] text-muted-foreground">EMI from {bank.emi}/mo</span>
                  <span className="mt-1 inline-block text-[10px] font-semibold text-primary">Compare →</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/finance/apply">
              Check eligibility <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
