import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { HOME_PLATFORM_PILLARS } from "@/features/home/data/home-platform-data";
import { SectionHeader } from "./SectionHeader";

export function HomePlatformMatrix() {
  return (
    <section className="home-platform-section border-b border-border bg-gradient-to-b from-muted/20 to-background py-8 md:py-12">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="One platform"
          title="Everything Motorcart does — for every vehicle segment"
          description="Cars, bikes, trucks, buses, auto & EV — plus buy, sell, auctions, finance, parts, service, community & AI. Built for India's dealers, bankers & buyers."
          align="center"
          className="mx-auto"
        />
        <div className="quick-access-grid">
          {HOME_PLATFORM_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.02, 0.24) }}
                className="min-w-0"
              >
                <Link
                  to={pillar.href}
                  className="quick-access-card group flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card text-center transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-foreground">{pillar.title}</span>
                  <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {pillar.stat}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
