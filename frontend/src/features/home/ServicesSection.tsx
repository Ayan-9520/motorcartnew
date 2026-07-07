import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Droplets, Shield, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { homeServiceImage } from "@/lib/media/india-media-catalog";
import { useHomePage } from "@/features/home/context/HomePageContext";

const fallbackServiceCards = [
  {
    id: "wash",
    title: "Premium Car Wash",
    type: "wash",
    description: "Doorstep foam wash & interior vacuum",
    priceFrom: 499,
    icon: Droplets,
    image: homeServiceImage("wash"),
  },
  {
    id: "repair",
    title: "Repair & Maintenance",
    type: "repair",
    description: "Battery, tyres, and general repairs",
    priceFrom: 599,
    icon: Wrench,
    image: homeServiceImage("repair"),
  },
  {
    id: "detailing",
    title: "Ceramic Detailing",
    type: "detailing",
    description: "Paint protection & premium detailing",
    priceFrom: 4999,
    icon: Car,
    image: homeServiceImage("detailing"),
  },
  {
    id: "rsa",
    title: "24×7 Roadside Assistance",
    type: "rsa",
    description: "Pan-India rescue & towing support",
    priceFrom: 999,
    icon: Shield,
    image: homeServiceImage("rsa"),
  },
];

const SERVICE_ICONS: Record<string, typeof Droplets> = {
  wash: Droplets,
  repair: Wrench,
  detailing: Car,
  rsa: Shield,
};

export function ServicesSection() {
  const { data } = useHomePage();
  const serviceCards =
    data?.services?.length && data.services.length > 0
      ? data.services.map((s, i) => {
          const type = String(s.service_type ?? s.slug ?? "repair").toLowerCase();
          const icon = SERVICE_ICONS[type] ?? Wrench;
          return {
            id: String(s.id ?? i),
            title: String(s.name ?? "Service"),
            type,
            description: String(s.description ?? "Book at partner service centers"),
            priceFrom: Number(s.price_from ?? 499),
            icon,
            image: homeServiceImage(type.includes("wash") ? "wash" : "repair"),
          };
        })
      : fallbackServiceCards;

  return (
    <section className="home-section-alt">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="After-sales"
          title="Service, insurance & RC — all vehicle types"
          description="Wash, repair, detailing, insurance & RC transfer — book trusted partners for cars, bikes & fleet."
          href="/services"
          linkLabel="All services"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCards.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="group h-full overflow-hidden hover:shadow-card-hover">
                  <div className="relative aspect-[5/3] overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <h3 className="text-sm font-semibold">{service.title}</h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                    <p className="text-xs font-medium text-primary">
                      From {formatCurrency(service.priceFrom)}
                    </p>
                    <Button variant="outline" size="sm" className="h-8 w-full text-xs" asChild>
                      <Link to="/services/browse">Book now</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
