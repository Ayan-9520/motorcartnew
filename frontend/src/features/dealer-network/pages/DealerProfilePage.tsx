import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setPageMeta } from "@/utils/seo";
import { usePublicDealer } from "../hooks/usePublicDealer";
import { getDealerBySlug } from "../hooks/useDealerDirectory";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import { mapDbToListing } from "@/services/vehicle.service";
import type { DbVehicle } from "@/types/database";
import type { VehicleListing } from "@/types/vehicle";

function mapVehicle(row: Record<string, unknown>): VehicleListing {
  return mapDbToListing(row as unknown as DbVehicle);
}

export function DealerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = usePublicDealer(slug);
  const mockFallback = slug ? getDealerBySlug(slug) : undefined;

  const dealer = data?.dealer;
  const storefront = data?.storefront;
  const vehicles = (data?.vehicles ?? []).map((v) => mapVehicle(v as Record<string, unknown>));
  const reviews = data?.reviews ?? [];

  useEffect(() => {
    const name = dealer?.name ?? mockFallback?.name;
    if (!name) return;
    setPageMeta({
      title: storefront?.seo_title ?? `${name} — Dealer on Motorcart`,
      description:
        storefront?.seo_description ??
        `${name} in ${dealer?.city ?? mockFallback?.city} — verified showroom`,
    });
  }, [dealer, mockFallback, storefront]);

  if (loading) {
    return <p className="container py-16 text-muted-foreground">Loading showroom…</p>;
  }

  if (!dealer && !mockFallback) {
    return (
      <div className="container space-y-3 px-4 py-16">
        <p className="text-muted-foreground">{error ? "Could not load this showroom." : "Showroom not found."}</p>
        <Button variant="outline" asChild>
          <Link to="/dealers/browse">Browse dealers</Link>
        </Button>
      </div>
    );
  }

  const name = dealer?.name ?? mockFallback?.name ?? "Dealer";
  const city = dealer?.city ?? mockFallback?.city ?? "";
  const phone = dealer?.phone ?? mockFallback?.phone;
  const rating = dealer?.rating ?? mockFallback?.rating ?? 4.5;
  const verified = dealer?.is_verified ?? mockFallback?.isVerified ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/80 bg-card/50">
        <div className="container flex flex-wrap items-center gap-4 px-4 py-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dealers/browse">
              <ArrowLeft className="mr-1 h-4 w-4" /> All dealers
            </Link>
          </Button>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Store className="h-10 w-10 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold md:text-3xl">{name}</h1>
              {verified && (
                <Badge className="gap-1 border-0 bg-primary/15 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {city}
              {dealer?.state ? `, ${dealer.state}` : ""}
            </p>
            <div className="mt-2 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{Number(rating).toFixed(1)}</span>
              <span className="text-muted-foreground">({reviews.length} reviews)</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {phone && (
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <a href={`tel:${phone}`}>
                    <Phone className="h-4 w-4" /> Call
                  </a>
                </Button>
              )}
              <Button size="sm" className="gap-1" asChild>
                <a
                  href={`https://wa.me/91${(phone ?? "9876543210").replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Inventory ({vehicles.length})</h2>
          <p className="text-sm text-muted-foreground">
            Cars, bikes, trucks & more — segment-correct images from dealer listings
          </p>
          {vehicles.length > 0 ? (
            <div className="vehicle-listing-grid marketplace-results-grid mt-4">
              {vehicles.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} index={i} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              No live listings — contact dealer for stock.
            </p>
          )}
        </section>

        {reviews.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Customer reviews</h2>
            <ul className="mt-4 space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <li key={r.id as string} className="rounded-xl border border-border/80 bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{String(r.rating ?? 5)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{String(r.comment ?? "")}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
