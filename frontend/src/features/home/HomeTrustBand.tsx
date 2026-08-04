import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Landmark,
  Lock,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { HERO_STATS, HOME_TRUST_PILLS } from "@/features/home/data/homepage-data";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { realDataOnly } from "@/config/real-data";

const PILL_ICONS = {
  users: Users,
  landmark: Landmark,
  shield: Shield,
  check: CheckCircle2,
  lock: Lock,
  sparkles: Sparkles,
} as const;

export function HomeTrustBand() {
  const { heroStats } = useHomePage();
  const stats = heroStats.length ? heroStats : realDataOnly ? [] : HERO_STATS;
  if (!stats.length && realDataOnly) return null;
  return (
    <section className="border-b border-border bg-muted/15 py-4 md:py-6">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="hero-trust-band"
        >
          <div className="hero-stats-row">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="hero-stat-cell"
              >
                <Link to={stat.href} className="hero-stat-link group">
                  <p className="text-base font-bold tracking-tight text-foreground group-hover:text-primary sm:text-lg">
                    {stat.value}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground">{stat.label}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="hero-trust-pills">
            {HOME_TRUST_PILLS.map((pill) => {
              const Icon = PILL_ICONS[pill.icon];
              return (
                <span key={pill.id} className="hero-trust-pill">
                  <Icon className="h-3 w-3 text-primary" />
                  {pill.label}
                </span>
              );
            })}
          </div>

        </motion.div>
      </div>
    </section>
  );
}
