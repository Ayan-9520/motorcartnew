/** Indian market brands & models for dealer inventory forms */
export const INDIAN_AUTO_BRANDS = [
  "Hyundai",
  "Tata",
  "Mahindra",
  "Maruti",
  "Kia",
  "Honda",
  "Toyota",
] as const;

export type IndianAutoBrand = (typeof INDIAN_AUTO_BRANDS)[number];

export const BRAND_MODELS: Record<IndianAutoBrand, string[]> = {
  Hyundai: ["Creta", "Venue", "i20", "Verna", "Alcazar", "Exter"],
  Tata: [
    "Nexon",
    "Nexon EV",
    "Punch",
    "Punch EV",
    "Harrier",
    "Harrier EV",
    "Safari",
    "Altroz",
    "Tiago",
    "Tiago EV",
    "Tigor",
    "Tigor EV",
    "Curvv",
    "Curvv EV",
    "Sierra",
    "Sierra EV",
  ],
  Mahindra: ["XUV700", "Scorpio-N", "Thar", "Bolero", "XUV300", "XUV400 EV"],
  Maruti: ["Swift", "Baleno", "Brezza", "Ertiga", "Grand Vitara", "Fronx"],
  Kia: ["Seltos", "Sonet", "Carens", "EV6"],
  Honda: ["City", "Amaze", "Elevate", "WR-V"],
  Toyota: ["Innova Hycross", "Fortuner", "Urban Cruiser Hyryder", "Glanza", "Camry"],
};

export const INDIAN_STATES = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Gujarat",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Rajasthan",
  "West Bengal",
  "Punjab",
] as const;

/** EMI = P * r * (1+r)^n / ((1+r)^n - 1) */
export function calculateEmiMonthly(
  principal: number,
  annualRatePercent = 9.5,
  tenureMonths = 60
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return Math.round(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return Math.round((principal * r * factor) / (factor - 1));
}

export function formatEmiLabel(emi: number): string {
  if (emi <= 0) return "—";
  return `₹${emi.toLocaleString("en-IN")}/mo`;
}

/** Deterministic metrics from listing id (stable, no Math.random) */
export function deriveListingMetrics(
  vehicleId: string,
  title: string,
  price: number,
  status: string
): { views: number; enquiries: number; whatsappClicks: number } {
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = (hash << 5) - hash + vehicleId.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  const brandBoost = INDIAN_AUTO_BRANDS.some((b) => title.includes(b)) ? 1.25 : 1;
  const priceFactor = price > 15_00_000 ? 0.85 : price < 8_00_000 ? 1.15 : 1;
  const statusFactor = status === "sold" ? 0.4 : status === "available" ? 1 : 0.7;

  const views = Math.round((900 + (seed % 2400)) * brandBoost * priceFactor * statusFactor);
  const enquiries = Math.max(2, Math.round(views * 0.028 + (seed % 12)));
  const whatsappClicks = Math.max(1, Math.round(enquiries * 0.72));

  return { views, enquiries, whatsappClicks };
}

export type SampleInventoryRow = {
  brand: IndianAutoBrand;
  model: string;
  variant: string;
  year: number;
  price: number;
  kmsDriven: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  city: string;
  state: string;
};

export const SAMPLE_INVENTORY_ROWS: SampleInventoryRow[] = [
  { brand: "Hyundai", model: "Creta", variant: "SX(O) Diesel AT", year: 2023, price: 14_85_000, kmsDriven: 22000, fuelType: "Diesel", transmission: "Automatic", bodyType: "SUV", city: "Mumbai", state: "Maharashtra" },
  { brand: "Tata", model: "Nexon", variant: "XZ+ Lux", year: 2024, price: 12_40_000, kmsDriven: 8500, fuelType: "Petrol", transmission: "Manual", bodyType: "SUV", city: "Pune", state: "Maharashtra" },
  { brand: "Mahindra", model: "XUV700", variant: "AX7 Luxury Pack", year: 2022, price: 18_90_000, kmsDriven: 35000, fuelType: "Diesel", transmission: "Automatic", bodyType: "SUV", city: "Bengaluru", state: "Karnataka" },
  { brand: "Maruti", model: "Brezza", variant: "ZXI+", year: 2023, price: 10_75_000, kmsDriven: 18000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", city: "Ahmedabad", state: "Gujarat" },
  { brand: "Kia", model: "Seltos", variant: "GTX+ AT", year: 2023, price: 16_20_000, kmsDriven: 15000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", city: "Hyderabad", state: "Telangana" },
  { brand: "Honda", model: "City", variant: "ZX CVT", year: 2022, price: 11_50_000, kmsDriven: 28000, fuelType: "Petrol", transmission: "Automatic", bodyType: "Sedan", city: "Delhi", state: "Delhi" },
  { brand: "Toyota", model: "Innova Hycross", variant: "ZX(O) Hybrid", year: 2024, price: 28_50_000, kmsDriven: 6000, fuelType: "Hybrid", transmission: "Automatic", bodyType: "MUV", city: "Chennai", state: "Tamil Nadu" },
];
