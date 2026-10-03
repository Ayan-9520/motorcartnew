import { AlertTriangle, BadgeCheck, Camera, Info } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  scenarioLabel,
  type MotorPremiumQuote,
  type PolicyScenario,
  type ScenarioAssessment,
} from "../lib/insurance-engine";

export function InsurerMonogram({ name, className }: { name: string; className?: string }) {
  const letters = name
    .replace(/^The\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-sm font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300",
        className,
      )}
    >
      {letters}
    </span>
  );
}

const SCENARIOS: { id: PolicyScenario; short: string; hint: string }[] = [
  { id: "new", short: "New vehicle", hint: "From showroom" },
  { id: "renew", short: "Renewal", hint: "Expiring / expired" },
  { id: "used", short: "Used vehicle", hint: "Bought second-hand" },
];

export function InsuranceScenarioTabs({
  value,
  onChange,
  className,
}: {
  value: PolicyScenario;
  onChange: (s: PolicyScenario) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)} role="tablist" aria-label="Policy type">
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          title={scenarioLabel(s.id)}
          onClick={() => onChange(s.id)}
          className={cn("ins-plan-pill min-w-0 px-2 text-left", value === s.id && "ins-plan-pill--active")}
        >
          <span className="block text-sm font-semibold leading-tight">{s.short}</span>
          <span className="block text-[11px] leading-tight text-muted-foreground">{s.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function InsuranceAssessmentNotice({ assessment }: { assessment: ScenarioAssessment }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          <strong>NCB {assessment.ncbPercent}%</strong> — {assessment.ncbReason}
        </span>
      </p>
      {assessment.inspectionRequired && (
        <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{assessment.inspectionReason}</span>
        </p>
      )}
      {assessment.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{w}</span>
        </p>
      ))}
    </div>
  );
}

export function InsurancePremiumBreakdown({ quote, compact }: { quote: MotorPremiumQuote; compact?: boolean }) {
  const rows: { label: string; amount: number; tone?: "minus" | "muted" }[] = [];
  if (quote.odBasic) {
    rows.push({ label: `Own damage (IDV ${formatCurrency(quote.idv)})`, amount: quote.odBasic });
    if (quote.cngKitOd) rows.push({ label: "CNG/LPG kit (OD)", amount: quote.cngKitOd });
    if (quote.antiTheftDiscount) rows.push({ label: "Anti-theft discount", amount: -quote.antiTheftDiscount, tone: "minus" });
    if (quote.voluntaryDeductibleDiscount)
      rows.push({ label: "Voluntary deductible discount", amount: -quote.voluntaryDeductibleDiscount, tone: "minus" });
    if (quote.ncbDiscount) rows.push({ label: `No Claim Bonus (${quote.ncbPercent}%)`, amount: -quote.ncbDiscount, tone: "minus" });
  }
  for (const a of quote.addons) rows.push({ label: a.label, amount: a.premium });
  if (quote.tpPremium) {
    rows.push({
      label: `Third party — IRDAI (${quote.tpBandLabel}${quote.tpTermYears > 1 ? `, ${quote.tpTermYears} yrs` : ""})`,
      amount: quote.tpPremium,
    });
  }
  if (quote.cngKitTp) rows.push({ label: "CNG/LPG kit (TP)", amount: quote.cngKitTp });
  if (quote.paCover) rows.push({ label: "PA owner-driver ₹15 lakh", amount: quote.paCover });

  return (
    <dl className={cn("space-y-1 text-sm", compact && "text-xs")}>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className={cn("tabular-nums", r.tone === "minus" && "text-emerald-600")}>
            {r.amount < 0 ? `− ${formatCurrency(-r.amount)}` : formatCurrency(r.amount)}
          </dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t pt-1">
        <dt className="text-muted-foreground">Net premium</dt>
        <dd className="tabular-nums">{formatCurrency(quote.netPremium)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">GST 18%</dt>
        <dd className="tabular-nums">{formatCurrency(quote.gst)}</dd>
      </div>
      <div className="flex justify-between gap-3 font-semibold">
        <dt>Total payable</dt>
        <dd className="tabular-nums text-primary">{formatCurrency(quote.totalPremium)}</dd>
      </div>
    </dl>
  );
}

export function InsuranceDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 text-[11px] leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Third-party premium is fixed by IRDAI. Own-damage premium is indicative — insurers price by exact model, variant,
        RTO and claim history. The insurer confirms the final premium before you pay; payment is made only on the
        insurer's secure link. Insurance is the subject matter of solicitation.
      </span>
    </p>
  );
}
