import { formatCurrency } from "@/lib/utils";
import type { QuotationRecord } from "../types";

const ROWS: { key: keyof QuotationRecord; label: string; note?: string }[] = [
  { key: "ex_showroom_amount", label: "Ex-showroom" },
  { key: "rto_amount", label: "RTO" },
  { key: "insurance_amount", label: "Insurance" },
  { key: "accessories_amount", label: "Accessories" },
  { key: "other_charges", label: "Other charges" },
  { key: "tax_amount", label: "Tax" },
  { key: "discount_amount", label: "Discount" },
  { key: "exchange_amount", label: "Exchange / trade-in" },
];

export function QuotationBreakdown({ quote }: { quote: QuotationRecord }) {
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/60">
              <td className="py-2 text-muted-foreground">{row.label}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(Number(quote[row.key] ?? 0))}</td>
            </tr>
          ))}
          <tr>
            <td className="py-3 font-semibold">Payable total</td>
            <td className="py-3 text-right text-lg font-semibold">{formatCurrency(quote.total_amount)}</td>
          </tr>
        </tbody>
      </table>
      {quote.finance_amount > 0 ? (
        <p className="text-xs text-muted-foreground">
          Indicative finance amount {formatCurrency(quote.finance_amount)} is recorded on this quotation. It is not a
          loan sanction and is not included in the payable total.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">This is a quotation, not a tax invoice or booking confirmation.</p>
    </div>
  );
}
