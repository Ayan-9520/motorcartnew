import { lenderLogoPath } from "@/data/partner-logos";
import { findRateCardEntry } from "../lib/rate-card";

/** Featured partner banks for marketplace & DSA desk */
export const PRIMARY_PARTNER_BANK_IDS = [
  "hdfc",
  "icici",
  "axis",
  "sbi",
  "chola",
  "tata-capital",
] as const;

export type PrimaryPartnerBankId = (typeof PRIMARY_PARTNER_BANK_IDS)[number];

export interface PrimaryPartnerBank {
  id: PrimaryPartnerBankId;
  name: string;
  shortCode: string;
  logoUrl: string;
  rateFrom: string;
}

function rateFrom(slug: string): string {
  const min = findRateCardEntry(slug)?.products.new_car?.min;
  return min != null ? `${min.toFixed(2)}%` : "—";
}

export const PRIMARY_PARTNER_BANKS: PrimaryPartnerBank[] = [
  { id: "hdfc", name: "HDFC Bank", shortCode: "HDFC", logoUrl: lenderLogoPath("hdfc"), rateFrom: rateFrom("hdfc") },
  { id: "icici", name: "ICICI Bank", shortCode: "ICICI", logoUrl: lenderLogoPath("icici"), rateFrom: rateFrom("icici") },
  { id: "axis", name: "Axis Bank", shortCode: "AXIS", logoUrl: lenderLogoPath("axis"), rateFrom: rateFrom("axis") },
  { id: "sbi", name: "State Bank of India", shortCode: "SBI", logoUrl: lenderLogoPath("sbi"), rateFrom: rateFrom("sbi") },
  { id: "chola", name: "Cholamandalam", shortCode: "CHOLA", logoUrl: lenderLogoPath("chola"), rateFrom: rateFrom("chola") },
  {
    id: "tata-capital",
    name: "Tata Capital",
    shortCode: "TATA",
    logoUrl: lenderLogoPath("tata-capital"),
    rateFrom: rateFrom("tata-capital"),
  },
];

export function isPrimaryPartnerBank(bankId: string | null | undefined): boolean {
  if (!bankId) return false;
  const key = bankId.toLowerCase();
  return PRIMARY_PARTNER_BANK_IDS.includes(key as PrimaryPartnerBankId) || key === "vastu";
}

export function resolvePartnerBankName(bankId: string | null, bankName?: string): string {
  if (bankName) return bankName;
  const found = PRIMARY_PARTNER_BANKS.find((b) => b.id === bankId);
  if (found) return found.name;
  if (bankId === "vastu") return "Tata Capital";
  return bankId ?? "Partner bank";
}
