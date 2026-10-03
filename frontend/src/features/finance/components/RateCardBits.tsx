import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RATE_CARD_AS_OF } from "../lib/rate-card";

export const CIBIL_BANDS = [
  { value: 800, label: "800+ · Excellent" },
  { value: 775, label: "775–799 · Very good" },
  { value: 750, label: "750–774 · Good" },
  { value: 725, label: "725–749 · Fair" },
  { value: 700, label: "700–724 · Average" },
  { value: 675, label: "675–699 · Below average" },
  { value: 650, label: "650–674 · Low" },
  { value: 620, label: "Below 650 · NBFC only" },
] as const;

export function cibilBandValue(score: number): number {
  return CIBIL_BANDS.find((b) => score >= b.value)?.value ?? 620;
}

export function CibilBandSelect({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (score: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CIBIL score</Label>
      <select
        className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
        value={cibilBandValue(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {CIBIL_BANDS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted-foreground">Rate is priced for this band</p>
    </div>
  );
}

export function RateCardNote({ className }: { className?: string }) {
  return (
    <p className={`fin-rate-note ${className ?? ""}`}>
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>
        Indicative rates from lender-published rate cards ({RATE_CARD_AS_OF}). Your final rate, LTV and fees are
        decided by the lender after KYC and bureau check. Processing fee shown incl. 18% GST.
      </span>
    </p>
  );
}
