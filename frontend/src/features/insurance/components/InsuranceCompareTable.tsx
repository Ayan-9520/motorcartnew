import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { insuranceApplyPath } from "../lib/insurance-routes";
import type { MotorPremiumQuote, MotorQuoteInput } from "../lib/insurance-engine";
import { saveSelectedQuote } from "../hooks/useInsuranceQuote";
import { InsurerMonogram } from "./InsuranceBits";

interface InsuranceCompareTableProps {
  offers: MotorPremiumQuote[];
  input: MotorQuoteInput;
}

export function InsuranceCompareTable({ offers, input }: InsuranceCompareTableProps) {
  const navigate = useNavigate();

  if (offers.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center rounded-xl border border-dashed">
        No plans for this combination. Standalone own-damage needs an active third-party policy — try Comprehensive.
      </p>
    );
  }

  const buy = (o: MotorPremiumQuote) => {
    saveSelectedQuote({ insurerSlug: o.insurerSlug, input });
    navigate(insuranceApplyPath(o.insurerSlug, input.vehicleType));
  };

  const showOd = input.planType !== "third_party";
  const showTp = input.planType !== "own_damage";

  return (
    <div className="ins-panel ins-table-card overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Insurer</th>
            {showOd && <th className="px-3 py-3 text-right">IDV</th>}
            {showOd && <th className="px-3 py-3 text-right">OD (after NCB)</th>}
            {showOd && <th className="px-3 py-3 text-right">Add-ons</th>}
            {showTp && <th className="px-3 py-3 text-right">TP + PA</th>}
            <th className="px-3 py-3 text-right">Total (incl. GST)</th>
            <th className="px-3 py-3 text-right">Claims settled</th>
            <th className="px-3 py-3 text-right">Garages</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {offers.map((o, i) => (
            <tr key={o.id} className="border-t">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <InsurerMonogram name={o.insurerShortName} className="h-8 w-8 text-xs" />
                  <span className="font-medium">{o.insurerShortName}</span>
                  {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Lowest</span>}
                </div>
              </td>
              {showOd && <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(o.idv)}</td>}
              {showOd && <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(o.odNet)}</td>}
              {showOd && <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(o.addonTotal)}</td>}
              {showTp && <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(o.tpPremium + o.paCover + o.cngKitTp)}</td>}
              <td className="px-3 py-3 text-right font-bold text-primary tabular-nums">{formatCurrency(o.totalPremium)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{o.claimSettlementRatio}%</td>
              <td className="px-3 py-3 text-right tabular-nums">{o.cashlessGarages.toLocaleString("en-IN")}+</td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" className="rounded-lg" onClick={() => buy(o)}>Select</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
