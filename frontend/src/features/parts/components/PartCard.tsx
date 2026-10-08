import { Link } from "react-router-dom";
import { Package, Star, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PartProduct } from "../types";
import { partDetailPath, displayUnitPrice, hasBulkTier } from "../lib/part-utils";
import { PartImage, partImageSrc } from "./PartImage";
import { PartOriginBadge } from "./PartOriginBadge";
import type { AppRole } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";

interface PartCardProps {
  part: PartProduct;
  role?: AppRole;
  index?: number;
}

export function PartCard({ part, role: roleProp, index = 0 }: PartCardProps) {
  const { user } = useAuth();
  const role = roleProp ?? user?.role;
  const price = displayUnitPrice(part, role);
  const path = partDetailPath(part);
  const discount =
    part.originalPrice != null && part.originalPrice > price
      ? Math.round(((part.originalPrice - price) / part.originalPrice) * 100)
      : null;

  return (
    <article className="premium-part-card group" style={{ animationDelay: `${index * 40}ms` }}>
      <Link to={path} className="block">
        <div className="premium-part-card-media">
          <PartImage
            src={partImageSrc(part.images, {
              categorySlug: part.categorySlug,
              slug: part.slug,
            })}
            alt={part.name}
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <PartOriginBadge origin={part.partOrigin} className="absolute left-2.5 top-2.5" />
          {part.isFeatured && (
            <Badge className="absolute left-2.5 top-9 border-0 bg-primary text-[10px] text-primary-foreground shadow-sm">
              Featured
            </Badge>
          )}
          {discount != null && discount > 0 && (
            <Badge className="absolute right-2.5 top-2.5 border-0 bg-amber-500 text-[10px] text-white">
              -{discount}%
            </Badge>
          )}
          {part.stock < 10 && part.stock > 0 && (
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              Only {part.stock} left
            </span>
          )}
          {part.stock <= 0 && (
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-foreground/80 px-1.5 py-0.5 text-[9px] font-bold text-background">
              Out of stock
            </span>
          )}
        </div>
        <div className="premium-part-card-body">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{part.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.35rem] text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
            {part.name}
          </h3>
          {part.reviewCount > 0 ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              {part.rating.toFixed(1)}
              <span className="text-muted-foreground">({part.reviewCount.toLocaleString("en-IN")})</span>
            </div>
          ) : (
            <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground">
              {part.compatibility.length ? `Fits ${part.compatibility.slice(0, 2).join(", ")}` : part.sellerName ?? "\u00a0"}
            </p>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{formatCurrency(price)}</span>
            {part.originalPrice != null && part.originalPrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(part.originalPrice)}
              </span>
            )}
          </div>
          {hasBulkTier(part) && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-primary">
              <TrendingDown className="h-3 w-3" />
              {formatCurrency(part.wholesalePrice!)} each for {part.bulkMinQty}+
            </p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            GST {part.gstRate}% incl. · {part.stock > 0 ? "COD available" : "Out of stock"}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3 pt-0">
        <Button variant="outline" size="sm" className="w-full rounded-lg text-xs font-semibold" asChild>
          <Link to={path}>
            <Package className="mr-1.5 h-3.5 w-3.5" />
            View &amp; buy
          </Link>
        </Button>
      </div>
    </article>
  );
}
