import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { VehicleImage } from "@/features/vehicles/components/VehicleImage";
import { buyModelVariantsPath } from "@/features/marketplace/lib/buy-catalog-flow";
import { buyDetailPath } from "@/features/marketplace/lib/route-utils";
import { formatPriceLakhs } from "../lib/format-price-lakhs";
import type { NewCarModelGroup } from "../types";

type Props = {
  group: NewCarModelGroup;
  index?: number;
  hub?: "cars" | "ev";
  condition?: "new" | "used";
};

/** CarLelo-style popular model card — identical height/width in grid. */
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

  const priceLabel =
    group.priceOnRequest || group.priceFrom == null
      ? "Price on request"
      : group.priceTo != null && group.priceTo > group.priceFrom
        ? `${formatPriceLakhs(group.priceFrom)} - ${formatPriceLakhs(group.priceTo)}*`
        : `${formatPriceLakhs(group.priceFrom)}*`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      className="flex h-full min-w-0"
    >
      <Card className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg">
        <Link to={href} className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#f4f6f8]">
            <div className="absolute inset-0">
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
                className="h-full w-full object-contain object-center p-3 transition-transform duration-500 group-hover:scale-[1.04] sm:p-4"
              />
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
            <div className="min-h-[3.25rem] space-y-1">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-foreground">
                {group.brand} {group.model}
              </h3>
              <p className="line-clamp-1 text-sm text-muted-foreground">{priceLabel}</p>
            </div>

            <span className="mt-auto flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-opacity group-hover:opacity-95">
              View Offers
            </span>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}
