import { Link } from "react-router-dom";
import { Percent, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { LoanOffer } from "../types";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface BankOfferCardProps {
  offer: LoanOffer;
  tenureMonths?: number;
  onApply?: (offer: LoanOffer) => void;
}

export function BankOfferCard({ offer, tenureMonths, onApply }: BankOfferCardProps) {
  const rangeMin = offer.productRateMin ?? offer.interestRateMin;
  const rangeMax = offer.productRateMax ?? offer.interestRateMax;

  return (
    <Card className={cn("relative h-full hover:shadow-card-hover transition-shadow", offer.rank === 1 && "ring-2 ring-primary/30")}>
      {offer.rank <= 3 && (
        <Badge className="absolute -top-2 left-4 gap-1 border-0 bg-primary text-primary-foreground text-white">
          <Trophy className="h-3 w-3" /> #{offer.rank} {offer.rank === 1 ? "best value" : "ranked"}
        </Badge>
      )}
      <CardContent className="space-y-4 p-5 pt-6">
        <div className="flex items-center gap-3">
          {offer.logoUrl ? (
            <span className="partner-logo-slot partner-logo-slot-lg shrink-0">
              <BrandLogo src={offer.logoUrl} alt={offer.name} size="lg" />
            </span>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 text-sm font-bold text-foreground">
              {offer.shortCode}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="font-semibold truncate">{offer.name}</h4>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Percent className="h-3.5 w-3.5 shrink-0" />
              {rangeMin}% – {rangeMax}%{offer.rateEstimated ? " (est.)" : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-primary/5 p-2">
            <p className="text-xs text-muted-foreground">Your rate</p>
            <p className="font-semibold text-primary">~{offer.effectiveRate}%</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-xs text-muted-foreground">EMI</p>
            <p className="font-semibold">{formatCurrency(offer.emi)}/mo</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-xs text-muted-foreground">Fee + GST</p>
            <p className="font-semibold">{formatCurrency(offer.processingFeeAmount ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-xs text-muted-foreground">Approval chance</p>
            <p className="font-semibold text-primary">{offer.approvalProbability}%</p>
          </div>
        </div>
        {offer.totalCost != null && (
          <p className="text-xs text-muted-foreground">
            Total cost{tenureMonths ? ` over ${tenureMonths} months` : ""}:{" "}
            <strong className="text-foreground">{formatCurrency(offer.totalCost)}</strong> · interest{" "}
            {formatCurrency(offer.totalInterest)}
          </p>
        )}
        <Button variant="default" className="w-full" onClick={() => onApply?.(offer)} asChild={!onApply}>
          {onApply ? (
            <span>Apply now</span>
          ) : (
            <Link to={`/finance/apply?bank=${offer.slug}`}>Apply online</Link>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
