import { useEffect } from "react";
import { HeroSection } from "@/features/home/HeroSection";
import { QuickAccessSection } from "@/features/home/QuickAccessSection";
import { HomePlatformMatrix } from "@/features/home/HomePlatformMatrix";
import { HomeTrustBand } from "@/features/home/HomeTrustBand";
import { HomePartnersPremium } from "@/features/home/HomePartnersPremium";
import { FeaturedVehicles } from "@/features/home/FeaturedVehicles";
import { NewCarsHomeSection } from "@/features/home/NewCarsHomeSection";
import { PreownedCarsHomeSection } from "@/features/home/PreownedCarsHomeSection";
import { CategorySection } from "@/features/home/CategorySection";
import { AuctionsSection } from "@/features/home/AuctionsSection";
import { CommunitySection } from "@/features/home/CommunitySection";
import { FinanceSection } from "@/features/home/FinanceSection";
import { BanksStripSection } from "@/features/home/BanksStripSection";
import { PartsSection } from "@/features/home/PartsSection";
import { ServicesSection } from "@/features/home/ServicesSection";
import { VehicleEcosystemSection } from "@/features/home/VehicleEcosystemSection";
import { AIFeaturesSection } from "@/features/home/AIFeaturesSection";
import { AIRecommendationsHomeSection } from "@/features/home/AIRecommendationsHomeSection";
import { DealerCTA } from "@/features/home/DealerCTA";
import { StatsSection } from "@/features/home/StatsSection";
import { TestimonialsSection } from "@/features/home/TestimonialsSection";
import { AppDownloadSection } from "@/features/home/AppDownloadSection";
import { HeroSearchProvider } from "@/features/home/components/hero-search-context";
import { HomePageProvider } from "@/features/home/context/HomePageContext";
import { MarketingHomeGate } from "@/components/routing/MarketingHomeGate";
import { setPageMeta } from "@/utils/seo";
import { SITE_TAGLINE } from "@/lib/constants";
import { useVehicleHubStore } from "@/store/vehicleHubStore";

/**
 * Marketing homepage — hero unchanged; every product line gets a dedicated section.
 * Section order is fixed (not filtered by hero tab) so cars, trucks, auctions,
 * community, finance, parts & services all stay visible.
 */
export function HomePage() {
  useEffect(() => {
    setPageMeta({
      title: "Motorcart.in — India's AI Automobile Ecosystem",
      description: SITE_TAGLINE,
    });
    useVehicleHubStore.getState().setBuyContext("cars", "used");
  }, []);

  return (
    <MarketingHomeGate>
      <HomePageProvider>
        <div className="home-page bg-background">
          <HeroSearchProvider>
          <HeroSection />
          <QuickAccessSection />
          <HomePlatformMatrix />
          <HomeTrustBand />
          <FeaturedVehicles />
          <NewCarsHomeSection />
          <PreownedCarsHomeSection />
          <AuctionsSection />
          <CommunitySection />
          <FinanceSection />
          <BanksStripSection />
          <HomePartnersPremium />
          <PartsSection />
          <ServicesSection />
          <CategorySection />
          <VehicleEcosystemSection />
          <AIFeaturesSection />
          <AIRecommendationsHomeSection />
          <DealerCTA />
          <StatsSection />
          <TestimonialsSection />
          <AppDownloadSection />
          </HeroSearchProvider>
        </div>
      </HomePageProvider>
    </MarketingHomeGate>
  );
}
