import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { useWishlistVehicles } from "@/hooks/useWishlistVehicles";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { useUIStore } from "@/store/uiStore";
import { VehicleCard } from "../components/VehicleCard";

export function WishlistPage() {
  const { vehicles, missingIds, count, readyCount, isLoading } = useWishlistVehicles();
  const clearAll = useVehicleMarketStore((s) => s.clearWishlist);
  const removeWishlist = useVehicleMarketStore((s) => s.removeWishlist);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  useEffect(() => {
    setPageMeta({
      title: "My Wishlist — Motorcart",
      description: "Saved vehicles you liked on Motorcart.in",
    });
  }, []);

  const showEmpty = !isLoading && count === 0;
  const showGrid = !isLoading && (vehicles.length > 0 || missingIds.length > 0);

  const subtitle =
    count === 0
      ? "Save vehicles you like with the heart icon on any listing"
      : isLoading
        ? `Loading ${count} saved vehicle${count === 1 ? "" : "s"}…`
        : missingIds.length > 0 && readyCount > 0
          ? `${readyCount} ready · ${missingIds.length} unavailable`
          : missingIds.length > 0
            ? `${missingIds.length} saved listing${missingIds.length === 1 ? "" : "s"} no longer available`
            : `${readyCount} saved vehicle${readyCount === 1 ? "" : "s"} — synced across devices`;

  return (
    <div className="wishlist-page min-h-screen">
      <section className="wishlist-hero">
        <div className="container py-10 md:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-4xl">
                <Heart className="h-8 w-8 fill-destructive text-destructive" />
                My wishlist
              </h1>
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setSearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" />
                Search more
              </Button>
              {count > 0 && (
                <Button variant="outline" className="rounded-xl" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container pb-14">
        {isLoading && (
          <div className="vehicle-listing-grid marketplace-results-grid">
            {Array.from({ length: Math.min(count, 6) || 3 }).map((_, i) => (
              <div
                key={`wish-skel-${i}`}
                className="h-[320px] animate-pulse rounded-2xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        )}

        {showEmpty && (
          <div className="wishlist-empty rounded-2xl border border-dashed border-primary/25 bg-card p-12 text-center shadow-[var(--shadow-card)]">
            <Heart className="mx-auto h-14 w-14 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-semibold">No saved vehicles yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any listing to add it here.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button className="rounded-xl shadow-[var(--shadow-primary)]" onClick={() => setSearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" />
                Search vehicles
              </Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/buy">
                  Browse catalog <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {showGrid && (
          <div className="vehicle-listing-grid marketplace-results-grid">
            {vehicles.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} />
            ))}
            {missingIds.map((id) => (
              <div
                key={`missing-${id}`}
                className="flex flex-col justify-between rounded-2xl border border-dashed border-border/80 bg-card p-5 shadow-[var(--shadow-card)]"
              >
                <div>
                  <Heart className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 font-semibold text-foreground">Listing unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This saved vehicle was removed or is no longer public.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => removeWishlist(id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
