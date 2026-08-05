import { motion } from "framer-motion";
import { Car, IndianRupee, Store, Users } from "lucide-react";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { realDataOnly } from "@/config/real-data";
import { platformStats } from "@/data/mock";
import { AnimatedCounter } from "@/components/shared/animated-counter";

const statIcons = [Car, Store, IndianRupee, Users];

function parseStatValue(value: string): { numeric: number; suffix: string; prefix: string } {
  const prefix = value.startsWith("₹") ? "₹" : "";
  const cleaned = value.replace(/[₹,+]/g, "");
  const match = cleaned.match(/^([\d.]+)([A-Za-z%]*)$/);
  if (!match) return { numeric: 0, suffix: value, prefix };
  const num = parseFloat(match[1]);
  const suffix = match[2] ? `${match[2]}+` : "+";
  let multiplier = 1;
  if (suffix.startsWith("L")) multiplier = 100000;
  else if (suffix.startsWith("Cr")) multiplier = 10000000;
  return { numeric: num * multiplier, suffix: suffix.replace(/\+$/, "") + "+", prefix };
}

export function StatsSection() {
  const { platformStats: dynamicStats } = useHomePage();
  const stats = dynamicStats.length ? dynamicStats : realDataOnly ? [] : platformStats;
  if (!stats.length) return null;

  return (
    <section className="border-y border-border bg-muted/40 py-7 dark:border-border dark:bg-muted/30 md:py-9">
      <div className="container">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = statIcons[index] ?? Car;
            const parsed = parseStatValue(stat.value);
            const useCounter = parsed.numeric > 0 && parsed.numeric < 1e12;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-[var(--shadow-primary)]">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold text-primary sm:text-xl">
                    {useCounter ? (
                      <AnimatedCounter
                        value={Math.round(parsed.numeric)}
                        prefix={parsed.prefix}
                        suffix={parsed.suffix}
                      />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
