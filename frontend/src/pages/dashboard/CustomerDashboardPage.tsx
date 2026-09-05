import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Car } from "lucide-react";
import { VehicleCard } from "@/features/vehicles/components/VehicleCard";
import { getVehiclePool } from "@/services/vehicle.service";
import type { VehicleListing } from "@/types/vehicle";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { CustomerDashboardHero } from "@/features/customer-ecosystem/components/CustomerDashboardHero";
import { CustomerWidgetGrid } from "@/features/customer-ecosystem/components/CustomerWidgetGrid";
import { CustomerAiInsightList } from "@/features/customer-ecosystem/components/CustomerAiInsightList";
import { CustomerVehicleCard } from "@/features/customer-ecosystem/components/CustomerVehicleCard";
import { CustomerEngagementStrip } from "@/features/customer-ecosystem/components/CustomerEngagementStrip";
import { useCustomerEcosystem } from "@/features/customer-ecosystem/hooks/useCustomerEcosystem";
import {
  buildProfileChecklist,
  computeProfileCompletion,
  getCustomerDisplayName,
} from "@/features/customer-ecosystem/lib/profile-utils";
import { setPageMeta } from "@/utils/seo";

export function CustomerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, loading } = useCustomerEcosystem();
  const recentlyViewed = useVehicleMarketStore((s) => s.recentlyViewed);
  const [pool, setPool] = useState<VehicleListing[]>([]);

  useEffect(() => {
    void getVehiclePool().then(setPool);
  }, []);

  const recentListings = recentlyViewed
    .map((id) => pool.find((v) => v.id === id))
    .filter((v): v is VehicleListing => Boolean(v))
    .slice(0, 3);

  const displayName = getCustomerDisplayName(user);
  const primaryVehicle = data?.vehicles.find((v) => v.isPrimary) ?? data?.vehicles[0];

  const checklist = useMemo(
    () => buildProfileChecklist(user, data?.preferences ?? { profileCompletion: 0, loyaltyTier: "Bronze", rewardPointsBalance: 0 }, primaryVehicle),
    [user, data?.preferences, primaryVehicle]
  );

  const profileCompletion = useMemo(() => computeProfileCompletion(checklist), [checklist]);

  const preferences = useMemo(
    () => ({
      ...(data?.preferences ?? { loyaltyTier: "Bronze", rewardPointsBalance: 0 }),
      profileCompletion,
      city: data?.preferences.city ?? user?.city,
    }),
    [data?.preferences, profileCompletion, user?.city]
  );

  useEffect(() => {
    setPageMeta({
      title: "My Motorcart",
      description: "Ownership hub — garage, insurance, finance, MotorCart One, and real alerts.",
    });
  }, []);

  const topInsight = data?.insights.find((i) => i.severity === "warning") ?? data?.insights[0];

  return (
    <div className="cos-page space-y-8">
      <CustomerDashboardHero
        displayName={displayName}
        preferences={preferences}
        profileCompletion={profileCompletion}
        checklist={checklist}
        topInsight={topInsight}
        rewardPoints={data?.preferences.rewardPointsBalance ?? 0}
        unreadNotifications={data?.unreadNotifications ?? 0}
      />

      <section className="space-y-4">
        <div className="cos-section-head">
          <h2 className="cos-section-title cos-section-title--lg">
            <Activity className="h-5 w-5 text-primary" />
            Ownership pulse
          </h2>
          <p className="cos-section-desc">
            {primaryVehicle
              ? `Snapshot for ${primaryVehicle.brand} ${primaryVehicle.model}`
              : "Add a vehicle to unlock your ownership dashboard"}
          </p>
          <Button variant="ghost" size="sm" className="cos-section-link rounded-lg" asChild>
            <Link to="/dashboard/customer/garage">
              My Garage <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CustomerWidgetGrid widgets={data?.widgets ?? []} loading={loading} />
      </section>

      <CustomerEngagementStrip campaigns={data?.campaigns ?? []} />

      {data?.vehicles.length ? (
        <section className="space-y-4">
          <div className="cos-section-head">
            <h2 className="cos-section-title cos-section-title--lg">
              <Car className="h-5 w-5 text-primary" />
              Your garage
            </h2>
            <p className="cos-section-desc">{data.vehicles.length} vehicle{data.vehicles.length > 1 ? "s" : ""} in your wallet</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.vehicles.slice(0, 2).map((v) => (
              <CustomerVehicleCard key={v.id} vehicle={v} detailed />
            ))}
          </div>
        </section>
      ) : null}

      <CustomerAiInsightList insights={data?.insights ?? []} compact />

      <section className="rounded-xl border p-4">
        <h2 className="cos-section-title">MotorCart One</h2>
        <p className="text-sm text-muted-foreground">Membership identity card — not a payment card or FASTag.</p>
        <Button variant="outline" size="sm" className="mt-2 rounded-lg" asChild>
          <Link to="/dashboard/customer/one">View card</Link>
        </Button>
      </section>

      {recentListings.length > 0 && (
        <section className="space-y-3">
          <div className="cos-section-head">
            <h2 className="cos-section-title cos-section-title--lg">Recently viewed</h2>
            <Button variant="ghost" size="sm" className="cos-section-link rounded-lg" asChild>
              <Link to="/dashboard/customer/recently-viewed">View all</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
