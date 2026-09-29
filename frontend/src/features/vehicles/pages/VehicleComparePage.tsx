import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { fetchVehiclesByIds } from "@/services/vehicle.service";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { getDiscountedPrice, getVehicleEmi, vehicleDetailPath } from "@/lib/vehicle-utils";
import type { VehicleListing } from "@/types/vehicle";
import { setPageMeta } from "@/utils/seo";
import { AICompareInsights } from "@/ai/ecosystem";
import { VehicleImage } from "../components/VehicleImage";
import { inferVehicleSegment, VEHICLE_SEGMENT_LABELS } from "@/lib/media/vehicle-media-registry";

const ROWS: { key: keyof VehicleListing | "emi" | "price"; label: string; fmt?: (v: VehicleListing) => string }[] = [
  { key: "price", label: "Price", fmt: (v) => formatCurrency(getDiscountedPrice(v)) },
  { key: "emi", label: "EMI/mo", fmt: (v) => formatCurrency(getVehicleEmi(v)) },
  { key: "year", label: "Year", fmt: (v) => String(v.year) },
  { key: "kmsDriven", label: "KM driven", fmt: (v) => v.kmsDriven.toLocaleString("en-IN") },
  { key: "fuelType", label: "Fuel" },
  { key: "transmission", label: "Transmission" },
  { key: "owners", label: "Ownership", fmt: (v) => `${v.owners} owner${v.owners > 1 ? "s" : ""}` },
  { key: "bodyType", label: "Body" },
  { key: "city", label: "City" },
];

export function VehicleComparePage() {
  const { compare, removeCompare, clearCompare } = useVehicleMarketStore();
  const [vehicles, setVehicles] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(compare.length > 0);
  const compareKey = compare.join("|");

  useEffect(() => {
    setPageMeta({ title: "Compare vehicles", description: "Side-by-side specs, EMI and price on Motorcart.in" });
  }, []);

  useEffect(() => {
    if (!compare.length) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchVehiclesByIds(compare).then((list) => {
      if (cancelled) return;
      setVehicles(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareKey]);

  if (loading) {
    return (
      <div className="marketplace-compare-page container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {compare.map((id) => (
            <Skeleton key={id} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <div className="marketplace-compare-empty container mx-auto px-4 py-20 text-center">
        <GitCompare className="mx-auto h-12 w-12 text-primary opacity-60" />
        <h1 className="mt-4 text-2xl font-bold">Compare vehicles</h1>
        <p className="mt-2 text-muted-foreground">Add up to 4 cars, bikes or trucks from listings</p>
        <Button variant="default" className="mt-6 rounded-xl" asChild>
          <Link to="/buy">Browse marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="marketplace-compare-page container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Compare vehicles</h1>
          <p className="text-sm text-muted-foreground">CarDekho-style side-by-side — price, EMI, specs</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCompare}>
          Clear all
        </Button>
      </div>

      <AICompareInsights vehicles={vehicles} />

      <div className="overflow-x-auto rounded-2xl border border-border/90 bg-card shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/80">
              <th className="p-4 text-left font-medium text-muted-foreground w-36">Spec</th>
              {vehicles.map((v) => {
                const seg = inferVehicleSegment({
                  brand: v.brand,
                  model: v.model,
                  bodyType: v.bodyType,
                  category: v.category,
                  fuelType: v.fuelType,
                });
                return (
                  <th key={v.id} className="min-w-[200px] p-3 align-top">
                    <Card className="relative overflow-hidden border-border/80">
                      <VehicleImage
                        alt={v.title}
                        className="aspect-video w-full object-cover"
                        meta={{
                          brand: v.brand,
                          model: v.model,
                          bodyType: v.bodyType,
                          category: v.category,
                          fuelType: v.fuelType,
                        }}
                        images={v.images}
                      />
                      <div className="p-3 text-left">
                        <span className="text-[10px] font-semibold uppercase text-primary">
                          {VEHICLE_SEGMENT_LABELS[seg]}
                        </span>
                        <Link to={vehicleDetailPath(v)} className="mt-1 line-clamp-2 block font-semibold hover:text-primary">
                          {v.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {v.brand} · {v.model}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 bg-background/80"
                        onClick={() => removeCompare(v.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Card>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-border/60">
                <td className="p-4 font-medium text-muted-foreground">{row.label}</td>
                {vehicles.map((v) => (
                  <td key={v.id} className="p-4 text-center font-medium tabular-nums">
                    {row.fmt ? row.fmt(v) : String(v[row.key as keyof VehicleListing] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
