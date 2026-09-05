import { useEffect, useState } from "react";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleFilters } from "@/features/vehicles/components/VehicleFilters";
import { VehicleSortBar } from "@/features/vehicles/components/VehicleSortBar";
import { VehiclePagination } from "@/features/vehicles/components/VehiclePagination";
import { CompareFloatingBar } from "@/features/vehicles/components/CompareFloatingBar";
import { StockByPinPanel } from "@/features/inventory/components/StockByPinPanel";
import { NewCarCard } from "../components/NewCarCard";
import { useNewCarSearch } from "../hooks/useNewCarSearch";
import { setPageMeta } from "@/utils/seo";

export function NewCarsListingPage() {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const {
    vehicles,
    total,
    totalPages,
    page,
    loading,
    sort,
    setFilter,
    setSort,
    setPage,
    clearFilters,
    searchParams,
  } = useNewCarSearch();

  useEffect(() => {
    useVehicleHubStore.getState().setBuyContext("cars", "new");
  }, []);

  useEffect(() => {
    setPageMeta({
      title: "Browse New Cars",
      description: "Compare new cars with on-road price, EMI, offers and book test drives on Motorcart.in",
    });
  }, [total]);

  const filterRecord = Object.fromEntries(searchParams.entries());

  return (
    <div className="wa-pattern min-h-screen">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/new-cars" className="hover:text-primary">
            New Cars
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Browse</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold md:text-4xl">Browse new cars</h1>
          <p className="mt-1 text-muted-foreground">{total}+ models · OEM dealers · instant EMI</p>
        </motion.div>

        <StockByPinPanel />

        <div className="flex items-start gap-8">
          <div className="marketplace-filters-rail hidden w-72 shrink-0 lg:block">
            <VehicleFilters filters={filterRecord} onFilter={setFilter} onClear={clearFilters} />
          </div>
          <div className="min-w-0 flex-1 space-y-6">
            <VehicleSortBar
              sort={sort}
              total={total}
              layout={layout}
              onSort={setSort}
              onLayout={setLayout}
            />
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[16/10] w-full rounded-xl" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">No new cars match your filters.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v, i) => (
                  <NewCarCard key={v.id} vehicle={v} index={i} />
                ))}
              </div>
            )}
            <VehiclePagination page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        </div>
      </div>
      <CompareFloatingBar />
    </div>
  );
}
