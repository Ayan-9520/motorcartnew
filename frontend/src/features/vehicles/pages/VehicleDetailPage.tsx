import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, GitCompare, ChevronRight, Gauge, Fuel, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleGallery } from "../components/VehicleGallery";
import { Viewer360 } from "../components/Viewer360";
import { VideoSection } from "../components/VideoSection";
import { VehicleDetailTabs } from "../components/VehicleDetailTabs";
import { SimilarVehicles } from "../components/SimilarVehicles";
import { RecentlyViewed } from "../components/RecentlyViewed";
import { ShareVehicle } from "../components/ShareVehicle";
import { ReportListingDialog } from "../components/ReportListingDialog";
import { WhatsAppCTA } from "../components/WhatsAppCTA";
import { EnquiryForm } from "../components/EnquiryForm";
import { TestDriveBooking } from "../components/TestDriveBooking";
import { CompareFloatingBar } from "../components/CompareFloatingBar";
import { MarketplaceVehicleTools } from "../components/MarketplaceVehicleTools";
import { useVehicleDetail } from "@/hooks/useVehicleDetail";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { setPageMeta } from "@/utils/seo";
import { formatCurrency } from "@/lib/utils";
import {
  getDiscountedPrice,
  getVehicleEmi,
  inferBuyHubFromVehicle,
  vehicleListingPath,
} from "@/lib/vehicle-utils";
import { buyListingPath, hubCategoryLabel } from "@/features/marketplace/lib/route-utils";
import { resolveVehicleDetailGallery, resolveVehicleHero } from "@/lib/media/resolve-images";
import toast from "react-hot-toast";

