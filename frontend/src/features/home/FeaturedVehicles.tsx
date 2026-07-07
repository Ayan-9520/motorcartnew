import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fuel,
  GitCompare,
  Heart,
  MapPin,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import {
  formatPrice,
  getVehicleEmi,
  sortVehicles,
  vehicleDetailPath,
} from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { SectionHeader } from "./SectionHeader";
import { VehicleImage } from "@/features/vehicles/components/VehicleImage";
import toast from "react-hot-toast";

const featured = sortVehicles(
  MOCK_VEHICLES.filter((v) => v.isFeatured && v.status === "available"),
  "ai-score"
).slice(0, 12);

export function FeaturedVehicles() {
  const { featuredVehicles, isLoading } = useHomePage();
  const list = featuredVehicles.length ? featuredVehicles : featured;
  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Marketplace"
          title="Featured vehicles"
          description="AI-verified listings with transparent pricing, EMI estimates, and dealer trust scores."
          href="/buy"
          linkLabel="View all vehicles"
        />
        <div className="home-featured-carousel -mx-1 px-1">
          {isLoading && list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading featured vehicles…</p>
          ) : null}
          {list.map((vehicle, index) => (
            <FeaturedVehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedVehicleCard({
  vehicle,
  index,
}: {
  vehicle: VehicleListing;
  index: number;
}) {
  const toggleWishlist = useVehicleMarketStore((s) => s.toggleWishlist);
  const wishlisted = useVehicleMarketStore((s) => s.wishlist.includes(vehicle.id));
  const addCompare = useVehicleMarketStore((s) => s.addCompare);
  const removeCompare = useVehicleMarketStore((s) => s.removeCompare);
  const inCompare = useVehicleMarketStore((s) => s.compare.includes(vehicle.id));
  const emi = getVehicleEmi(vehicle);
  const detailPath = vehicleDetailPath(vehicle);

  const handleWishlist = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const was = wishlisted;
    toggleWishlist(vehicle.id);
    toast.success(was ? "Removed from wishlist" : "Saved to wishlist");
  };

  const handleCompare = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeCompare(vehicle.id);
      return;
    }
    const ok = addCompare(vehicle.id);
    if (!ok) toast.error("Compare up to 4 vehicles at a time");
    else toast.success("Added to compare");
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="group home-featured-card"
    >
      <Link to={detailPath} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <VehicleImage
            images={vehicle.images}
            meta={{
              brand: vehicle.brand,
              model: vehicle.model,
              bodyType: vehicle.bodyType,
              category: vehicle.category,
              fuelType: vehicle.fuelType,
            }}
            alt={vehicle.title}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="vehicle-card-overlay opacity-60" aria-hidden />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {vehicle.isCertified && (
              <Badge className="gap-0.5 border-0 bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {vehicle.metadata?.has360 && (
              <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[9px]">
                <RotateCw className="h-3 w-3" />
                360°
              </Badge>
            )}
            {vehicle.aiPriceScore != null && (
              <Badge
                variant="outline"
                className="gap-0.5 border-border/80 bg-card/90 px-1.5 py-0 text-[9px]"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {vehicle.aiPriceScore}% fair
              </Badge>
            )}
          </div>
          <div className="absolute right-2 top-2 flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-card/95 shadow-sm"
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-3.5 w-3.5 ${wishlisted ? "fill-primary text-primary" : ""}`}
              />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-card/95 shadow-sm"
              onClick={handleCompare}
              aria-label="Compare"
            >
              <GitCompare className={`h-3.5 w-3.5 ${inCompare ? "text-primary" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="space-y-2 p-3.5">
          <h3 className="line-clamp-1 text-sm font-bold text-foreground">{vehicle.title}</h3>
          <p className="text-lg font-bold text-primary">{formatPrice(vehicle.price)}</p>
          {emi != null && (
            <p className="text-xs font-medium text-muted-foreground">EMI from {formatPrice(emi)}/mo</p>
          )}
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {vehicle.fuelType && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5">
                <Fuel className="h-3 w-3" />
                {vehicle.fuelType}
              </span>
            )}
            {vehicle.transmission && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5">
                <Settings2 className="h-3 w-3" />
                {vehicle.transmission}
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {vehicle.location ?? vehicle.city} · {vehicle.dealerName}
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
