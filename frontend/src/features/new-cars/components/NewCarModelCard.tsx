import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Fuel, GitBranch, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VehicleImage } from "@/features/vehicles/components/VehicleImage";
import { buyModelVariantsPath } from "@/features/marketplace/lib/buy-catalog-flow";
import { buyDetailPath } from "@/features/marketplace/lib/route-utils";
import { cn, formatCurrency } from "@/lib/utils";
import type { NewCarModelGroup } from "../types";

type Props = {
  group: NewCarModelGroup;
  index?: number;
  hub?: "cars" | "ev";
  condition?: "new" | "used";
};

export function NewCarModelCard({
  group,
  index = 0,
  hub = "cars",
  condition = "new",
}: Props) {
  const variantsHref = buyModelVariantsPath(hub, condition, group.brand, group.model);
  const href =
    group.primarySlug && group.listingCount === 1
      ? buyDetailPath(hub, condition, group.primarySlug)
      : variantsHref;
  const variantLabel =
    group.variantCount > 0
      ? `${group.variantCount} variant${group.variantCount === 1 ? "" : "s"}`
      : `${group.listingCount} listing${group.listingCount === 1 ? "" : "s"}`;
  const priceLabel =
    group.priceOnRequest || group.priceFrom == null
      ? "Price on request"
      : group.priceTo != null && group.priceTo > group.priceFrom
        ? `${formatCurrency(group.priceFrom)} – ${formatCurrency(group.priceTo)}`
        : `From ${formatCurrency(group.priceFrom)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="min-w-0"
    >
      <Card className="premium-card group overflow-hidden border-border p-0">
        <Link to={href} className="block">
          <div className="relative aspect-[16/11] overflow-hidden bg-muted">
            <VehicleImage
              images={group.image ? [group.image] : []}
              meta={{
                brand: group.brand,
                model: group.model,
                bodyType: group.bodyType ?? "",
                category: "new-cars",
                fuelType: group.fuelTypes[0],
              }}
              alt={`${group.brand} ${group.model}`}
              className="transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="vehicle-card-overlay opacity-70" aria-hidden />
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              <Badge className="border-0 bg-foreground/80 px-1.5 py-0 text-[9px] text-primary-foreground">
                <Layers className="mr-0.5 h-2.5 w-2.5" />
                {variantLabel}
              </Badge>
              {group.dealerVerified ? (
                <Badge className="border-0 bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
                  Dealer verified
                </Badge>
              ) : null}
            </div>
          </div>
          <CardContent className="space-y-1.5 p-4">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
              {group.brand} {group.model}
            </h3>
            <div>
              <p className="text-[10px] text-muted-foreground">
                {group.priceOnRequest || group.priceFrom == null ? "Pricing" : "Ex-showroom"}
              </p>
              <p className="text-lg font-bold text-primary">{priceLabel}</p>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {group.fuelTypes.slice(0, 2).map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5"
                >
                  <Fuel className="h-2.5 w-2.5 text-primary" />
                  {f}
                </span>
              ))}
              {group.variants.length > 0 ? (
                <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5">
                  <GitBranch className="h-2.5 w-2.5 text-primary" />
                  {group.variants.slice(0, 2).join(" · ")}
                  {group.variants.length > 2 ? ` +${group.variants.length - 2}` : ""}
                </span>
              ) : null}
            </div>
            <p className={cn("text-xs text-muted-foreground")}>
              {group.listingCount === 1
                ? "Tap to view listing"
                : `Tap to choose variant · ${group.listingCount} in stock`}
            </p>
          </CardContent>
        </Link>
        <div className="flex gap-1 border-t border-border p-3">
          <Button size="sm" className="h-8 flex-1 rounded-md text-[10px]" asChild>
            <Link to={href}>{group.listingCount === 1 ? "View listing" : "View variants"}</Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
