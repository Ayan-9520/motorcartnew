/**
 * MotorCart motor-insurance pricing engine (pure, dependency-free).
 * Kept byte-identical in frontend/src/features/insurance/lib and backend/src/lib/insurance
 * so the server re-prices every application with the same rules the customer saw.
 *
 * Sources: IRDAI motor TP premium notification (rates used for FY 2026-27, excl. GST),
 * erstwhile India Motor Tariff (OD rates, IDV depreciation, deductibles, anti-theft),
 * insurer public disclosures (claim settlement ratio FY 2024-25, cashless garages).
 * Insurers file their own OD pricing; the per-insurer factor approximates the market
 * discount on tariff. Final premium is always confirmed by the insurer.
 */

export const INSURANCE_RATES_AS_OF = "FY 2026-27";
export const INSURANCE_GST_RATE = 0.18;

export type MotorVehicleType = "car" | "bike";
export type PolicyScenario = "new" | "renew" | "used";
export type MotorPlanType = "comprehensive" | "third_party" | "own_damage";
export type MotorFuelType = "petrol" | "diesel" | "cng" | "electric";
export type PreviousPolicyStatus = "active" | "expired_under_90" | "expired_over_90" | "none";
export type VoluntaryDeductible = 0 | 2500 | 5000 | 7500 | 15000;

export type MotorAddonKey =
  | "zero_dep"
  | "engine_protect"
  | "consumables"
  | "ncb_protect"
  | "return_to_invoice"
  | "tyre_protect"
  | "rsa"
  | "key_replacement";

/* ------------------------------------------------------------------ */
/* IRDAI third-party premium (₹, excl. GST)                            */
/* ------------------------------------------------------------------ */

interface TpBand {
  max: number;
  label: string;
  annual: number;
  longTerm: number;
}

const CAR_TP: TpBand[] = [
  { max: 1000, label: "Up to 1000cc", annual: 2094, longTerm: 6521 },
  { max: 1500, label: "1000cc – 1500cc", annual: 3416, longTerm: 10640 },
  { max: Infinity, label: "Above 1500cc", annual: 7897, longTerm: 24596 },
];

const BIKE_TP: TpBand[] = [
  { max: 75, label: "Up to 75cc", annual: 538, longTerm: 2901 },
  { max: 150, label: "75cc – 150cc", annual: 714, longTerm: 3851 },
  { max: 350, label: "150cc – 350cc", annual: 1366, longTerm: 7365 },
  { max: Infinity, label: "Above 350cc", annual: 2804, longTerm: 15117 },
];

const EV_CAR_TP: TpBand[] = [
  { max: 30, label: "Up to 30kW", annual: 1780, longTerm: 5543 },
  { max: 65, label: "30kW – 65kW", annual: 2904, longTerm: 9044 },
  { max: Infinity, label: "Above 65kW", annual: 6712, longTerm: 20907 },
];

const EV_BIKE_TP: TpBand[] = [
  { max: 3, label: "Up to 3kW", annual: 457, longTerm: 2466 },
  { max: 7, label: "3kW – 7kW", annual: 607, longTerm: 3273 },
  { max: 16, label: "7kW – 16kW", annual: 1161, longTerm: 6260 },
  { max: Infinity, label: "Above 16kW", annual: 2383, longTerm: 12849 },
];

export const CNG_KIT_TP_LOADING = 60;
export const PA_OWNER_DRIVER_PREMIUM: Record<MotorVehicleType, number> = { car: 375, bike: 330 };
export const PA_OWNER_DRIVER_SUM_INSURED = 1500000;
export const LONG_TERM_TP_YEARS: Record<MotorVehicleType, number> = { car: 3, bike: 5 };

export function tpTable(vehicleType: MotorVehicleType, fuel: MotorFuelType): TpBand[] {
  if (fuel === "electric") return vehicleType === "car" ? EV_CAR_TP : EV_BIKE_TP;
  return vehicleType === "car" ? CAR_TP : BIKE_TP;
}

export function tpBand(vehicleType: MotorVehicleType, fuel: MotorFuelType, capacity: number): TpBand {
  const table = tpTable(vehicleType, fuel);
  return table.find((b) => capacity <= b.max) ?? table[table.length - 1];
}

/** Public IRDAI TP table rows (for display). */
export function irdaiTpRows(vehicleType: MotorVehicleType, fuel: MotorFuelType) {
  return tpTable(vehicleType, fuel).map((b) => ({
    label: b.label,
    annual: b.annual,
    longTerm: b.longTerm,
    longTermYears: LONG_TERM_TP_YEARS[vehicleType],
  }));
}

/* ------------------------------------------------------------------ */
/* Own-damage tariff (% of IDV) — zone × capacity × age                */
/* ------------------------------------------------------------------ */

export const ZONE_A_CITIES = [
  "Mumbai",
  "New Delhi",
  "Delhi",
  "Gurugram",
  "Noida",
  "Ghaziabad",
  "Faridabad",
  "Kolkata",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Pune",
] as const;

export const INSURANCE_CITIES = [
  ...ZONE_A_CITIES,
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Indore",
  "Bhopal",
  "Surat",
  "Nagpur",
  "Kochi",
  "Coimbatore",
  "Patna",
  "Bhubaneswar",
  "Visakhapatnam",
  "Ludhiana",
  "Dehradun",
  "Guwahati",
  "Other city",
] as const;

