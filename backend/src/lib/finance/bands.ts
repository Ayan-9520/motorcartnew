export function incomeBand(monthlyIncome: number): string {
  if (monthlyIncome < 25000) return "<25k";
  if (monthlyIncome < 50000) return "25k-50k";
  if (monthlyIncome < 100000) return "50k-100k";
  if (monthlyIncome < 200000) return "100k-200k";
  return "200k+";
}

export function cibilBand(cibilScore: number): string {
  if (cibilScore < 650) return "<650";
  if (cibilScore < 700) return "650-699";
  if (cibilScore < 750) return "700-749";
  if (cibilScore < 800) return "750-799";
  return "800+";
}

const PII_KEYS = new Set([
  "aadhaar",
  "aadhar",
  "pan",
  "passport",
  "ssn",
  "account_number",
  "accountNumber",
  "ifsc",
]);

export function stripRawPii(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (PII_KEYS.has(k.toLowerCase()) || PII_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}
