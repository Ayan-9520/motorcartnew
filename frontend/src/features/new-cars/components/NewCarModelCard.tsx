import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Fuel, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VehicleImage } from "@/features/vehicles/components/VehicleImage";
import { buyModelVariantsPath } from "@/features/marketplace/lib/buy-catalog-flow";
import { buyDetailPath } from "@/features/marketplace/lib/route-utils";
import { formatCurrency } from "@/lib/utils";
import type { NewCarModelGroup } from "../types";

type Props = {
  group: NewCarModelGroup;
  index?: number;
  hub?: "cars" | "ev";
  condition?: "new" | "used";
};

/** Uniform premium model card — fixed media + content slots (same height/width in grid). */
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
        ? `${formatCurrency(group.priceFrom)} – ${formatCurrency(group.priceTo)}`
        : `From ${formatCurrency(group.priceFrom)}`;
  const variantHint =
    group.variantCount > 1
      ? `${group.variantCount} variants`
      : group.variantCount === 1
        ? "1 variant"
        : `${Math.max(1, group.listingCount)} in stock`;
  const fuel = group.fuelTypes[0]?.trim() || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
      className="flex h-full min-w-0"
    >
      <Card className="premium-card group flex h-full w-full flex-col overflow-hidden border-border/80 p-0 transition-shadow hover:shadow-md">
        <Link
          to={href}
          className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted">
            <div className="absolute inset-0">
              <VehicleImage
                images={group.image ? [group.image] : []}
                meta={{
                  brand: group.brand,
                  model: group.model,
                  bodyType: group.bodyType ?? "",
                  category: "new-cars",
                  fuelType: fuel || undefined,
                }}
                alt={`${group.brand} ${group.model}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"
              aria-hidden
            />
            <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {variantHint}
            </span>
            {group.dealerVerified ? (
              <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                <ShieldCheck className="h-2.5 w-2.5" />
                Verified
              </span>
            ) : null}
          </div>

          <CardContent className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex min-h-[2.75rem] items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary">
                {group.brand} {group.model}
              </h3>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>

            <div className="min-h-[3.1rem]">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {group.priceOnRequest || group.priceFrom == null ? "Pricing" : "Ex-showroom"}
              </p>
              <p className="line-clamp-2 text-lg font-bold leading-snug tabular-nums text-primary">{priceLabel}</p>
            </div>

            <div className="mt-auto flex min-h-[1.25rem] items-center gap-1 text-[11px] text-muted-foreground">
              <Fuel className="h-3 w-3 shrink-0 text-primary/80" />
              <span className="truncate">{fuel || "—"}</span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}