export function cityZone(city: string): "A" | "B" {
  const c = city.trim().toLowerCase();
  return ZONE_A_CITIES.some((z) => z.toLowerCase() === c) ? "A" : "B";
}

// [age < 5, 5–10, > 10] per capacity band
const CAR_OD: Record<"A" | "B", number[][]> = {
  A: [
    [3.127, 3.283, 3.362],
    [3.283, 3.447, 3.529],
    [3.44, 3.612, 3.698],
  ],
  B: [
    [3.039, 3.191, 3.267],
    [3.191, 3.351, 3.43],
    [3.343, 3.51, 3.594],
  ],
};

const BIKE_OD: Record<"A" | "B", number[][]> = {
  A: [
    [1.708, 1.793, 1.836],
    [1.793, 1.883, 1.928],
    [1.879, 1.973, 2.02],
  ],
  B: [
    [1.676, 1.76, 1.802],
    [1.76, 1.848, 1.892],
    [1.844, 1.936, 1.982],
  ],
};

function odCapacityIndex(vehicleType: MotorVehicleType, fuel: MotorFuelType, capacity: number): number {
  if (vehicleType === "car") {
    if (fuel === "electric") return capacity <= 30 ? 0 : capacity <= 65 ? 1 : 2;
    return capacity <= 1000 ? 0 : capacity <= 1500 ? 1 : 2;
  }
  if (fuel === "electric") return capacity <= 7 ? 0 : capacity <= 16 ? 1 : 2;
  return capacity <= 150 ? 0 : capacity <= 350 ? 1 : 2;
}

export function odTariffRate(
  vehicleType: MotorVehicleType,
  fuel: MotorFuelType,
  capacity: number,
  city: string,
  ageYears: number,
): number {
  const table = vehicleType === "car" ? CAR_OD : BIKE_OD;
  const ageIdx = ageYears < 5 ? 0 : ageYears <= 10 ? 1 : 2;
  return table[cityZone(city)][odCapacityIndex(vehicleType, fuel, capacity)][ageIdx];
}

/* ------------------------------------------------------------------ */
/* IDV                                                                 */
/* ------------------------------------------------------------------ */

export function idvDepreciation(ageMonths: number): number {
  if (ageMonths < 6) return 0.05;
  if (ageMonths < 12) return 0.15;
  if (ageMonths < 24) return 0.2;
  if (ageMonths < 36) return 0.3;
  if (ageMonths < 48) return 0.4;
  if (ageMonths < 60) return 0.5;
  const extraYears = Math.floor((ageMonths - 60) / 12);
  return Math.min(0.85, 0.55 + extraYears * 0.05);
}

export function vehicleAgeMonths(registrationMonth: string | undefined, asOf: Date = new Date()): number {
  if (!registrationMonth) return 0;
  const m = /^(\d{4})-(\d{1,2})/.exec(registrationMonth);
  if (!m) return 0;
  const months = (asOf.getFullYear() - Number(m[1])) * 12 + (asOf.getMonth() + 1 - Number(m[2]));
  return Math.max(0, months);
}

export function computeIdv(exShowroom: number, ageMonths: number) {
  const base = Math.max(0, Math.round(exShowroom * (1 - idvDepreciation(ageMonths))));
  return {
    idv: base,
    min: Math.round(base * 0.9),
    max: Math.round(base * 1.1),
    depreciation: idvDepreciation(ageMonths),
  };
}

/* ------------------------------------------------------------------ */
/* NCB, deductibles, anti-theft                                        */
/* ------------------------------------------------------------------ */

export const NCB_SLABS = [0, 20, 25, 35, 45, 50] as const;

export function ncbForClaimFreeYears(years: number): number {
  const y = Math.max(0, Math.min(5, Math.floor(years)));
  return NCB_SLABS[y];
}

export function nextNcb(current: number): number {
  const idx = NCB_SLABS.findIndex((s) => s === current);
  if (idx < 0) return 20;
  return NCB_SLABS[Math.min(NCB_SLABS.length - 1, idx + 1)];
}

const VOLUNTARY_DEDUCTIBLE: Record<Exclude<VoluntaryDeductible, 0>, { pct: number; cap: number }> = {
  2500: { pct: 0.2, cap: 750 },
  5000: { pct: 0.25, cap: 1500 },
  7500: { pct: 0.3, cap: 2000 },
  15000: { pct: 0.35, cap: 2500 },
};

export const VOLUNTARY_DEDUCTIBLE_OPTIONS: VoluntaryDeductible[] = [0, 2500, 5000, 7500, 15000];

/* ------------------------------------------------------------------ */
/* Add-ons                                                             */
/* ------------------------------------------------------------------ */

export interface MotorAddonDef {
  key: MotorAddonKey;
  label: string;
  description: string;
  vehicleTypes: MotorVehicleType[];
  /** % of IDV per vehicle type (annual). */
  idvRate?: Partial<Record<MotorVehicleType, number>>;
  /** Flat annual premium per vehicle type. */
  flat?: Partial<Record<MotorVehicleType, number>>;
  maxAgeYears?: number;
  requiresNcb?: boolean;
}

