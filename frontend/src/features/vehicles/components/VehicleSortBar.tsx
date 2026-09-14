import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleSortOption } from "@/types/vehicle";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: VehicleSortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "year-desc", label: "Year: Newest" },
  { value: "kms-asc", label: "KM: Low to High" },
  { value: "ai-score", label: "AI Score" },
];

interface VehicleSortBarProps {
  sort: VehicleSortOption;
  total: number;
  layout: "grid" | "list";
  onSort: (s: VehicleSortOption) => void;
  onLayout: (l: "grid" | "list") => void;
  /** Override “vehicles found” label (e.g. “models”). */
  totalLabel?: string;
}

export function VehicleSortBar({
  sort,
  total,
  layout,
  onSort,
  onLayout,
  totalLabel = "vehicles",
}: VehicleSortBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span> {totalLabel} found
      </p>
      <div className="flex items-center gap-2">
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as VehicleSortOption)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex rounded-lg border">
          <Button type="button" size="icon" variant={layout === "grid" ? "default" : "ghost"} className="h-9 w-9 rounded-r-none" onClick={() => onLayout("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant={layout === "list" ? "default" : "ghost"} className="h-9 w-9 rounded-l-none" onClick={() => onLayout("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
