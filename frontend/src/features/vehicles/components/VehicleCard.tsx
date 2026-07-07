import type { ComponentType, MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Fuel,
  Gauge,
  GitCompare,
  Heart,
  MapPin,
  MessageCircle,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  deriveFairPriceLabel,
  getDiscountedPrice,
  getVehicleEmi,
  vehicleDetailPath,
  whatsAppVehicleUrl,
} from "@/lib/vehicle-utils";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import type { FairPriceLabel, VehicleListing } from "@/types/vehicle";
import { featureFlags } from "@/config/feature-flags";
import { SALE_MODE_LABELS } from "@/lib/sale-mode";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { VehicleImage } from "./VehicleImage";

interface VehicleCardProps {
  vehicle: VehicleListing;
  index?: number;
  layout?: "grid" | "list";
  /** Compact premium card for listing grids (2–3 per row) */
  compact?: boolean;
}

const FAIR_PRICE_STYLES: Record<FairPriceLabel, string> = {
  "great-deal": "bg-primary/15 text-primary border-primary/30",
  "fair-price": "bg-muted text-foreground border-border",
  "high-price": "bg-destructive/10 text-destructive border-destructive/30",
};

const FAIR_PRICE_LABELS: Record<FairPriceLabel, string> = {
  "great-deal": "Great Deal",
  "fair-price": "Fair Price",
  "high-price": "High Price",
};