export const MOTOR_ADDONS: MotorAddonDef[] = [
  {
    key: "zero_dep",
    label: "Zero depreciation",
    description: "Full cost of replaced plastic, rubber & metal parts — no depreciation cut on claims.",
    vehicleTypes: ["car", "bike"],
    idvRate: { car: 0.4, bike: 0.6 },
    maxAgeYears: 5,
  },
  {
    key: "engine_protect",
    label: "Engine & gearbox protect",
    description: "Covers engine damage from water ingression / oil leakage (not covered in base OD).",
    vehicleTypes: ["car"],
    idvRate: { car: 0.12 },
    maxAgeYears: 7,
  },
  {
    key: "consumables",
    label: "Consumables cover",
    description: "Engine oil, coolant, nuts, bolts, washers used during repair.",
    vehicleTypes: ["car", "bike"],
    idvRate: { car: 0.1, bike: 0.1 },
    maxAgeYears: 7,
  },
  {
    key: "ncb_protect",
    label: "NCB protector",
    description: "Keep your No Claim Bonus even after one claim in the policy year.",
    vehicleTypes: ["car"],
    idvRate: { car: 0.11 },
    requiresNcb: true,
  },
  {
    key: "return_to_invoice",
    label: "Return to invoice",
    description: "On total loss / theft, get invoice value incl. road tax & registration — not just IDV.",
    vehicleTypes: ["car", "bike"],
    idvRate: { car: 0.25, bike: 0.3 },
    maxAgeYears: 3,
  },
  {
    key: "tyre_protect",
    label: "Tyre protect",
    description: "Accidental tyre & tube damage (bulge, cut, burst) — replacement cost.",
    vehicleTypes: ["car"],
    idvRate: { car: 0.1 },
    maxAgeYears: 5,
  },
  {
    key: "rsa",
    label: "24×7 roadside assistance",
    description: "Towing, flat tyre, battery jump-start, fuel delivery, on-spot repair.",
    vehicleTypes: ["car", "bike"],
    flat: { car: 199, bike: 99 },
  },
  {
    key: "key_replacement",
    label: "Key & lock replacement",
    description: "Lost / stolen key and lockset replacement cost.",
    vehicleTypes: ["car"],
    flat: { car: 299 },
  },
];

export function addonEligibility(
  addon: MotorAddonDef,
  vehicleType: MotorVehicleType,
  ageYears: number,
  ncbPercent: number,
): { eligible: boolean; reason?: string } {
  if (!addon.vehicleTypes.includes(vehicleType)) return { eligible: false, reason: `Not offered for ${vehicleType}s` };
  if (addon.maxAgeYears != null && ageYears >= addon.maxAgeYears) {
    return { eligible: false, reason: `Only for vehicles under ${addon.maxAgeYears} years` };
  }
  if (addon.requiresNcb && ncbPercent < 20) return { eligible: false, reason: "Needs at least 20% NCB" };
  return { eligible: true };
}

/* ------------------------------------------------------------------ */
/* Insurer catalogue                                                    */
/* ------------------------------------------------------------------ */

export interface MotorInsurer {
  slug: string;
  name: string;
  shortName: string;
  /** Claim settlement ratio (%) — public disclosure FY 2024-25. */
  claimSettlementRatio: number;
  cashlessGarages: number;
  /** Approximate market discount on tariff OD (filed rates vary by model/city). */
  odFactor: number;
  addonFactor: number;
  highlights: string[];
  website: string;
  claimHelpline: string;
}

export const MOTOR_INSURERS: MotorInsurer[] = [
  {
    slug: "acko",
    name: "ACKO General Insurance",
    shortName: "ACKO",
    claimSettlementRatio: 99.98,
    cashlessGarages: 4000,
    odFactor: 0.32,
    addonFactor: 0.9,
    highlights: ["Digital-first, no agent commission", "Doorstep pickup & drop"],
    website: "https://www.acko.com",
    claimHelpline: "1800 266 2256",
  },
  {
    slug: "hdfc-ergo",
    name: "HDFC ERGO General Insurance",
    shortName: "HDFC ERGO",
    claimSettlementRatio: 98.85,
    cashlessGarages: 13000,
    odFactor: 0.4,
    addonFactor: 1.05,
    highlights: ["Overnight repair service", "Large cashless network"],
    website: "https://www.hdfcergo.com",
    claimHelpline: "022 6234 6234",
  },
  {
    slug: "icici-lombard",
    name: "ICICI Lombard General Insurance",
    shortName: "ICICI Lombard",
    claimSettlementRatio: 98.45,
    cashlessGarages: 7100,
    odFactor: 0.38,
    addonFactor: 1.0,
    highlights: ["InstaSpect video claim survey", "Strong renewal servicing"],
    website: "https://www.icicilombard.com",
    claimHelpline: "1800 2666",
  },
  {
    slug: "bajaj-general",
    name: "Bajaj General Insurance",
    shortName: "Bajaj General",
    claimSettlementRatio: 98.0,
    cashlessGarages: 7200,
    odFactor: 0.37,
    addonFactor: 1.0,
    highlights: ["Motor On-The-Spot claim settlement", "24×7 spot assistance"],
    website: "https://www.bajajgeneral.com",
    claimHelpline: "1800 209 5858",
  },
  {
    slug: "sbi-general",
    name: "SBI General Insurance",
    shortName: "SBI General",
    claimSettlementRatio: 98.0,
    cashlessGarages: 16000,
    odFactor: 0.36,
    addonFactor: 0.95,
    highlights: ["Largest garage network", "Bank-backed servicing"],
    website: "https://www.sbigeneral.in",
    claimHelpline: "1800 22 1111",
  },
  {
    slug: "go-digit",
    name: "Go Digit General Insurance",
    shortName: "Digit",
    claimSettlementRatio: 96.0,
    cashlessGarages: 10000,
    odFactor: 0.34,
    addonFactor: 0.95,
    highlights: ["Smartphone self-inspection", "Quick digital claims"],
    website: "https://www.godigit.com",
    claimHelpline: "1800 258 5956",
  },
  {
    slug: "tata-aig",
    name: "Tata AIG General Insurance",
    shortName: "Tata AIG",
    claimSettlementRatio: 95.0,
    cashlessGarages: 5700,
    odFactor: 0.4,
    addonFactor: 1.05,
    highlights: ["Wide add-on menu", "Emergency transport allowance"],
    website: "https://www.tataaig.com",
    claimHelpline: "1800 266 7780",
  },
  {
    slug: "royal-sundaram",
    name: "Royal Sundaram General Insurance",
    shortName: "Royal Sundaram",
    claimSettlementRatio: 93.0,
    cashlessGarages: 3300,
    odFactor: 0.36,
    addonFactor: 1.0,
    highlights: ["Strong South-India network", "Full invoice cover"],
    website: "https://www.royalsundaram.in",
    claimHelpline: "1860 425 0000",
  },
  {
    slug: "new-india",
    name: "The New India Assurance",
    shortName: "New India",
    claimSettlementRatio: 91.75,
    cashlessGarages: 1100,
    odFactor: 0.45,
    addonFactor: 1.1,
    highlights: ["Public-sector insurer", "Branches in every district"],
    website: "https://www.newindia.co.in",
    claimHelpline: "1800 209 1415",
  },
];

