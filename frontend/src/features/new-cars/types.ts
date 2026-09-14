import type { VehicleListing } from "@/types/vehicle";

export type NewCarBodySegment = "suv" | "hatchback" | "sedan" | "ev" | "luxury" | "budget";

export interface NewCarBrand {
  name: string;
  slug: string;
  count: string;
  href: string;
}

export interface NewCarCollection {
  id: string;
  title: string;
  description: string;
  href: string;
  segment?: NewCarBodySegment;
}

export type NewCarListing = VehicleListing & {
  category: "new-cars";
  condition: "new";
};

/** One card on Buy New Cars grid — brand+model with variants behind the open. */
export type NewCarModelGroup = {
  id: string;
  brand: string;
  model: string;
  brandSlug: string;
  modelSlug: string;
  image?: string;
  priceFrom: number | null;
  priceTo: number | null;
  priceOnRequest: boolean;
  variantCount: number;
  variants: string[];
  listingCount: number;
  fuelTypes: string[];
  transmissions: string[];
  bodyType?: string;
  createdAt: string;
  dealerVerified: boolean;
  /** When only one stock row exists, open detail directly. */
  primarySlug?: string;
};
