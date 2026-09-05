import type { NewCarBrand, NewCarCollection } from "../types";

export const NEW_CARS_TAGLINE =
  "India's AI-Powered New Car Marketplace — OEM dealers, on-road pricing & instant EMI.";

export const NEW_CAR_BRANDS: NewCarBrand[] = [
  { name: "Hyundai", slug: "hyundai", count: "12 models", href: "/new-cars/browse?brand=Hyundai" },
  { name: "Maruti", slug: "maruti", count: "18 models", href: "/new-cars/browse?brand=Maruti" },
  { name: "Tata", slug: "tata", count: "14 models", href: "/new-cars/browse?brand=Tata" },
  { name: "Mahindra", slug: "mahindra", count: "11 models", href: "/new-cars/browse?brand=Mahindra" },
  { name: "Honda", slug: "honda", count: "8 models", href: "/new-cars/browse?brand=Honda" },
  { name: "Toyota", slug: "toyota", count: "9 models", href: "/new-cars/browse?brand=Toyota" },
  { name: "Kia", slug: "kia", count: "7 models", href: "/new-cars/browse?brand=Kia" },
  { name: "BMW", slug: "bmw", count: "6 models", href: "/new-cars/browse?brand=BMW" },
];

export const NEW_CAR_COLLECTIONS: NewCarCollection[] = [
  {
    id: "launched",
    title: "Newly launched",
    description: "Latest showroom arrivals with launch offers",
    href: "/new-cars/browse?sort=newest",
  },
  {
    id: "upcoming",
    title: "Upcoming cars",
    description: "Book early — be first to drive",
    href: "/new-cars/browse?upcoming=1",
  },
  {
    id: "suv",
    title: "Best SUVs",
    description: "Family-ready SUVs with ADAS & sunroofs",
    href: "/new-cars/browse?bodyType=SUV",
    segment: "suv",
  },
  {
    id: "hatch",
    title: "Best hatchbacks",
    description: "City-friendly, high mileage picks",
    href: "/new-cars/browse?bodyType=Hatchback",
    segment: "hatchback",
  },
  {
    id: "sedan",
    title: "Best sedans",
    description: "Executive comfort & highway cruisers",
    href: "/new-cars/browse?bodyType=Sedan",
    segment: "sedan",
  },
  {
    id: "ev",
    title: "EV cars",
    description: "Electric with fast-charge & subsidies",
    href: "/new-cars/browse?fuel=Electric",
    segment: "ev",
  },
  {
    id: "luxury",
    title: "Luxury cars",
    description: "Premium German & Japanese flagships",
    href: "/new-cars/browse?priceMin=2500000",
    segment: "luxury",
  },
  {
    id: "budget",
    title: "Budget cars",
    description: "Under ₹10L on-road value leaders",
    href: "/new-cars/browse?priceMax=1000000",
    segment: "budget",
  },
];

export const NEW_CAR_STATS = [
  { label: "New models", value: "Catalog" },
  { label: "OEM dealers", value: "Verified network" },
  { label: "Cities", value: "Pan-India" },
  { label: "Loan offers", value: "Eligibility check" },
] as const;
