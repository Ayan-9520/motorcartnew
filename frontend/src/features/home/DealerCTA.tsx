import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Shield, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const perks = [
  { icon: Store, label: "List unlimited inventory" },
  { icon: BarChart3, label: "Dealer CRM & analytics" },
  { icon: Shield, label: "Verified buyer leads" },
  { icon: Users, label: "Dealer network" },
];

export function DealerCTA() {
  return (
    <section className="home-section">
      <div className="container">
        <motion.div
          className="home-cta-panel"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid items-center gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Badge className="border-primary/30 bg-primary/10 text-[10px] text-primary">Partner program</Badge>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Become a Verified Dealer on Motorcart.in
              </h2>
              <p className="max-w-lg text-sm text-muted-foreground">
                Join India&apos;s fastest-growing automotive marketplace with AI leads and enterprise tools.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" className="home-section-cta rounded-lg" asChild>
                  <Link to="/dashboard/dealer">
                    Apply as Dealer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="home-section-cta rounded-lg bg-card" asChild>
                  <Link to="/dealers">Learn more</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {perks.map((perk, index) => {
                const Icon = perk.icon;
                return (
                  <motion.div
                    key={perk.label}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="rounded-lg border border-border bg-muted/50 p-3 dark:bg-muted/30"
                  >
                    <Icon className="mb-1.5 h-5 w-5 text-primary" />
                    <p className="text-xs font-medium text-foreground">{perk.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