export function findInsurer(slugOrName: string | null | undefined): MotorInsurer | undefined {
  if (!slugOrName) return undefined;
  const q = slugOrName.trim().toLowerCase();
  return MOTOR_INSURERS.find(
    (i) => i.slug === q || i.name.toLowerCase() === q || i.shortName.toLowerCase() === q,
  );
}

/* ------------------------------------------------------------------ */
/* Popular model presets (approx. ex-showroom; user can edit)          */
/* ------------------------------------------------------------------ */

export interface MotorModelPreset {
  make: string;
  model: string;
  fuel: MotorFuelType;
  /** cc for ICE, kW for EV */
  capacity: number;
  exShowroom: number;
}

export const CAR_MODEL_PRESETS: MotorModelPreset[] = [
  { make: "Maruti Suzuki", model: "Swift", fuel: "petrol", capacity: 1197, exShowroom: 650000 },
  { make: "Maruti Suzuki", model: "WagonR CNG", fuel: "cng", capacity: 998, exShowroom: 640000 },
  { make: "Maruti Suzuki", model: "Brezza", fuel: "petrol", capacity: 1462, exShowroom: 850000 },
  { make: "Hyundai", model: "Creta", fuel: "petrol", capacity: 1497, exShowroom: 1100000 },
  { make: "Tata", model: "Nexon", fuel: "petrol", capacity: 1199, exShowroom: 800000 },
  { make: "Tata", model: "Tiago EV", fuel: "electric", capacity: 45, exShowroom: 800000 },
  { make: "Tata", model: "Nexon EV", fuel: "electric", capacity: 95, exShowroom: 1250000 },
  { make: "Honda", model: "City", fuel: "petrol", capacity: 1498, exShowroom: 1200000 },
  { make: "Mahindra", model: "XUV700", fuel: "diesel", capacity: 2198, exShowroom: 1400000 },
  { make: "Mahindra", model: "Scorpio-N", fuel: "diesel", capacity: 2198, exShowroom: 1360000 },
  { make: "Toyota", model: "Innova Hycross", fuel: "petrol", capacity: 1987, exShowroom: 1950000 },
  { make: "Toyota", model: "Fortuner", fuel: "diesel", capacity: 2755, exShowroom: 3400000 },
];

export const BIKE_MODEL_PRESETS: MotorModelPreset[] = [
  { make: "Hero", model: "Splendor Plus", fuel: "petrol", capacity: 97, exShowroom: 78000 },
  { make: "Honda", model: "Activa", fuel: "petrol", capacity: 109, exShowroom: 80000 },
  { make: "TVS", model: "Jupiter", fuel: "petrol", capacity: 113, exShowroom: 78000 },
  { make: "Honda", model: "Shine", fuel: "petrol", capacity: 124, exShowroom: 82000 },
  { make: "Bajaj", model: "Pulsar 150", fuel: "petrol", capacity: 149, exShowroom: 110000 },
  { make: "TVS", model: "Apache RTR 160", fuel: "petrol", capacity: 160, exShowroom: 120000 },
  { make: "Royal Enfield", model: "Classic 350", fuel: "petrol", capacity: 349, exShowroom: 195000 },
  { make: "KTM", model: "Duke 390", fuel: "petrol", capacity: 399, exShowroom: 310000 },
  { make: "TVS", model: "iQube", fuel: "electric", capacity: 3, exShowroom: 110000 },
  { make: "Ather", model: "450X", fuel: "electric", capacity: 5.4, exShowroom: 150000 },
  { make: "Ola", model: "S1 Pro", fuel: "electric", capacity: 5.5, exShowroom: 130000 },
];

