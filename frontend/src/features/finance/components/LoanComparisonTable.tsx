import { formatCurrency } from "@/lib/utils";
import type { LoanOffer } from "../types";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface LoanComparisonTableProps {
  offers: LoanOffer[];
  selectedSlugs?: string[];
  onToggle?: (slug: string) => void;
}

export function LoanComparisonTable({ offers, selectedSlugs = [], onToggle }: LoanComparisonTableProps) {
  if (offers.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Adjust loan parameters to see offers.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            {onToggle && <th className="p-3 w-10" />}
            <th className="p-3">Rank</th>
            <th className="p-3">Lender</th>
            <th className="p-3">Rate</th>
            <th className="p-3">EMI</th>
            <th className="p-3">Total interest</th>
            <th className="p-3">Fee + GST</th>
            <th className="p-3">Total cost</th>
            <th className="p-3">Approval chance</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => (
            <tr key={o.slug} className={cn("border-b last:border-0", o.rank === 1 && "bg-primary/5")}>
              {onToggle && (
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedSlugs.includes(o.slug)}
                    onChange={() => onToggle(o.slug)}
                  />
                </td>
              )}
              <td className="p-3 font-medium">#{o.rank}</td>
              <td className="p-3">
                <span className="flex items-center gap-2.5 font-medium">
                  {o.logoUrl ? (
                    <span className="partner-logo-slot shrink-0">
                      <BrandLogo src={o.logoUrl} alt={o.name} size="sm" />
                    </span>
                  ) : null}
                  {o.name}
                </span>
              </td>
              <td className="p-3">
                <span className="font-semibold">{o.effectiveRate.toFixed(2)}%</span>
                {o.productRateMin != null && o.productRateMax != null ? (
                  <span className="block text-[11px] text-muted-foreground">
                    {o.productRateMin}–{o.productRateMax}%{o.rateEstimated ? " est." : ""}
                  </span>
                ) : null}
              </td>
              <td className="p-3">{formatCurrency(o.emi)}</td>
              <td className="p-3">{formatCurrency(o.totalInterest)}</td>
              <td className="p-3">{formatCurrency(o.processingFeeAmount ?? 0)}</td>
              <td className="p-3 font-semibold">{o.totalCost != null ? formatCurrency(o.totalCost) : "—"}</td>
              <td className="p-3 text-primary font-semibold">{o.approvalProbability}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
