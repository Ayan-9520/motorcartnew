export type DealCandidate = {
  vehicleId: string;
  title: string;
  brand: string;
  model: string;
  price: number | null;
  transmission: string;
  fuelType: string;
  city: string;
  dealerId: string | null;
  dealerName: string | null;
  pincode?: string | null;
  stockStatus: "available" | "none";
  pinMatch: boolean;
};

export function scoreDeal(c: DealCandidate, prefs: { budgetMax?: number; transmission?: string; fuel?: string; categoryHint?: string }) {
  let score = 0;
  const reasons: string[] = [];
  if (c.stockStatus === "available") {
    score += 40;
    reasons.push("in stock");
  }
  if (prefs.budgetMax != null && c.price != null && c.price <= prefs.budgetMax) {
    score += 25;
    reasons.push("within budget");
  } else if (prefs.budgetMax != null && c.price != null) {
    score -= 20;
    reasons.push("over budget");
  }
  if (prefs.transmission && c.transmission.toLowerCase().includes(prefs.transmission.toLowerCase())) {
    score += 15;
    reasons.push("transmission match");
  }
  if (prefs.fuel && c.fuelType.toLowerCase().includes(prefs.fuel.toLowerCase())) {
    score += 10;
    reasons.push("fuel match");
  }
  if (c.pinMatch) {
    score += 20;
    reasons.push("PIN stock match");
  }
  return { score, reasons };
}

export function parseBudgetInr(text: string): number | undefined {
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100_000);
  const num = text.replace(/,/g, "").match(/₹?\s*(\d{5,8})/);
  if (num) return Number(num[1]);
  return undefined;
}