export function modelPresets(vehicleType: MotorVehicleType): MotorModelPreset[] {
  return vehicleType === "car" ? CAR_MODEL_PRESETS : BIKE_MODEL_PRESETS;
}

/* ------------------------------------------------------------------ */
/* Quote input + scenario rules                                         */
/* ------------------------------------------------------------------ */

export interface MotorQuoteInput {
  vehicleType: MotorVehicleType;
  scenario: PolicyScenario;
  make: string;
  model: string;
  fuel: MotorFuelType;
  /** cc (petrol/diesel/cng) or kW (electric) */
  capacity: number;
  exShowroom: number;
  /** YYYY-MM of first registration (ignored for new). */
  registrationMonth?: string;
  city: string;
  planType: MotorPlanType;
  addons: MotorAddonKey[];
  /** Renew: NCB % printed on the expiring policy. */
  currentNcb: number;
  /** Renew: a claim was made on the expiring policy. */
  claimInLastPolicy: boolean;
  /** Renew / used: status of the vehicle's existing policy. */
  previousPolicyStatus: PreviousPolicyStatus;
  /** New / used: NCB % from the buyer's own reserving letter / NCB certificate. */
  transferredNcb: number;
  /** Renew / used: active long-term or bundled TP still running (enables standalone OD). */
  hasActiveTp?: boolean;
  voluntaryDeductible: VoluntaryDeductible;
  antiTheftDevice: boolean;
  /** Owner already has ₹15L PA cover elsewhere → PA can be waived. */
  hasOtherPaCover: boolean;
  /** External (aftermarket) CNG/LPG kit value; 0 for factory-fitted. */
  cngKitValue: number;
  /** Customer-chosen IDV (clamped to ±10% of computed IDV). */
  idvOverride?: number;
}

export interface ScenarioAssessment {
  ageMonths: number;
  ageYears: number;
  ncbPercent: number;
  ncbReason: string;
  inspectionRequired: boolean;
  inspectionReason?: string;
  tpTermYears: number;
  odTermYears: number;
  ownDamageAllowed: boolean;
  ownDamageReason?: string;
  documents: string[];
  steps: string[];
  warnings: string[];
}

