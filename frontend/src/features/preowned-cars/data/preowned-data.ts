import type { CertifiedProgram, PreownedTrustBadge } from "../types";

export const PREOWNED_TAGLINE =
  "Certified pre-owned cars with inspection reports, fair AI pricing & dealer trust.";

export const CERTIFIED_PROGRAMS: CertifiedProgram[] = [
  { id: "true-value", name: "Maruti True Value", brand: "Maruti", description: "OEM inspected pre-owned", inventoryCount: "Certified inventory" },
  { id: "h-promise", name: "Hyundai Promise", brand: "Hyundai", description: "Warranty-backed certified stock", inventoryCount: "Certified inventory" },
  { id: "u-trust", name: "Toyota U Trust", brand: "Toyota", description: "Premium Toyota certified", inventoryCount: "Certified inventory" },
  { id: "first-choice", name: "Mahindra First Choice", brand: "Mahindra", description: "Multi-brand certified hub", inventoryCount: "Certified inventory" },
  { id: "weltauto", name: "Das WeltAuto", brand: "Volkswagen", description: "VW group certified", inventoryCount: "Certified inventory" },
  { id: "tata-assured", name: "Tata Assured", brand: "Tata", description: "Tata certified pre-owned", inventoryCount: "Certified inventory" },
  { id: "auto-terrace", name: "Honda Auto Terrace", brand: "Honda", description: "Honda certified inventory", inventoryCount: "Certified inventory" },
  { id: "fusion", name: "Fusion Cars", brand: "Multi", description: "Luxury certified specialist", inventoryCount: "Certified inventory" },
  { id: "autobest", name: "AutoBest", brand: "Multi", description: "Pan-India certified network", inventoryCount: "Certified inventory" },
  { id: "bbt", name: "Big Boy Toyz", brand: "Luxury", description: "Exotic & luxury pre-owned", inventoryCount: "Certified inventory" },
];

export const TRUST_BADGES: { id: PreownedTrustBadge; label: string }[] = [
  { id: "certified", label: "Certified" },
  { id: "7-day-return", label: "7-day return" },
  { id: "warranty", label: "Warranty included" },
  { id: "inspected", label: "Inspected" },
  { id: "loan-approved", label: "Loan approved" },
  { id: "insurance-active", label: "Insurance active" },
];

export const PREOWNED_STATS = [
  { label: "Certified stock", value: "Certified inventory" },
  { label: "Inspection points", value: "Inspection checklist" },
  { label: "Dealer rating", value: "Verified dealers" },
  { label: "Loan offers", value: "Eligibility check" },
] as const;

export const INSPECTION_SECTIONS = [
  "Exterior",
  "Interior",
  "Engine",
  "Suspension",
  "Tyres",
  "Electricals",
  "Accident check",
  "Odometer check",
] as const;
