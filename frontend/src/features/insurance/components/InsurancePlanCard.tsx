import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, ChevronDown, Sparkles, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { insuranceApplyPath } from "../lib/insurance-routes";
import { motorPlanLabel, type MotorPremiumQuote, type MotorQuoteInput } from "../lib/insurance-engine";
import { saveSelectedQuote } from "../hooks/useInsuranceQuote";
import { InsurancePremiumBreakdown, InsurerMonogram } from "./InsuranceBits";

interface InsurancePlanCardProps {
  offer: MotorPremiumQuote;
  input: MotorQuoteInput;
  rank?: number;
  featured?: boolean;
}

export function InsurancePlanCard({ offer, input, rank, featured }: InsurancePlanCardProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const buy = () => {
    saveSelectedQuote({ insurerSlug: offer.insurerSlug, input });
    navigate(insuranceApplyPath(offer.insurerSlug, input.vehicleType));
  };

  return (
    <article className={featured ? "ins-plan-card ins-plan-card--featured" : "ins-plan-card"}>
      {rank === 1 && (
        <Badge className="ins-plan-card__badge">
          <Sparkles className="h-3 w-3 mr-1" /> Lowest premium
        </Badge>
      )}
      <div className="ins-plan-card__head">
        <InsurerMonogram name={offer.insurerShortName} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{offer.insurerShortName}</p>
          <p className="text-xs text-muted-foreground">{motorPlanLabel(offer.planType, offer.scenario, input.vehicleType)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(offer.totalPremium)}</p>
          <p className="text-[10px] text-muted-foreground">incl. 18% GST{offer.tpTermYears > 1 ? ` · TP for ${offer.tpTermYears} yrs` : ""}</p>
        </div>
      </div>
      <ul className="ins-plan-card__meta">
        <li>
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {offer.claimSettlementRatio}% claims settled
        </li>
        <li>
          <Wrench className="h-3.5 w-3.5" />
          {offer.cashlessGarages.toLocaleString("en-IN")}+ cashless garages
        </li>
        {offer.idv > 0 && <li>IDV {formatCurrency(offer.idv)}</li>}
        {offer.ncbPercent > 0 && <li>NCB {offer.ncbPercent}%</li>}
        {offer.inspectionRequired && (
          <li className="text-amber-600">
            <Camera className="h-3.5 w-3.5" /> Inspection needed
          </li>
        )}
      </ul>
      <ul className="flex flex-wrap gap-1">
        {offer.highlights.map((h) => (
          <li key={h}>
            <Badge variant="secondary" className="text-[10px]">{h}</Badge>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold text-primary"
        aria-expanded={open}
      >
        Premium breakdown
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <InsurancePremiumBreakdown quote={offer} compact />}
      <Button className="w-full rounded-xl shadow-[var(--shadow-primary)]" onClick={buy}>
        Proceed with {offer.insurerShortName} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </article>
  );
}