export function VehicleDetailPage() {
  const { slug, category } = useParams<{ slug: string; category?: string }>();
  const { vehicle, similar, loading } = useVehicleDetail(slug);
  const toggleWishlist = useVehicleMarketStore((s) => s.toggleWishlist);
  const addCompare = useVehicleMarketStore((s) => s.addCompare);
  const vehicleId = vehicle?.id ?? "";
  const wishlisted = useVehicleMarketStore((s) => s.wishlist.includes(vehicleId));
  const inCompare = useVehicleMarketStore((s) => s.compare.includes(vehicleId));

  useEffect(() => {
    if (vehicle) {
      setPageMeta({
        title: `${vehicle.year} ${vehicle.brand} ${vehicle.model} — ${formatCurrency(vehicle.price)}`,
        description: `Buy ${vehicle.title} in ${vehicle.city}. EMI from ${formatCurrency(getVehicleEmi(vehicle))}/mo. Specs, inspection, finance & dealer on Motorcart.in`,
        ogImage: resolveVehicleHero(vehicle.brand, vehicle.model, vehicle.bodyType, vehicle.images) || undefined,
      });
    }
  }, [vehicle]);

  if (loading) {
    return (
      <div className="vm-detail-page container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[28rem] lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Vehicle not found</h1>
        <Button variant="default" className="mt-4" asChild>
          <Link to="/buy">Browse vehicles</Link>
        </Button>
      </div>
    );
  }

  const price = getDiscountedPrice(vehicle);
  const priceOnRequest =
    Boolean(vehicle.metadata.priceOnRequest) ||
    vehicle.metadata.priceDisplay === "Price on request" ||
    !(price > 0);
  const emi = priceOnRequest ? 0 : getVehicleEmi(vehicle);
  const { hub, condition } = inferBuyHubFromVehicle(vehicle);
  const listingPath = vehicleListingPath(vehicle);
  const hubLabel = hubCategoryLabel(hub);
  const condLabel = condition === "new" ? "New" : "Pre-Owned";

  const galleryImages = resolveVehicleDetailGallery({
    brand: vehicle.brand,
    model: vehicle.model,
    bodyType: vehicle.bodyType,
    category: vehicle.category,
    fuelType: vehicle.fuelType,
    images: vehicle.images,
  });

  return (
    <div className="vm-detail-page min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        <nav className="vm-breadcrumb">
          <Link to="/buy" className="hover:text-primary">
            Buy
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={buyListingPath(hub, condition)} className="hover:text-primary">
            {hubLabel}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={listingPath} className="hover:text-primary">
            {condLabel}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="line-clamp-1 text-foreground font-medium">{vehicle.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(17.5rem,20rem)] xl:grid-cols-[1fr_22rem]">
          <div className="space-y-6 min-w-0">
            <VehicleGallery images={galleryImages} title={vehicle.title} />
            {vehicle.metadata.viewer360 && (
              <Viewer360 images={vehicle.metadata.viewer360} title={vehicle.title} />
            )}
            {vehicle.metadata.videos && (
              <VideoSection videos={vehicle.metadata.videos} title={vehicle.title} />
            )}
            <VehicleDetailTabs vehicle={vehicle} />
            <SimilarVehicles vehicles={similar} />
            <RecentlyViewed />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="vm-price-card">
              <div className="flex flex-wrap gap-2">
                {vehicle.isCertified && (
                  <Badge className="bg-primary text-primary-foreground border-0">Certified</Badge>
                )}
                {vehicle.isFeatured && <Badge variant="secondary">Featured</Badge>}
                {vehicle.metadata.discountPercent ? (
                  <Badge variant="destructive">{vehicle.metadata.discountPercent}% OFF</Badge>
                ) : null}
              </div>
              <h1 className="mt-3 text-xl font-bold leading-snug md:text-2xl">{vehicle.title}</h1>
              {priceOnRequest ? (
                <p className="mt-2 text-3xl font-bold text-primary">Price on request</p>
              ) : (
                <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(price)}</p>
              )}
              {!priceOnRequest && vehicle.originalPrice && vehicle.originalPrice > price && (
                <p className="text-sm text-muted-foreground line-through">{formatCurrency(vehicle.originalPrice)}</p>
              )}
              {priceOnRequest ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {vehicle.metadata.priceSourceText || "Ask dealer for exact price"}
                  <span className="text-muted-foreground"> · {vehicle.city}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {emi > 0 ? (
                    <>
                      EMI from <strong className="text-foreground">{formatCurrency(emi)}/mo</strong>
                    </>
                  ) : null}
                  <span className="text-muted-foreground"> · {vehicle.city}</span>
                </p>
              )}

              <MarketplaceVehicleTools
                variant="sidebar"
                vehicle={vehicle}
                emi={emi}
                inCompare={inCompare}
                onToggleCompare={() => {
                  if (inCompare) {
                    useVehicleMarketStore.getState().removeCompare(vehicle.id);
                    toast.success("Removed from compare");
                  } else {
                    const ok = addCompare(vehicle.id);
                    if (ok) toast.success("Added to compare");
                    else toast.error("Compare list full (max 4)");
                  }
                }}
              />

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="vm-stat-pill">
                  <Gauge className="h-4 w-4" />
                  {vehicle.kmsDriven.toLocaleString("en-IN")} km
                </span>
                <span className="vm-stat-pill">
                  <Fuel className="h-4 w-4" />
                  {vehicle.fuelType}
                </span>
                <span className="vm-stat-pill">
                  <Calendar className="h-4 w-4" />
                  {vehicle.year}
                </span>
                <span className="vm-stat-pill">
                  <Users className="h-4 w-4" />
                  {vehicle.owners} owner
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1 rounded-xl"
                  onClick={() => {
                    toggleWishlist(vehicle.id);
                    toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
                  }}
                >
                  <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
                  {wishlisted ? "Saved" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1 rounded-xl"
                  onClick={() => {
                    if (inCompare) return;
                    const ok = addCompare(vehicle.id);
                    if (!ok) toast.error("Max 4 vehicles to compare");
                    else toast.success("Added to compare");
                  }}
                >
                  <GitCompare className="h-4 w-4" /> Compare
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                <WhatsAppCTA vehicle={vehicle} />
                <ShareVehicle vehicle={vehicle} />
              </div>
              <div className="mt-2 flex justify-center">
                <ReportListingDialog vehicle={vehicle} />
              </div>
            </div>

            <EnquiryForm vehicle={vehicle} />
            <TestDriveBooking vehicle={vehicle} />
            <Button variant="secondary" className="w-full rounded-xl" asChild>
              <Link to={`/finance/apply?vehicle=${vehicle.id}`}>Check loan eligibility</Link>
            </Button>
          </aside>
        </div>
      </div>
      <CompareFloatingBar />
    </div>
  );
}
