import { Badge } from "@/components/ui/badge";
import { PART_ORIGIN_LABELS, type PartOrigin } from "../types";
import { cn } from "@/lib/utils";

interface PartOriginBadgeProps {
  origin: PartOrigin;
  className?: string;
}

export function PartOriginBadge({ origin, className }: PartOriginBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold uppercase tracking-wide",
        origin === "oem" && "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        origin === "aftermarket" && "border-amber-500/40 bg-amber-500/10 text-amber-800",
        origin === "genuine_accessory" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
        className
      )}
    >
      {PART_ORIGIN_LABELS[origin]}
    </Badge>
  );
}
