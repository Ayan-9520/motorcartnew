import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { HOME_EXPLORE_CTAS } from "@/features/home/data/home-explore-ctas";
import { SectionHeader } from "./SectionHeader";

/** Six premium entry tiles — replaces the old 18-pillar clutter. */
export function HomePlatformMatrix() {
  return (
    <section className="border-b border-border bg-gradient-to-b from-muted/15 to-background py-8 md:py-10">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Explore"
          title="What do you want to do?"
          description="New cars, pre-owned, sell, finance & auctions — one tap."
          align="center"
          className="mx-auto"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {HOME_EXPLORE_CTAS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                className="min-w-0"
              >
                <Link
                  to={item.href}
                  className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="space-y-0.5">
                    <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                      {item.title}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
