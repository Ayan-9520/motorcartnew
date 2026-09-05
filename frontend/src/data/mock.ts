import type { Vehicle, AuctionItem } from "@/types";
import {
  AUCTION_LISTING_IMAGES,
  FEATURED_VEHICLE_IMAGES,
  getModelImages,
} from "@/lib/media/india-media-catalog";

export const featuredVehicles: Vehicle[] = [
  {
    id: "1", slug: "2023-hyundai-creta", title: "2023 Hyundai Creta SX(O) Diesel",
    brand: "Hyundai", model: "Creta", year: 2023, price: 1485000, emi: 24500,
    fuelType: "Diesel", transmission: "Automatic", kms: 18500, location: "Mumbai",
    image: FEATURED_VEHICLE_IMAGES.creta,
    dealerName: "AutoMax Motors", isVerified: true, isFeatured: true, category: "used-cars", aiScore: 94,
  },
  {
    id: "2", slug: "2024-tata-nexon-ev", title: "2024 Tata Nexon EV Max",
    brand: "Tata", model: "Nexon EV", year: 2024, price: 1699000, emi: 28900,
    fuelType: "Electric", transmission: "Automatic", kms: 8200, location: "Bangalore",
    image: FEATURED_VEHICLE_IMAGES.nexonEv,
    dealerName: "GreenDrive EV", isVerified: true, isFeatured: true, category: "ev", aiScore: 91,
  },
  {
    id: "3", slug: "2024-royal-enfield", title: "2024 Royal Enfield Himalayan 450",
    brand: "Royal Enfield", model: "Himalayan", year: 2024, price: 289000, emi: 5200,
    fuelType: "Petrol", transmission: "Manual", kms: 3200, location: "Delhi",
    image: FEATURED_VEHICLE_IMAGES.himalayan,
    dealerName: "BikeHub", isVerified: true, isFeatured: false, category: "bikes", aiScore: 88,
  },
  {
    id: "4", slug: "2022-tata-407", title: "2022 Tata 407 Gold SFC",
    brand: "Tata", model: "407", year: 2022, price: 1250000, emi: 22000,
    fuelType: "Diesel", transmission: "Manual", kms: 45000, location: "Pune",
    image: FEATURED_VEHICLE_IMAGES.tata407,
    dealerName: "Commercial Motors", isVerified: true, isFeatured: true, category: "trucks", aiScore: 86,
  },
];

export const liveAuctions: AuctionItem[] = [
  {
    id: "1", title: "2019 Honda City VX CVT",
    image: AUCTION_LISTING_IMAGES[0],
    currentBid: 782000, startingBid: 650000, bidCount: 34,
    endsAt: new Date(Date.now() + 3600000 * 4).toISOString(), location: "Mumbai", status: "live",
  },
  {
    id: "2", title: "2020 Kia Seltos HTX Plus",
    image: AUCTION_LISTING_IMAGES[1],
    currentBid: 1085000, startingBid: 950000, bidCount: 28,
    endsAt: new Date(Date.now() + 3600000 * 6).toISOString(), location: "Delhi", status: "live",
  },
  {
    id: "3", title: "2018 Maruti Swift ZXI",
    image: AUCTION_LISTING_IMAGES[2],
    currentBid: 485000, startingBid: 420000, bidCount: 19,
    endsAt: new Date(Date.now() + 3600000 * 3).toISOString(), location: "Bangalore", status: "live",
  },
  {
    id: "4", title: "2021 Hyundai Creta SX",
    image: AUCTION_LISTING_IMAGES[3],
    currentBid: 1240000, startingBid: 1100000, bidCount: 41,
    endsAt: new Date(Date.now() + 3600000 * 5).toISOString(), location: "Pune", status: "live",
  },
];

export const platformStats = [
  { label: "Vehicles Listed", value: "Marketplace listings" },
  { label: "Verified Dealers", value: "Verified dealer network" },
  { label: "Loans Processed", value: "Loan offers" },
  { label: "Happy Customers", value: "Customer community" },
];

export const testimonials = [
  { name: "Arjun Patel", role: "Car Buyer, Mumbai", text: "Got my Creta with loan approved in 4 hours. AI search found the perfect match!", rating: 5 },
  { name: "Sneha Reddy", role: "Dealer Partner", text: "Dealer CRM increased our conversion by 40%. Best platform for automotive business.", rating: 5 },
  { name: "Vikram Singh", role: "DSA Agent", text: "FinanceBot automates eligibility. I process 3x more applications now.", rating: 5 },
];

export const aiAgents = [
  { name: "LeadBot", desc: "AI lead qualification & scoring" },
  { name: "FinanceBot", desc: "Loan eligibility & pipeline" },
  { name: "AuctionBot", desc: "Live bidding & valuation" },
  { name: "DealerBot", desc: "Inventory & operations" },
  { name: "SupportBot", desc: "24/7 customer support" },
  { name: "SocialBot", desc: "Social media automation" },
];

/** Legacy helper — prefer getModelImages from @/lib/media */
export function vehicleImageFor(brand: string, model: string, body = "SUV"): string {
  return getModelImages(brand, model, body, 0)[0]!;
}
