import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { NewCarModelCard } from "@/features/new-cars/components/NewCarModelCard";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { BUY_CAR_BRANDS } from "@/features/marketplace/data/buy-brands";
import {
  groupNewCarsByModel,
  searchNewCarModelGroups,
} from "@/features/new-cars/services/new-cars.service";
import { SectionHeader } from "./SectionHeader";

const HOME_BRAND_CHIPS = BUY_CAR_BRANDS.slice(0, 8);

/**
 * Popular models from live dealer stock (/api/new-car/stock).
 * Uploaded photos show on cards; no fake demo SVGs when inventory exists or is empty.
 */
export function NewCarsHomeSection() {
  const { newCars } = useHomePage();
  const fromHomeApi = groupNewCarsByModel(newCars).slice(0, 4);

  const { data: fromStock = [], isLoading, isFetched } = useQuery({
    queryKey: ["home-new-car-model-groups"],
    queryFn: async () => {
      const r = await searchNewCarModelGroups({
        filters: { condition: "new" },
        sort: "newest",
        page: 1,
        pageSize: 4,
      });
      return r.groups.slice(0, 4);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Prefer showroom stock (real uploads) over home vehicles table / never invent demo cars
  const models = fromStock.length ? fromStock : fromHomeApi;
  const loading = isLoading && !isFetched && !models.length;
  const empty = !loading && models.length === 0;

  return (
    <section className="home-section">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="New cars"
          title="Popular models"
          description={
            empty
              ? "Dealer stock will appear here as soon as showrooms upload inventory."
              : "On-road price, variants and dealer offers — synced from showroom inventory."
          }
          href="/buy/cars/new"
          linkLabel="Browse new cars"
        />
        <div className="partner-scroll flex gap-2 pb-1">
          {HOME_BRAND_CHIPS.map((b) => (
            <Link
              key={b.id}
              to={`/buy/cars/new?brand=${encodeURIComponent(b.brand)}`}
              className="partner-pill group inline-flex h-11 items-center gap-2 px-3.5 hover:text-primary"
              aria-label={`Browse ${b.name}`}
            >
              {b.logo ? <BrandLogo src={b.logo} alt={b.name} size="sm" /> : null}
              <span className="text-xs font-semibold">{b.name}</span>
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <Car className="mx-auto h-10 w-10 text-muted-foreground opacity-40" strokeWidth={1.25} />
            <p className="mt-3 text-sm font-semibold">No new cars in stock yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              When dealers upload photos and inventory, those models show here with real images.
            </p>
            <Button size="sm" className="mt-4 rounded-lg" asChild>
              <Link to="/buy/cars/new">Browse new cars</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {models.map((g, i) => (
              <NewCarModelCard key={g.id} group={g} index={i} />
            ))}
          </div>
        )}

        {!empty ? (
          <div className="text-center">
            <Button size="sm" className="home-section-cta rounded-lg" asChild>
              <Link to="/buy/cars/new">
                View all new cars <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