export function defaultMotorQuoteInput(vehicleType: MotorVehicleType, scenario: PolicyScenario = "renew"): MotorQuoteInput {
  const preset = modelPresets(vehicleType)[0];
  const now = new Date();
  const regYear = scenario === "new" ? now.getFullYear() : now.getFullYear() - 3;
  return {
    vehicleType,
    scenario,
    make: preset.make,
    model: preset.model,
    fuel: preset.fuel,
    capacity: preset.capacity,
    exShowroom: preset.exShowroom,
    registrationMonth: `${regYear}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    city: "New Delhi",
    planType: "comprehensive",
    addons: vehicleType === "car" ? ["zero_dep", "rsa"] : ["zero_dep"],
    currentNcb: scenario === "renew" ? 20 : 0,
    claimInLastPolicy: false,
    previousPolicyStatus: scenario === "new" ? "none" : "active",
    transferredNcb: 0,
    hasActiveTp: false,
    voluntaryDeductible: 0,
    antiTheftDevice: false,
    hasOtherPaCover: false,
    cngKitValue: 0,
  };
}

export function assessScenario(input: MotorQuoteInput, asOf: Date = new Date()): ScenarioAssessment {
  const ageMonths = input.scenario === "new" ? 0 : vehicleAgeMonths(input.registrationMonth, asOf);
  const ageYears = Math.floor(ageMonths / 12);
  const longTerm = LONG_TERM_TP_YEARS[input.vehicleType];
  const warnings: string[] = [];
  let ncbPercent = 0;
  let ncbReason = "";
  let inspectionRequired = false;
  let inspectionReason: string | undefined;
  let tpTermYears = 1;
  let ownDamageAllowed = false;
  let ownDamageReason: string | undefined = "Standalone OD needs an active third-party policy on the vehicle.";
  const documents: string[] = [];
  const steps: string[] = [];

  if (input.scenario === "new") {
    tpTermYears = longTerm;
    ncbPercent = NCB_SLABS.includes(input.transferredNcb as (typeof NCB_SLABS)[number]) ? input.transferredNcb : 0;
    ncbReason = ncbPercent
      ? `${ncbPercent}% NCB transferred from your previous vehicle (NCB reserving letter required).`
      : "No NCB on a brand-new vehicle unless you transfer it from a sold vehicle.";
    ownDamageReason = "New vehicles must be insured with a bundled policy (1-yr OD + long-term TP).";
    documents.push(
      "Dealer invoice / proforma invoice",
      "Form 21 (sale certificate) & Form 22 (roadworthiness)",
      "Owner PAN / Aadhaar & address proof",
      ncbPercent ? "NCB reserving letter from previous insurer" : "",
      "Chassis & engine number (from invoice)",
    );
    steps.push(
      "Policy must be issued before the vehicle leaves the showroom — RTO registration needs it.",
      `Mandatory long-term TP: ${longTerm} years. OD is 1 year and renewed yearly (NCB builds on OD).`,
      "Compare the dealer's insurance quote — you are free to buy from any insurer (IRDAI).",
    );
  } else if (input.scenario === "renew") {
    const status = input.previousPolicyStatus;
    if (input.claimInLastPolicy) {
      ncbPercent = 0;
      ncbReason = "NCB resets to 0% after a claim on the expiring policy (unless NCB protector was opted).";
    } else if (status === "expired_over_90" || status === "none") {
      ncbPercent = 0;
      ncbReason = "NCB lapses when the policy has been expired for more than 90 days.";
    } else {
      ncbPercent = nextNcb(input.currentNcb);
      ncbReason = `Claim-free year on ${input.currentNcb}% NCB → ${ncbPercent}% NCB on own damage at renewal.`;
    }
    if (status !== "active") {
      inspectionRequired = true;
      inspectionReason = "Policy has lapsed — a break-in inspection (self-video or surveyor) is required before own-damage cover starts.";
      warnings.push("Driving without valid third-party insurance is punishable under Sec. 196 MV Act (₹2,000 fine / imprisonment).");
    }
    const withinLongTermTp = ageYears < longTerm;
    ownDamageAllowed = Boolean(input.hasActiveTp) || withinLongTermTp;
    ownDamageReason = ownDamageAllowed
      ? undefined
      : `Standalone OD is available only while the ${longTerm}-year TP (bought with the new vehicle) is active.`;
    documents.push(
      "Previous policy copy",
      "Registration certificate (RC)",
      "Valid PUC certificate",
      inspectionRequired ? "Inspection photos/video of all 4 sides, odometer & chassis" : "",
    );
    steps.push(
      "Renew before expiry to keep NCB and avoid inspection.",
      "Grace for NCB: 90 days after expiry. No grace for third-party cover.",
      "You can switch insurers at renewal — NCB moves with you.",
    );
  } else {
    // Used vehicle purchase
    const status = input.previousPolicyStatus;
    ncbPercent = NCB_SLABS.includes(input.transferredNcb as (typeof NCB_SLABS)[number]) ? input.transferredNcb : 0;
    ncbReason = ncbPercent
      ? `${ncbPercent}% NCB from your own NCB certificate / reserving letter (seller's NCB never transfers to the buyer).`
      : "The seller's NCB does not move with the vehicle — the existing policy's NCB is recovered on transfer.";
    if (status !== "active") {
      inspectionRequired = true;
      inspectionReason = "No active policy on the vehicle — pre-insurance inspection is mandatory for own-damage cover.";
    }
    ownDamageAllowed = Boolean(input.hasActiveTp);
    ownDamageReason = ownDamageAllowed
      ? undefined
      : "Standalone OD is possible only if the vehicle's existing TP is transferred to you and still active.";
    if (status === "active") {
      warnings.push(
        "Existing policy must be transferred into your name within 14 days of purchase (Sec. 157 MV Act), else OD claims can be rejected.",
      );
    }
    documents.push(
      "RC (or RTO receipt of transfer) in buyer's name",
      "Form 29 & Form 30 (ownership transfer)",
      "Sale deed / delivery note",
      "Seller's NOC & existing policy copy",
      "Valid PUC certificate",
      ncbPercent ? "Your NCB certificate / reserving letter" : "",
      inspectionRequired ? "Inspection photos/video of vehicle" : "",
    );
    steps.push(
      "Option A: transfer the existing policy to your name (pay NCB recovery + endorsement fee).",
      "Option B: buy a fresh policy in your name — usually better if you have your own NCB.",
      "Insurer verifies RC transfer; claims are payable only to the registered owner.",
    );
  }

  if (input.planType === "own_damage" && !ownDamageAllowed) {
    warnings.push(ownDamageReason ?? "Standalone OD not allowed for this vehicle.");
  }
  if (input.planType === "third_party") {
    ncbReason = "NCB applies only to own-damage premium — third-party premium is fixed by IRDAI.";
  }

  return {
    ageMonths,
    ageYears,
    ncbPercent: input.planType === "third_party" ? 0 : ncbPercent,
    ncbReason,
    inspectionRequired: input.planType === "third_party" ? false : inspectionRequired,
    inspectionReason: input.planType === "third_party" ? undefined : inspectionReason,
    tpTermYears,
    odTermYears: 1,
    ownDamageAllowed,
    ownDamageReason,
    documents: documents.filter(Boolean),
    steps,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Premium                                                             */
/* ------------------------------------------------------------------ */

export interface MotorAddonLine {
  key: MotorAddonKey;
  label: string;
  premium: number;
}

export interface MotorPremiumQuote {
  id: string;
  insurerSlug: string;
  insurerName: string;
  insurerShortName: string;
  claimSettlementRatio: number;
  cashlessGarages: number;
  highlights: string[];
  planType: MotorPlanType;
  scenario: PolicyScenario;
  idv: number;
  idvMin: number;
  idvMax: number;
  odTariffRate: number;
  odBasic: number;
  cngKitOd: number;
  antiTheftDiscount: number;
  voluntaryDeductibleDiscount: number;
  ncbPercent: number;
  ncbDiscount: number;
  odNet: number;
  tpPremium: number;
  tpTermYears: number;
  tpBandLabel: string;
  cngKitTp: number;
  paCover: number;
  addons: MotorAddonLine[];
  addonTotal: number;
  netPremium: number;
  gst: number;
  totalPremium: number;
  inspectionRequired: boolean;
  available: boolean;
  unavailableReason?: string;
}

const round = (n: number) => Math.round(n);

export function computeInsurerQuote(
  input: MotorQuoteInput,
  insurer: MotorInsurer,
  assessment: ScenarioAssessment = assessScenario(input),
): MotorPremiumQuote {
  const { vehicleType, fuel, capacity, planType } = input;
  const idvCalc = computeIdv(input.exShowroom, assessment.ageMonths);
  const idv =
    input.idvOverride && input.idvOverride > 0
      ? Math.min(idvCalc.max, Math.max(idvCalc.min, round(input.idvOverride)))
      : idvCalc.idv;

  const includesOd = planType !== "third_party";
  const includesTp = planType !== "own_damage";
  const band = tpBand(vehicleType, fuel, capacity);
  const tariff = odTariffRate(vehicleType, fuel, capacity, input.city, assessment.ageYears);

  let odBasic = 0;
  let cngKitOd = 0;
  let antiTheftDiscount = 0;
  let voluntaryDeductibleDiscount = 0;
  let ncbDiscount = 0;
  let odNet = 0;
  const addons: MotorAddonLine[] = [];

  const externalKit = fuel === "cng" && input.cngKitValue > 0 ? input.cngKitValue : 0;

  if (includesOd) {
    odBasic = round(((idv * tariff) / 100) * insurer.odFactor);
    cngKitOd = externalKit ? round(externalKit * 0.04 * insurer.odFactor) : 0;
    let od = odBasic + cngKitOd;
    if (input.antiTheftDevice) {
      antiTheftDiscount = round(Math.min(od * 0.025, 500));
      od -= antiTheftDiscount;
    }
    if (vehicleType === "car" && input.voluntaryDeductible) {
      const rule = VOLUNTARY_DEDUCTIBLE[input.voluntaryDeductible];
      voluntaryDeductibleDiscount = round(Math.min(od * rule.pct, rule.cap));
      od -= voluntaryDeductibleDiscount;
    }
    ncbDiscount = round((od * assessment.ncbPercent) / 100);
    od -= ncbDiscount;
    odNet = Math.max(0, round(od));

    for (const key of input.addons) {
      const def = MOTOR_ADDONS.find((a) => a.key === key);
      if (!def) continue;
      if (!addonEligibility(def, vehicleType, assessment.ageYears, assessment.ncbPercent).eligible) continue;
      const rate = def.idvRate?.[vehicleType];
      const flat = def.flat?.[vehicleType];
      const premium =
        rate != null ? round(((idv * rate) / 100) * insurer.addonFactor) : flat != null ? round(flat * insurer.addonFactor) : 0;
      if (premium > 0) addons.push({ key, label: def.label, premium });
    }
  }

  const tpTermYears = includesTp ? assessment.tpTermYears : 0;
  const tpPremium = includesTp ? (tpTermYears > 1 ? band.longTerm : band.annual) : 0;
  const cngKitTp = includesTp && externalKit ? CNG_KIT_TP_LOADING * Math.max(1, tpTermYears) : 0;
  const paCover = includesTp && !input.hasOtherPaCover ? PA_OWNER_DRIVER_PREMIUM[vehicleType] : 0;

  const addonTotal = addons.reduce((s, a) => s + a.premium, 0);
  const netPremium = odNet + addonTotal + tpPremium + cngKitTp + paCover;
  const gst = round(netPremium * INSURANCE_GST_RATE);

  const available = planType !== "own_damage" || assessment.ownDamageAllowed;

  return {
    id: `${insurer.slug}-${planType}`,
    insurerSlug: insurer.slug,
    insurerName: insurer.name,
    insurerShortName: insurer.shortName,
    claimSettlementRatio: insurer.claimSettlementRatio,
    cashlessGarages: insurer.cashlessGarages,
    highlights: insurer.highlights,
    planType,
    scenario: input.scenario,
    idv: includesOd ? idv : 0,
    idvMin: includesOd ? idvCalc.min : 0,
    idvMax: includesOd ? idvCalc.max : 0,
    odTariffRate: tariff,
    odBasic,
    cngKitOd,
    antiTheftDiscount,
    voluntaryDeductibleDiscount,
    ncbPercent: includesOd ? assessment.ncbPercent : 0,
    ncbDiscount,
    odNet,
    tpPremium,
    tpTermYears,
    tpBandLabel: band.label,
    cngKitTp,
    paCover,
    addons,
    addonTotal,
    netPremium,
    gst,
    totalPremium: netPremium + gst,
    inspectionRequired: assessment.inspectionRequired,
    available,
    unavailableReason: available ? undefined : assessment.ownDamageReason,
  };
}

export function computeMarketQuotes(input: MotorQuoteInput, asOf: Date = new Date()) {
  const assessment = assessScenario(input, asOf);
  const quotes = MOTOR_INSURERS.map((ins) => computeInsurerQuote(input, ins, assessment))
    .filter((q) => q.available)
    .sort((a, b) => a.totalPremium - b.totalPremium);
  return { assessment, quotes };
}

export function motorPlanLabel(plan: MotorPlanType, scenario?: PolicyScenario, vehicleType?: MotorVehicleType): string {
  if (plan === "third_party") {
    return scenario === "new" && vehicleType ? `Third party only (${LONG_TERM_TP_YEARS[vehicleType]} yr)` : "Third party only";
  }
  if (plan === "own_damage") return "Standalone own damage";
  return scenario === "new" && vehicleType
    ? `Bundled (1 yr OD + ${LONG_TERM_TP_YEARS[vehicleType]} yr TP)`
    : "Comprehensive (OD + TP)";
}

export function scenarioLabel(s: PolicyScenario): string {
  if (s === "new") return "Brand-new vehicle";
  if (s === "used") return "Used vehicle bought";
  return "Renew existing policy";
}

export function capacityUnit(fuel: MotorFuelType): "kW" | "cc" {
  return fuel === "electric" ? "kW" : "cc";
}

/** Sanitise untrusted input (server side) into a valid MotorQuoteInput. */
export function normalizeMotorQuoteInput(raw: Partial<MotorQuoteInput> | null | undefined): MotorQuoteInput | null {
  if (!raw || typeof raw !== "object") return null;
  const vehicleType: MotorVehicleType = raw.vehicleType === "bike" ? "bike" : "car";
  const scenario: PolicyScenario = raw.scenario === "new" || raw.scenario === "used" ? raw.scenario : "renew";
  const fuel: MotorFuelType = (["petrol", "diesel", "cng", "electric"] as const).includes(raw.fuel as MotorFuelType)
    ? (raw.fuel as MotorFuelType)
    : "petrol";
  const planType: MotorPlanType = (["comprehensive", "third_party", "own_damage"] as const).includes(
    raw.planType as MotorPlanType,
  )
    ? (raw.planType as MotorPlanType)
    : "comprehensive";
  const capacity = Number(raw.capacity);
  const exShowroom = Number(raw.exShowroom);
  if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 10000) return null;
  if (!Number.isFinite(exShowroom) || exShowroom < 10000 || exShowroom > 50000000) return null;
  const addonKeys = new Set(MOTOR_ADDONS.map((a) => a.key));
  const vd = Number(raw.voluntaryDeductible);
  const status = (["active", "expired_under_90", "expired_over_90", "none"] as const).includes(
    raw.previousPolicyStatus as PreviousPolicyStatus,
  )
    ? (raw.previousPolicyStatus as PreviousPolicyStatus)
    : scenario === "new"
      ? "none"
      : "active";
  const transferred = Number(raw.transferredNcb);
  return {
    vehicleType,
    scenario,
    make: String(raw.make ?? "").slice(0, 60),
    model: String(raw.model ?? "").slice(0, 80),
    fuel,
    capacity,
    exShowroom: Math.round(exShowroom),
    registrationMonth: typeof raw.registrationMonth === "string" ? raw.registrationMonth.slice(0, 7) : undefined,
    city: String(raw.city ?? "Other city").slice(0, 60),
    planType,
    addons: Array.isArray(raw.addons) ? raw.addons.filter((a): a is MotorAddonKey => addonKeys.has(a)) : [],
    currentNcb: NCB_SLABS.includes(Number(raw.currentNcb) as (typeof NCB_SLABS)[number]) ? Number(raw.currentNcb) : 0,
    claimInLastPolicy: Boolean(raw.claimInLastPolicy),
    previousPolicyStatus: status,
    transferredNcb: NCB_SLABS.includes(transferred as (typeof NCB_SLABS)[number]) ? transferred : 0,
    hasActiveTp: Boolean(raw.hasActiveTp),
    voluntaryDeductible: VOLUNTARY_DEDUCTIBLE_OPTIONS.includes(vd as VoluntaryDeductible) ? (vd as VoluntaryDeductible) : 0,
    antiTheftDevice: Boolean(raw.antiTheftDevice),
    hasOtherPaCover: Boolean(raw.hasOtherPaCover),
    cngKitValue: fuel === "cng" ? Math.max(0, Math.min(200000, Math.round(Number(raw.cngKitValue) || 0))) : 0,
    idvOverride: Number(raw.idvOverride) > 0 ? Math.round(Number(raw.idvOverride)) : undefined,
  };
}

export const INSURANCE_APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "inspection_pending",
  "quote_confirmed",
  "payment_pending",
  "issued",
  "rejected",
  "cancelled",
] as const;
export type InsuranceApplicationStatus = (typeof INSURANCE_APPLICATION_STATUSES)[number];

export const INSURANCE_CLAIM_STATUSES = [
  "intimated",
  "registered",
  "survey_scheduled",
  "survey_done",
  "approved",
  "repair_in_progress",
  "settled",
  "rejected",
  "closed",
] as const;
export type InsuranceClaimRequestStatus = (typeof INSURANCE_CLAIM_STATUSES)[number];

export function applicationStatusLabel(s: string): string {
  const map: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under review",
    inspection_pending: "Inspection pending",
    quote_confirmed: "Final quote confirmed",
    payment_pending: "Payment pending",
    issued: "Policy issued",
    rejected: "Rejected",
    cancelled: "Cancelled",
    draft: "Draft",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

export function claimStatusLabel(s: string): string {
  const map: Record<string, string> = {
    intimated: "Intimated",
    registered: "Claim registered",
    survey_scheduled: "Survey scheduled",
    survey_done: "Survey done",
    approved: "Approved",
    repair_in_progress: "Repair in progress",
    settled: "Settled",
    rejected: "Rejected",
    closed: "Closed",
  };
  return map[s] ?? s.replace(/_/g, " ");
}