export function VehicleCard({ vehicle, index = 0, layout = "grid", compact = true }: VehicleCardProps) {
  const toggleWishlist = useVehicleMarketStore((s) => s.toggleWishlist);
  const wishlisted = useVehicleMarketStore((s) => s.wishlist.includes(vehicle.id));
  const addCompare = useVehicleMarketStore((s) => s.addCompare);
  const removeCompare = useVehicleMarketStore((s) => s.removeCompare);
  const inCompare = useVehicleMarketStore((s) => s.compare.includes(vehicle.id));
  const price = getDiscountedPrice(vehicle);
  const emi = getVehicleEmi(vehicle);
  const discount = vehicle.metadata.discountPercent;
  const detailPath = vehicleDetailPath(vehicle);
  const isNew =
    vehicle.condition === "new" || vehicle.category === "new-cars";
  const fair =
    vehicle.metadata.fairPriceLabel ?? deriveFairPriceLabel(vehicle);
  const onRoad = vehicle.metadata.onRoadPrice ?? Math.round(price * 1.12);
  const rating = vehicle.metadata.rating ?? vehicle.dealerRating ?? 4.2;

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

  const handleWishlist = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = wishlisted;
    toggleWishlist(vehicle.id);
    toast.success(wasSaved ? "Removed from wishlist" : "Saved to wishlist");
  };

  const handleShare = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${detailPath}`;
    if (navigator.share) {
      await navigator.share({ title: vehicle.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  if (layout === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="min-w-0"
      >
        <Card className="premium-vehicle-card overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <Link
              to={detailPath}
              className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted sm:w-56 md:w-64"
            >
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
                className="relative h-full w-full object-cover"
              />
              {discount ? (
                <Badge className="absolute left-2 top-2 bg-destructive text-[10px] text-destructive-foreground">
                  {discount}% OFF
                </Badge>
              ) : null}
            </Link>
            <CardContent className="flex flex-1 flex-col justify-between p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link to={detailPath} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                    {vehicle.title}
                  </Link>
                  <CardIconActions
                    wishlisted={wishlisted}
                    onWishlist={() => {
                      const wasSaved = wishlisted;
                      toggleWishlist(vehicle.id);
                      toast.success(wasSaved ? "Removed from wishlist" : "Saved to wishlist");
                    }}
                    onShare={handleShare}
                  />
                </div>
                <SpecRow vehicle={vehicle} isNew={isNew} />
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {vehicle.city} · {vehicle.dealerName}
                </p>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <PriceBlock price={price} emi={emi} isNew={isNew} onRoad={onRoad} original={vehicle.originalPrice} />
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleCompare}>
                    <GitCompare className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" className="h-8" asChild>
                    <Link to={detailPath}>View</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="min-w-0"
    >
      <Card className={cn("premium-vehicle-card group overflow-hidden p-0", compact && "rounded-xl")}>
        <Link to={detailPath} className="block">
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
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/55 to-transparent px-2 pb-2 pt-8">
              <p className="text-[10px] font-medium text-primary-foreground/90">
                {isNew ? "Dealer verified · Test drive available" : "12+ buyers viewed this week"}
              </p>
            </div>
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {vehicle.isCertified && (
                <Badge className="gap-0.5 border-0 bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}
              {!isNew && vehicle.aiPriceScore != null && (
                <Badge
                  variant="outline"
                  className={cn("px-1.5 py-0 text-[9px] font-semibold", FAIR_PRICE_STYLES[fair])}
                >
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  {FAIR_PRICE_LABELS[fair]}
                </Badge>
              )}
              {isNew && vehicle.metadata.offerTag && (
                <Badge className="border-0 bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
                  {vehicle.metadata.offerTag}
                </Badge>
              )}
              {discount ? (
                <Badge className="border-0 bg-destructive px-1.5 py-0 text-[9px] text-destructive-foreground">
                  {discount}% OFF
                </Badge>
              ) : null}
              {!isNew && featureFlags.vehicleSaleMode && vehicle.saleMode && vehicle.saleMode !== "dealer_offer" ? (
                <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                  {SALE_MODE_LABELS[vehicle.saleMode]}
                </Badge>
              ) : null}
            </div>
            <div className="absolute right-2 top-2 flex gap-1" onClick={(e) => e.preventDefault()}>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-primary"
                onClick={handleWishlist}
                aria-label="Wishlist"
              >
                <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-destructive text-destructive")} />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm backdrop-blur hover:text-primary"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <CardContent className={cn("space-y-2", compact ? "p-3" : "p-4")}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {vehicle.title}
              </h3>
              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                <Star className="h-2.5 w-2.5 fill-primary" />
                {rating.toFixed(1)}
              </span>
            </div>

            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="line-clamp-1">
                {vehicle.city}
                {vehicle.dealerName ? ` · ${vehicle.dealerName}` : ""}
              </span>
            </p>

            <SpecRow vehicle={vehicle} isNew={isNew} />

            <div className="flex items-end justify-between gap-2 border-t border-border/60 pt-2">
              <PriceBlock
                price={price}
                emi={emi}
                isNew={isNew}
                onRoad={onRoad}
                original={vehicle.originalPrice}
                compact={compact}
              />
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-medium">
                {vehicle.dealerName?.includes("Motors") ? "Dealer" : "Owner"}
              </Badge>
              {!isNew && (
                <span className="text-[10px] text-muted-foreground">
                  Inspection {vehicle.metadata.inspectionScore ?? 85}/100
                </span>
              )}
            </div>
          </CardContent>
        </Link>

        <div className={cn("grid grid-cols-2 gap-1.5 border-t border-border", compact ? "p-2" : "p-3")}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-md text-[11px]"
            onClick={handleCompare}
          >
            <GitCompare className="mr-1 h-3.5 w-3.5" />
            Compare
          </Button>
          <Button size="sm" className="h-8 rounded-md text-[11px]" asChild>
            <a href={whatsAppVehicleUrl(vehicle)} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1 h-3.5 w-3.5" />
              Contact
            </a>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function SpecRow({ vehicle, isNew }: { vehicle: VehicleListing; isNew: boolean }) {
  if (isNew) {
    return (
      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-muted-foreground">
        <SpecCell icon={Fuel} label={vehicle.fuelType} />
        <SpecCell icon={Settings2} label={vehicle.transmission} />
        <SpecCell icon={Calendar} label={String(vehicle.year)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground sm:grid-cols-3">
      <SpecCell icon={Gauge} label={`${vehicle.kmsDriven.toLocaleString()} km`} />
      <SpecCell icon={Users} label={`${vehicle.owners} owner${vehicle.owners > 1 ? "s" : ""}`} />
      <SpecCell icon={Settings2} label={vehicle.transmission} />
      <SpecCell icon={Fuel} label={vehicle.fuelType} />
      <SpecCell icon={Calendar} label={String(vehicle.year)} />
    </div>
  );
}

function SpecCell({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 truncate rounded border border-border/80 bg-muted/40 px-1.5 py-1">
      <Icon className="h-2.5 w-2.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function PriceBlock({
  price,
  emi,
  isNew,
  onRoad,
  original,
  compact,
}: {
  price: number;
  emi: number;
  isNew: boolean;
  onRoad: number;
  original?: number;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      {isNew ? (
        <p className="text-[10px] text-muted-foreground">Ex-showroom from</p>
      ) : null}
      <p className={cn("font-bold text-foreground", compact ? "text-base" : "text-lg")}>
        {formatCurrency(price)}
        {!isNew && <span className="text-[10px] font-normal text-muted-foreground">*</span>}
      </p>
      {original && original > price ? (
        <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(original)}</p>
      ) : null}
      {isNew ? (
        <p className="text-[10px] text-muted-foreground">On-road ~{formatCurrency(onRoad)}</p>
      ) : null}
      <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        EMI {formatCurrency(emi)}/mo
      </div>
    </div>
  );
}

function CardIconActions({
  wishlisted,
  onWishlist,
  onShare,
}: {
  wishlisted: boolean;
  onWishlist: () => void;
  onShare: (e: MouseEvent) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn("h-7 w-7", wishlisted && "text-destructive")}
        onClick={(e) => {
          e.preventDefault();
          onWishlist();
        }}
      >
        <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-current")} />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onShare}>
        <Share2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
