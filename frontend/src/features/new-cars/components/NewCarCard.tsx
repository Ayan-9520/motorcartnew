import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Box,
  Fuel,
  Gauge,
  GitCompare,
  RotateCw,
  Star,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { VehicleImage } from "@/features/vehicles/components/VehicleImage";
import { getDiscountedPrice, getVehicleEmi, newCarDetailPath } from "@/lib/vehicle-utils";
import type { NewCarListing } from "../types";

interface NewCarCardProps {
  vehicle: NewCarListing;
  index?: number;
  compact?: boolean;
}

export function NewCarCard({ vehicle, index = 0, compact = false }: NewCarCardProps) {
  const meta = vehicle.metadata;
  const priceOnRequest = Boolean(meta?.priceOnRequest) || !(vehicle.price > 0);
  const price = getDiscountedPrice(vehicle);
  const emi = priceOnRequest ? 0 : getVehicleEmi(vehicle);
  const onRoad = priceOnRequest ? 0 : (vehicle.metadata.onRoadPrice ?? Math.round(price * 1.12));
  const rating = vehicle.metadata.rating ?? 4.5;
  const path = newCarDetailPath(vehicle.slug);
  const priceSourceText = meta?.priceSourceText ? String(meta.priceSourceText) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="min-w-0"
    >
      <Card className={cn("premium-card group overflow-hidden border-border p-0", compact && "rounded-xl")}>
        <Link to={path} className="block">
          <div className={cn("relative overflow-hidden bg-muted", compact ? "aspect-[16/10]" : "aspect-[16/11]")}>
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
              className="transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="vehicle-card-overlay opacity-70" aria-hidden />
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {vehicle.metadata.offerTag && (
                <Badge className="border-0 bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
                  <Tag className="mr-0.5 h-2.5 w-2.5" />
                  {vehicle.metadata.offerTag}
                </Badge>
              )}
              {vehicle.metadata.has360 && (
                <Badge
                  variant="outline"
                  className="border-primary-foreground/30 bg-foreground/50 px-1.5 py-0 text-[9px] text-primary-foreground backdrop-blur-sm"
                >
                  <RotateCw className="mr-0.5 h-2.5 w-2.5" />
                  360°
                </Badge>
              )}
              {vehicle.metadata.isLatestLaunch && (
                <Badge className="border-0 bg-foreground/80 px-1.5 py-0 text-[9px] text-primary-foreground">
                  New launch
                </Badge>
              )}
            </div>
          </div>
          <CardContent className={cn("space-y-1.5", compact ? "p-3" : "p-4")}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {vehicle.brand} {vehicle.model}
                {vehicle.variant ? ` ${vehicle.variant}` : ""}
              </h3>
              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                <Star className="h-2.5 w-2.5 fill-primary" />
                {rating}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{priceOnRequest ? "Pricing" : "Starting from"}</p>
              <p className={cn("font-bold text-primary", compact ? "text-base" : "text-lg")}>
                {priceOnRequest ? "Price on request" : formatCurrency(price)}
              </p>
              {priceOnRequest ? (
                priceSourceText ? (
                  <p className="text-[10px] text-muted-foreground">{priceSourceText}</p>
                ) : null
              ) : (
                <p className="text-[10px] text-muted-foreground">On-road ~{formatCurrency(onRoad)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5">
                <Fuel className="h-2.5 w-2.5 text-primary" />
                {vehicle.fuelType}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5">
                <Box className="h-2.5 w-2.5 text-primary" />
                {vehicle.transmission}
              </span>
              {vehicle.metadata.specifications?.mileage && (
                <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5">
                  <Gauge className="h-2.5 w-2.5 text-primary" />
                  {vehicle.metadata.specifications.mileage}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-foreground">
              {priceOnRequest ? (
                <span className="font-normal text-muted-foreground">Contact dealer for EMI</span>
              ) : (
                <>
                  EMI {formatCurrency(emi)}/mo
                  {vehicle.metadata.waitingPeriod && (
                    <span className="font-normal text-muted-foreground"> · {vehicle.metadata.waitingPeriod}</span>
                  )}
                </>
              )}
            </p>
          </CardContent>
        </Link>
        <div className={cn("flex gap-1 border-t border-border", compact ? "p-2" : "p-3")}>
          <Button size="sm" variant="outline" className="h-8 flex-1 rounded-md text-[10px]" asChild>
            <Link to={`${path}?compare=1`}>
              <GitCompare className="mr-0.5 h-3 w-3" />
              Compare
            </Link>
          </Button>
          <Button size="sm" className="h-8 flex-1 rounded-md text-[10px]" asChild>
            <Link to={path}>Best price</Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
