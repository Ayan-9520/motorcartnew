import { createContext, useContext, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

/** Always-visible marketing chrome (partners / trust / social proof). */
function buildChrome() {
  return {
    banks: BANK_OFFERS,
    loanProducts: loanProducts.filter((p) => p.is_featured).slice(0, 3),
    communityPosts: COMMUNITY_POSTS,
    heroStats: [...HERO_STATS] as HomeHeroStatItem[],
    platformStats,
    testimonials,
  };
}

function buildFallback(): HomePageContextValue {
  const chrome = buildChrome();

  if (realDataOnly) {
    return {
      data: null,
      isLoading: false,
      isLive: false,
      featuredVehicles: [],
      newCars: [],
      preownedCars: [],
      auctions: [],
      parts: [],
      ...chrome,
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
    ...chrome,
  };
}

function pickList<T>(live: T[], fallback: T[], allowMock: boolean): T[] {
  if (live.length) return live;
  return allowMock ? fallback : live;
}

export function HomePageProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isFetching, isPending } = useQuery({
    queryKey: ["home-page"],
    queryFn: fetchHomePageApi,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 4000),
    placeholderData: keepPreviousData,
  });

  const loading = isPending || (isLoading && !data) || (isFetching && !data);
  const allowMock = !realDataOnly;
  const chrome = buildChrome();
  const fb = buildFallback();

  const value: HomePageContextValue = (() => {
    if (!data) {
      return { ...fb, isLoading: loading };
    }

    const featuredFromApi = mapHomeVehicles(data.featured_vehicles);
    const newFromApi = asNewCarListings(mapHomeVehicles(data.new_cars));
    const preownedFromApi = asPreownedListings(mapHomeVehicles(data.preowned_cars));
    const auctionsFromApi = data.auctions.map(mapHomeAuctionToCard);
    const banksFromApi = data.banks.map(mapHomeBankToOffer);
    const loansFromApi = data.banks.slice(0, 6).map(mapHomeBankToLoanProduct);
    const partsFromApi = data.parts.map(mapHomePartToCard);
    const communityFromApi = data.community_posts.map((p) => ({
      tag: p.tag,
      title: p.title,
      author: p.author,
      replies: p.replies,
      href: p.href,
    }));
    const heroFromApi = data.hero_stats.map((s) => ({
      label: s.label,
      value: s.value,
      href: s.href,
    }));
    const platformFromApi = data.platform_stats.map((s) => ({
      label: s.label,
      value: s.value,
    }));
    const testimonialsFromApi = data.testimonials.map((t) => ({
      name: t.name,
      role: t.role,
      text: t.text,
      rating: t.rating,
    }));

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
      isLoading: loading,
      isLive: hasLiveContent,
      featuredVehicles: pickList(featuredFromApi, fb.featuredVehicles, allowMock),
      newCars: pickList(newFromApi, fb.newCars, allowMock),
      preownedCars: pickList(preownedFromApi, fb.preownedCars, allowMock),
      auctions: pickList(auctionsFromApi, fb.auctions, allowMock),
      // Marketing chrome: never blank the home when API omits banks/social proof
      banks: banksFromApi.length ? banksFromApi : chrome.banks,
      loanProducts: loansFromApi.length ? loansFromApi : chrome.loanProducts,
      parts: pickList(partsFromApi, fb.parts, allowMock),
      communityPosts: communityFromApi.length ? communityFromApi : chrome.communityPosts,
      heroStats: heroFromApi.length ? heroFromApi : chrome.heroStats,
      platformStats: platformFromApi.length ? platformFromApi : chrome.platformStats,
      testimonials: testimonialsFromApi.length ? testimonialsFromApi : chrome.testimonials,
    };
  })();

  return <HomePageContext.Provider value={value}>{children}</HomePageContext.Provider>;
}

export function useHomePage() {
  const ctx = useContext(HomePageContext);
  if (!ctx) throw new Error("useHomePage must be used within HomePageProvider");
  return ctx;
}
