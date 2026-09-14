import { useEffect } from "react";
import { HeroSection } from "@/features/home/HeroSection";
import { HomePlatformMatrix } from "@/features/home/HomePlatformMatrix";
import { HomeTrustBand } from "@/features/home/HomeTrustBand";
import { HomePartnersPremium } from "@/features/home/HomePartnersPremium";
import { NewCarsHomeSection } from "@/features/home/NewCarsHomeSection";
import { PreownedCarsHomeSection } from "@/features/home/PreownedCarsHomeSection";
import { AuctionsSection } from "@/features/home/AuctionsSection";
import { FinanceSection } from "@/features/home/FinanceSection";
import { BanksStripSection } from "@/features/home/BanksStripSection";
import { DealerCTA } from "@/features/home/DealerCTA";
import { AppDownloadSection } from "@/features/home/AppDownloadSection";
import { HeroSearchProvider } from "@/features/home/components/hero-search-context";
import { HomePageProvider } from "@/features/home/context/HomePageContext";
import { MarketingHomeGate } from "@/components/routing/MarketingHomeGate";
import { setPageMeta } from "@/utils/seo";
import { SITE_TAGLINE } from "@/lib/constants";
import { useVehicleHubStore } from "@/store/vehicleHubStore";

/**
 * Premium homepage — short story: explore → new → used → finance → auctions → CTA.
 * Empty live rails fall back to real-looking homepage demo showcase.
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
            <HomePlatformMatrix />
            <NewCarsHomeSection />
            <PreownedCarsHomeSection />
            <FinanceSection />
            <BanksStripSection />
            <AuctionsSection />
            <HomePartnersPremium />
            <DealerCTA />
            <AppDownloadSection />
          </HeroSearchProvider>
        </div>
      </HomePageProvider>
    </MarketingHomeGate>
  );
}
