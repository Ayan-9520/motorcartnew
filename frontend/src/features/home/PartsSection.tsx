import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Star } from "lucide-react";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";

export function PartsSection() {
  const { parts } = useHomePage();

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Auto parts"
          title="Parts for cars, bikes & commercial vehicles"
          description="OEM & aftermarket — tyres, brakes, batteries & accessories with pan-India delivery."
          href="/parts"
          linkLabel="Shop all parts"
        />
        {!parts.length ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <p className="text-sm font-semibold">Parts catalog updating</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse the full parts marketplace meanwhile.</p>
            <Button size="sm" className="mt-4 rounded-xl" asChild>
              <Link to="/parts">Shop parts</Link>
            </Button>
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {parts.map((part, index) => (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="group h-full overflow-hidden hover:shadow-card-hover">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={part.image}
                    alt={part.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <Badge className="absolute left-3 top-3 bg-secondary/80 text-white">
                    {part.category}
                  </Badge>
                </div>
                <CardContent className="space-y-2 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{part.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {part.rating} ({part.reviewCount.toLocaleString("en-IN")})
                  </div>
                  <motion.div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-primary">{formatCurrency(part.price)}</span>
                    {part.originalPrice != null && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(part.originalPrice)}
                      </span>
                    )}
                  </motion.div>
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <Link to="/parts/browse">
                      <ShoppingCart className="h-4 w-4" />
                      Shop parts
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
