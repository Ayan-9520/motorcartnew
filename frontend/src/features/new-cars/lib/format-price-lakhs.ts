/** CarLelo-style compact INR (e.g. ₹18.00 Lakhs). */
export function formatPriceLakhs(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  if (amount >= 1_00_00_000) {
    const cr = amount / 1_00_00_000;
    return `₹${cr.toFixed(cr >= 10 ? 2 : 2)} Cr`;
  }
  const lakhs = amount / 1_00_000;
  return `₹${lakhs.toFixed(2)} Lakhs`;
}
