import { useEffect } from "react";
import { HeroSection } from "@/features/home/HeroSection";
import { QuickAccessSection } from "@/features/home/QuickAccessSection";
import { HomePlatformMatrix } from "@/features/home/HomePlatformMatrix";
import { HomeTrustBand } from "@/features/home/HomeTrustBand";
import { HomePartnersPremium } from "@/features/home/HomePartnersPremium";
import { FeaturedVehicles } from "@/features/home/FeaturedVehicles";
import { NewCarsHomeSection } from "@/features/home/NewCarsHomeSection";
import { PreownedCarsHomeSection } from "@/features/home/PreownedCarsHomeSection";
import { AuctionsSection } from "@/features/home/AuctionsSection";
import { CommunitySection } from "@/features/home/CommunitySection";
import { FinanceSection } from "@/features/home/FinanceSection";
import { BanksStripSection } from "@/features/home/BanksStripSection";
import { PartsSection } from "@/features/home/PartsSection";
import { ServicesSection } from "@/features/home/ServicesSection";
import { AIFeaturesSection } from "@/features/home/AIFeaturesSection";
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
 * Premium marketing homepage — one inventory pass, no duplicate vehicle rails in hero.
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
        <div className="home-page home-page--premium min-w-0 overflow-x-clip bg-background">
          <HeroSearchProvider>
            <HeroSection />
            <HomeTrustBand />
            <QuickAccessSection />
            <FeaturedVehicles />
            <NewCarsHomeSection />
            <PreownedCarsHomeSection />
            <AuctionsSection />
            <FinanceSection />
            <BanksStripSection />
            <CommunitySection />
            <HomePartnersPremium />
            <PartsSection />
            <ServicesSection />
            <HomePlatformMatrix />
            <AIFeaturesSection />
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
