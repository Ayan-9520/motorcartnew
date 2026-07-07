import { VEHICLE_CITIES, VEHICLE_COLORS } from "@/data/vehicle-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { getHubBrands, getHubBodyTypes, getHubFuels } from "@/features/marketplace/data/hub-filter-catalog";
import { MarketplaceFilterChips } from "@/features/marketplace/components/MarketplaceFilterChips";
import { featureFlags } from "@/config/feature-flags";
import { SALE_MODE_OPTIONS } from "@/lib/sale-mode";

interface VehicleFiltersProps {
  filters: Record<string, string | number | undefined>;
  onFilter: (key: string, value: string | undefined) => void;
  onClear: () => void;
  /** When set, brand/fuel/body lists are hub-specific (cars, bikes, trucks, …) */
  hub?: HubCategorySlug;
}

const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT", "DCT"];

export function VehicleFilters({ filters, onFilter, onClear, hub }: VehicleFiltersProps) {
  const brands = hub ? getHubBrands(hub) : [];
  const fuels = hub ? getHubFuels(hub) : ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
  const bodyTypes = hub ? getHubBodyTypes(hub) : [];

  return (
    <aside className="marketplace-filters-panel space-y-5 rounded-xl border border-border/90 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1 text-xs">
          <X className="h-3 w-3" /> Clear
        </Button>
      </div>

      {hub && <MarketplaceFilterChips hub={hub} filters={filters} onFilter={onFilter} />}

      <FilterSelect
        label="Brand"
        value={filters.brand as string}
        options={brands.length ? brands : ["Hyundai", "Tata", "Maruti", "Honda", "Mahindra", "Kia", "Toyota"]}
        onChange={(v) => onFilter("brand", v)}
      />
      <div>
        <Label className="text-xs text-muted-foreground">Model</Label>
        <Input
          className="mt-1 h-9"
          placeholder="e.g. Creta, Activa"
          value={(filters.model as string) ?? ""}
          onChange={(e) => onFilter("model", e.target.value || undefined)}
        />
      </div>
      <FilterSelect label="Fuel" value={filters.fuel as string} options={fuels} onChange={(v) => onFilter("fuel", v)} />
      <FilterSelect
        label="Transmission"
        value={filters.transmission as string}
        options={TRANSMISSIONS}
        onChange={(v) => onFilter("transmission", v)}
      />
      <FilterSelect label="City" value={filters.city as string} options={VEHICLE_CITIES} onChange={(v) => onFilter("city", v)} />
      {bodyTypes.length > 0 && (
        <FilterSelect
          label="Body type"
          value={filters.bodyType as string}
          options={bodyTypes}
          onChange={(v) => onFilter("bodyType", v)}
        />
      )}
      <FilterSelect label="Color" value={filters.color as string} options={VEHICLE_COLORS} onChange={(v) => onFilter("color", v)} />
      {featureFlags.vehicleSaleMode && (hub === "cars" || !hub) ? (
        <div>
          <Label className="text-xs text-muted-foreground">Sale mode</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={(filters.saleMode as string) ?? ""}
            onChange={(e) => onFilter("saleMode", e.target.value || undefined)}
          >
            <option value="">All</option>
            {SALE_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <RangeFilter label="Price (₹)" minKey="priceMin" maxKey="priceMax" filters={filters} onFilter={onFilter} step={50000} />
      <div>
        <Label className="text-xs text-muted-foreground">Max EMI / month (₹)</Label>
        <Input
          type="number"
          className="mt-1 h-9"
          placeholder="15000"
          value={(filters.emiMax as number) ?? ""}
          onChange={(e) => onFilter("emiMax", e.target.value || undefined)}
        />
      </div>
      <RangeFilter label="Year" minKey="yearMin" maxKey="yearMax" filters={filters} onFilter={onFilter} />
      <div>
        <Label className="text-xs text-muted-foreground">Max KM driven</Label>
        <Input
          type="number"
          className="mt-1 h-9"
          placeholder="50000"
          value={(filters.kmsMax as number) ?? ""}
          onChange={(e) => onFilter("kmsMax", e.target.value || undefined)}
        />
      </div>
      <FilterSelect
        label="Ownership"
        value={filters.owners?.toString()}
        options={["1", "2", "3"]}
        onChange={(v) => onFilter("owners", v)}
      />
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function RangeFilter({
  label,
  minKey,
  maxKey,
  filters,
  onFilter,
  step,
}: {
  label: string;
  minKey: string;
  maxKey: string;
  filters: Record<string, unknown>;
  onFilter: (key: string, value: string | undefined) => void;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Input
          type="number"
          step={step}
          placeholder="Min"
          className="h-9"
          value={(filters[minKey] as number) ?? ""}
          onChange={(e) => onFilter(minKey, e.target.value || undefined)}
        />
        <Input
          type="number"
          step={step}
          placeholder="Max"
          className="h-9"
          value={(filters[maxKey] as number) ?? ""}
          onChange={(e) => onFilter(maxKey, e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
