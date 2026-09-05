import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./SectionHeader";

export function TestimonialsSection() {
  const { testimonials: items } = useHomePage();
  if (!items.length) return null;

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Testimonials"
          title="Trusted by Buyers & Partners"
          description="Real stories from customers, dealers, and finance partners across India."
          align="center"
        />
        <motion.div className="grid gap-3 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.name + index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative h-full overflow-hidden hover:shadow-card-hover">
                <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/10" />
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="leading-relaxed text-muted-foreground">&ldquo;{item.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {item.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
