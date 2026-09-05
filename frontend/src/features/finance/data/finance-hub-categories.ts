export type FinanceHubCategoryId =
  | "new-car-loan"
  | "used-car-loan"
  | "bike-loan"
  | "commercial-loan"
  | "ev-loan"
  | "refinance"
  | "insurance"
  | "loan-against-car";

export interface FinanceHubCategoryItem {
  id: FinanceHubCategoryId;
  label: string;
  description: string;
  icon: string;
  stats: { compare: string; apply: string };
}

export const FINANCE_HUB_CATEGORIES: FinanceHubCategoryItem[] = [
  {
    id: "new-car-loan",
    label: "New Car Loan",
    description: "OEM dealers · on-road price · lowest rates",
    icon: "Car",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
  {
    id: "used-car-loan",
    label: "Pre-Owned Car Loan",
    description: "Certified pre-owned · RC verified",
    icon: "CarFront",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
  {
    id: "bike-loan",
    label: "Bike & Scooter",
    description: "Two-wheeler · instant eligibility",
    icon: "Bike",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
  {
    id: "commercial-loan",
    label: "Commercial CV",
    description: "Trucks, buses & fleet finance",
    icon: "Truck",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
  {
    id: "ev-loan",
    label: "EV Green Loan",
    description: "Subsidy-aware · battery warranty",
    icon: "Zap",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
  {
    id: "refinance",
    label: "Refinance",
    description: "Lower EMI on existing loan",
    icon: "RefreshCw",
    stats: { compare: "Compare offers", apply: "Check eligibility" },
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Comprehensive · zero dep · renewals",
    icon: "Shield",
    stats: { compare: "Compare quotes", apply: "Request quote" },
  },
  {
    id: "loan-against-car",
    label: "Loan Against Car",
    description: "Keep your car · unlock equity",
    icon: "Landmark",
    stats: { compare: "Compare lenders", apply: "Check eligibility" },
  },
];
