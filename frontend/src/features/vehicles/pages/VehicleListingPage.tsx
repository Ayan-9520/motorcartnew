import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryTabs } from "../components/CategoryTabs";
import { AdvancedSearchBar } from "../components/AdvancedSearchBar";
import { VehicleFilters } from "../components/VehicleFilters";
import { VehicleSortBar } from "../components/VehicleSortBar";
import { VehicleCard } from "../components/VehicleCard";
import { VehiclePagination } from "../components/VehiclePagination";
import { CompareFloatingBar } from "../components/CompareFloatingBar";
import { AIRecommendations } from "../components/AIRecommendations";
import { VehicleMarketplaceShell } from "../components/VehicleMarketplaceShell";
import { StockByPinPanel } from "@/features/inventory/components/StockByPinPanel";
import { useVehicleSearch } from "@/hooks/useVehicleSearch";
import { setPageMeta } from "@/utils/seo";
import { VEHICLE_CATEGORIES } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  VEHICLE_CATEGORIES.map((c) => [c.id, c.label])
);

export function VehicleListingPage() {
  const { category: categoryParam } = useParams<{ category?: string }>();
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const {
    vehicles,
    total,
    totalPages,
    page,
    loading,
    sort,
    category,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    searchParams,
  } = useVehicleSearch(categoryParam);

  const title = category ? CATEGORY_LABELS[category] ?? "Vehicles" : "All Vehicles";

  useEffect(() => {
    setPageMeta({
      title: `${title} — Buy Online`,
      description: `Browse ${total}+ ${title.toLowerCase()} with EMI calculator, verified dealers & AI recommendations on Motorcart.in`,
    });
  }, [title, total]);

  const filterRecord = Object.fromEntries(searchParams.entries());

  return (
    <VehicleMarketplaceShell
      title={title}
      subtitle="Smart filters, AI picks, compare up to 4 cars, EMI & loan eligibility — CarDekho-grade experience."
      count={total}
    >
      <div className="space-y-6">
        <CategoryTabs />
        <AdvancedSearchBar onToggleFilters={() => setShowMobileFilters((s) => !s)} />
        <StockByPinPanel />

        <div className="flex items-start gap-8">
          <div className={`marketplace-filters-rail hidden w-72 shrink-0 lg:block ${showMobileFilters ? "lg:block" : ""}`}>
            <div className={showMobileFilters ? "fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4 lg:static lg:overflow-visible lg:bg-transparent lg:p-0" : ""}>
              {showMobileFilters && (
                <button type="button" className="mb-4 text-sm text-primary lg:hidden" onClick={() => setShowMobileFilters(false)}>
                  ← Back to results
                </button>
              )}
              <VehicleFilters filters={filterRecord} onFilter={setFilter} onClear={clearFilters} />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <VehicleSortBar sort={sort} total={total} layout={layout} onSort={setSort} onLayout={setLayout} />

            {loading ? (
              <div className={layout === "grid" ? "vehicle-listing-grid marketplace-results-grid" : "space-y-3"}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className={layout === "grid" ? "h-72 w-full rounded-xl" : "h-40 w-full rounded-xl"} />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-lg font-medium">No vehicles found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <div className={layout === "grid" ? "vehicle-listing-grid marketplace-results-grid" : "space-y-3"}>
                {vehicles.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} index={i} layout={layout} />
                ))}
              </div>
            )}

            <VehiclePagination page={page} totalPages={totalPages} onPage={setPage} />
            <AIRecommendations pool={vehicles} />
          </div>
        </div>
      </div>
      <CompareFloatingBar />
    </VehicleMarketplaceShell>
  );
}
