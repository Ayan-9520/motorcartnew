import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHomePageApi, type HomePageData } from "@/integrations/api/home";
import {
  asNewCarListings,
  asPreownedListings,
  mapHomeAuctionToCard,
  mapHomeBankToLoanProduct,
  mapHomeBankToOffer,
  mapHomePartToCard,
  mapHomeVehicles,
} from "@/features/home/lib/map-home-data";
import { MOCK_VEHICLES } from "@/data/vehicle-catalog";
import { realDataOnly } from "@/config/real-data";
import { liveAuctions, platformStats, testimonials } from "@/data/mock";
import { loanProducts } from "@/data/loans";
import { autoParts } from "@/data/parts";
import { BANK_OFFERS, COMMUNITY_POSTS, HERO_STATS } from "@/features/home/data/homepage-data";
import { getFeaturedNewCars } from "@/features/new-cars/services/new-cars.service";
import { getFeaturedPreowned } from "@/features/preowned-cars/services/preowned-cars.service";
import { sortVehicles } from "@/lib/vehicle-utils";

export type HomeHeroStatItem = { label: string; value: string; href: string };

type HomePageContextValue = {
  data: HomePageData | null;
  isLoading: boolean;
  isLive: boolean;
  featuredVehicles: ReturnType<typeof mapHomeVehicles>;
  newCars: ReturnType<typeof asNewCarListings>;
  preownedCars: ReturnType<typeof asPreownedListings>;
  auctions: ReturnType<typeof mapHomeAuctionToCard>[];
  banks: ReturnType<typeof mapHomeBankToOffer>[];
  loanProducts: ReturnType<typeof mapHomeBankToLoanProduct>[];
  parts: ReturnType<typeof mapHomePartToCard>[];
  communityPosts: Array<{ tag: string; title: string; author: string; replies: number; href?: string }>;
  heroStats: HomeHeroStatItem[];
  platformStats: typeof platformStats;
  testimonials: typeof testimonials;
};

const HomePageContext = createContext<HomePageContextValue | null>(null);

function buildFallback(): HomePageContextValue {
  if (realDataOnly) {
    return {
      data: null,
      isLoading: false,
      isLive: false,
      featuredVehicles: [],
      newCars: [],
      preownedCars: [],
      auctions: [],
      banks: [],
      loanProducts: [],
      parts: [],
      communityPosts: [],
      heroStats: [],
      platformStats: [],
      testimonials: [],
    };
  }

  const mockFeatured = sortVehicles(
    MOCK_VEHICLES.filter((v) => v.isFeatured && v.status === "available"),
    "ai-score"
  ).slice(0, 12);

  return {
    data: null,
    isLoading: false,
    isLive: false,
    featuredVehicles: mockFeatured,
    newCars: getFeaturedNewCars(4),
    preownedCars: getFeaturedPreowned(4),
    auctions: liveAuctions.map((a) => ({
      id: a.id,
      title: a.title,
      image: a.image,
      endsAt: a.endsAt,
      location: a.location,
      bidCount: a.bidCount,
      currentBid: a.currentBid,
      startingBid: a.startingBid,
      slug: a.id,
    })),
    banks: BANK_OFFERS,
    loanProducts: loanProducts.filter((p) => p.is_featured).slice(0, 3),
    parts: autoParts.slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice,
      rating: p.rating,
      reviewCount: p.reviewCount,
      image: p.image,
    })),
    communityPosts: COMMUNITY_POSTS,
    heroStats: [...HERO_STATS],
    platformStats,
    testimonials,
  };
}

export function HomePageProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["home-page"],
    queryFn: fetchHomePageApi,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 0,
    gcTime: 120_000,
  });

  const value: HomePageContextValue = (() => {
    if (!data) {
      const fb = buildFallback();
      return { ...fb, isLoading: false };
    }

    const featuredFromApi = mapHomeVehicles(data.featured_vehicles);
    const newFromApi = asNewCarListings(mapHomeVehicles(data.new_cars));
    const preownedFromApi = asPreownedListings(mapHomeVehicles(data.preowned_cars));
    const fb = buildFallback();

    const hasLiveContent = Boolean(
      featuredFromApi.length ||
        newFromApi.length ||
        preownedFromApi.length ||
        data.auctions.length ||
        data.banks.length ||
        data.parts.length ||
        data.community_posts.length ||
        data.testimonials.length ||
        (data.stats?.vehicles ?? 0) > 0
    );

    return {
      data,
      isLoading,
      isLive: hasLiveContent,
      featuredVehicles: featuredFromApi.length ? featuredFromApi : realDataOnly ? [] : fb.featuredVehicles,
      newCars: newFromApi.length ? newFromApi : realDataOnly ? [] : fb.newCars,
      preownedCars: preownedFromApi.length ? preownedFromApi : realDataOnly ? [] : fb.preownedCars,
      auctions: data.auctions.length ? data.auctions.map(mapHomeAuctionToCard) : realDataOnly ? [] : fb.auctions,
      banks: data.banks.length ? data.banks.map(mapHomeBankToOffer) : realDataOnly ? [] : fb.banks,
      loanProducts: data.banks.length
        ? data.banks.slice(0, 6).map(mapHomeBankToLoanProduct)
        : realDataOnly ? [] : fb.loanProducts,
      parts: data.parts.length ? data.parts.map(mapHomePartToCard) : realDataOnly ? [] : fb.parts,
      communityPosts: data.community_posts.length
        ? data.community_posts.map((p) => ({
            tag: p.tag,
            title: p.title,
            author: p.author,
            replies: p.replies,
            href: p.href,
          }))
        : realDataOnly ? [] : fb.communityPosts,
      heroStats: data.hero_stats.length
        ? data.hero_stats.map((s) => ({ label: s.label, value: s.value, href: s.href }))
        : realDataOnly ? [] : fb.heroStats,
      platformStats: data.platform_stats.length
        ? data.platform_stats.map((s) => ({ label: s.label, value: s.value }))
        : realDataOnly ? [] : fb.platformStats,
      testimonials: data.testimonials.length
        ? data.testimonials.map((t) => ({
            name: t.name,
            role: t.role,
            text: t.text,
            rating: t.rating,
          }))
        : realDataOnly ? [] : fb.testimonials,
    };
  })();

  return <HomePageContext.Provider value={value}>{children}</HomePageContext.Provider>;
}

export function useHomePage() {
  const ctx = useContext(HomePageContext);
  if (!ctx) throw new Error("useHomePage must be used within HomePageProvider");
  return ctx;
}
