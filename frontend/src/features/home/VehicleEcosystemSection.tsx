import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bike,
  Car,
  CarFront,
  Gavel,
  Landmark,
  Truck,
  Wrench,
} from "lucide-react";
import { VEHICLE_ECOSYSTEM } from "@/lib/constants";
import { useHeroSearch } from "@/features/home/components/hero-search-context";
import { getHeroHubConfig } from "@/features/home/data/hero-hub-config";

const ICONS = {
  Car,
  CarFront,
  Bike,
  Truck,
  Gavel,
  Landmark,
  Wrench,
} as const;

export function VehicleEcosystemSection() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode } = useHeroSearch();
  const hub = getHeroHubConfig(mode);
  const items = isHome
    ? VEHICLE_ECOSYSTEM
    : VEHICLE_ECOSYSTEM.filter((item) => hub.ecosystemIds.includes(item.id));

  if (!items.length) return null;

  return (
    <section className="border-b border-border bg-card py-7 md:py-10">
      <div className="container home-stack">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-xs">
            {isHome ? "Full marketplace" : `${hub.label} marketplace`}
          </p>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
            {isHome
              ? "Buy, sell, finance, auction & service — every segment"
              : `Everything for ${hub.label.toLowerCase()} — one ecosystem`}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground sm:text-sm">
            {isHome
              ? "Cars lead Phase 1 — bikes, trucks, buses, auto & EV on the same platform."
              : hub.browseFooter}
          </p>
        </div>
        <div className="quick-access-grid">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Car;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="min-w-0"
              >
                <Link
                  to={item.href}
                  className="quick-access-card group flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background text-center transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-foreground">{item.label}</span>
                  <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {item.stat}
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
