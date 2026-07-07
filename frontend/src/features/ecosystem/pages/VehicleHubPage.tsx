import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { getVehicleHub } from "../data/ecosystem-registry";
import { parseEcosystemHubFromPath } from "../lib/hub-paths";
import { HubBreadcrumbs } from "../components/HubBreadcrumbs";
import { HubHero } from "../components/HubHero";
import { HubFilterChips } from "../components/HubFilterChips";
import { HubBannerStrip } from "../components/HubBannerStrip";
import { HubServiceGrid } from "../components/HubServiceGrid";

export function VehicleHubPage() {
  const { pathname } = useLocation();
  const slug = parseEcosystemHubFromPath(pathname);
  const setBuyContext = useVehicleHubStore((s) => s.setBuyContext);
  const hub = slug ? getVehicleHub(slug) : null;

  useEffect(() => {
    if (slug) setBuyContext(slug as HubCategorySlug, "used");
  }, [slug, setBuyContext]);

  useEffect(() => {
    if (!hub) return;
    setPageMeta({
      title: `${hub.label} — Ecosystem`,
      description: hub.description,
    });
  }, [hub]);

  if (!slug || !hub) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="vehicle-hub-page min-h-screen bg-background">
      <div className="container pt-4 md:pt-6">
        <HubBreadcrumbs items={[{ label: hub.label }]} />
      </div>
      <HubHero hub={hub} />
      <div className="container space-y-8 pb-14 md:space-y-10 md:pb-16">
        <HubFilterChips filters={hub.filters} />
        <HubBannerStrip banners={hub.banners} />
        <HubServiceGrid services={hub.services} hubLabel={hub.label} />
      </div>
    </div>
  );
}
