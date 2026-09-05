import { api } from "@/lib/api/axios";
import { withApiTimeout } from "@/lib/api/with-timeout";
import type { DbVehicle } from "@/types/database";

export type HomeHeroStat = { label: string; value: string; href: string };
export type HomePlatformStat = { label: string; value: string };

export type HomeCommunityPost = {
  id: string;
  title: string;
  author: string;
  tag: string;
  replies: number;
  href: string;
};

export type HomeTestimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
};

export type HomeAuctionItem = {
  id: string;
  title: string;
  image: string | null;
  ends_at: string;
  location: string | null;
  bid_count: number;
  current_bid: number;
  starting_bid: number;
  slug: string;
};

export type HomeBankItem = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  interest_rate_min: number;
  interest_rate_max: number;
  max_loan_amount: number;
  max_tenure_months: number;
  processing_fee: string | null;
  features: string[];
  is_featured: boolean;
};

export type HomePartItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  original_price: number | null;
  rating: number;
  review_count: number;
  images: string[];
};

export type HomePageData = {
  generated_at: string;
  stats: Record<string, number>;
  hero_stats: HomeHeroStat[];
  platform_stats: HomePlatformStat[];
  banners: Record<string, unknown>[];
  featured_vehicles: DbVehicle[];
  new_cars: DbVehicle[];
  preowned_cars: DbVehicle[];
  auctions: HomeAuctionItem[];
  banks: HomeBankItem[];
  insurance_partners: Record<string, unknown>[];
  parts: HomePartItem[];
  community_posts: HomeCommunityPost[];
  services: Record<string, unknown>[];
  testimonials: HomeTestimonial[];
  brands: Array<{ name: string; slug: string; count: number }>;
};

export async function fetchHomePageApi(): Promise<HomePageData | null> {
  try {
    const { data } = await withApiTimeout(
      api.get<{ data: HomePageData }>("/api/home", { timeout: 12_000 }),
      12_000
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}
