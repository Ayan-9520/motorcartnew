import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, BadgeCheck, CalendarClock, Camera, RefreshCw } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { storeQuoteInput, useInsuranceQuote } from "../hooks/useInsuranceQuote";
import { useInsuranceApplications } from "../hooks/useInsuranceApplications";
import { insuranceQuotePath, parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import { NCB_SLABS, nextNcb, normalizeMotorQuoteInput, type PreviousPolicyStatus } from "../lib/insurance-engine";
import type { InsuranceVehicleType } from "../types";

const DAY = 24 * 60 * 60 * 1000;

function renewalStatus(expiry: string): { status: PreviousPolicyStatus; days: number } | null {
  if (!expiry) return null;
  const d = new Date(`${expiry}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days < 0) return { status: "active", days };
  return { status: days <= 90 ? "expired_under_90" : "expired_over_90", days };
}

export function InsuranceRenewPage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const navigate = useNavigate();
  const { user } = useAuth();
  const { input } = useInsuranceQuote(vehicleType, "renew");
  const { applications } = useInsuranceApplications();
  const [expiry, setExpiry] = useState("");
  const [currentNcb, setCurrentNcb] = useState(input.currentNcb || 20);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: `Renew ${vehicleTypeLabel(vehicleType).toLowerCase()} insurance — keep your NCB | Motorcart`,
      description: "Check NCB, break-in inspection and renewal premium before your motor policy expires.",
    });
  }, [vehicleType]);

  const status = useMemo(() => renewalStatus(expiry), [expiry]);
  const newNcb = !status || claimed || status.status === "expired_over_90" ? 0 : nextNcb(currentNcb);

  const issued = applications.filter((a) => a.status === "issued" && a.metadata.policyEnd && a.metadata.quoteInput?.vehicleType === vehicleType);

  const goQuote = () => {
    storeQuoteInput({
      ...input,
      scenario: "renew",
      previousPolicyStatus: status?.status ?? "active",
      currentNcb,
      claimInLastPolicy: claimed,
    });
    navigate(insuranceQuotePath(vehicleType, "renew"));
  };

  const renewFrom = (raw: unknown, policyEnd: string) => {
    const base = normalizeMotorQuoteInput(raw as never);
    if (!base) return;
    const st = renewalStatus(policyEnd.slice(0, 10));
    storeQuoteInput({
      ...base,
      scenario: "renew",
      previousPolicyStatus: st?.status ?? "active",
      currentNcb: base.planType === "third_party" ? 0 : base.scenario === "renew" ? nextNcb(base.currentNcb) : base.transferredNcb,
      claimInLastPolicy: false,
      idvOverride: undefined,
    });
    navigate(insuranceQuotePath(vehicleType, "renew"));
  };

  return (
    <InsuranceSubpageShell
      title="Renew your policy"
      subtitle="Renew before expiry to keep your No Claim Bonus and skip inspection. You can switch insurer at renewal — NCB moves with you."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle
        value={vehicleType}
        onChange={(t: InsuranceVehicleType) => setParams({ type: t }, { replace: true })}
        className="mb-6"
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section className="ins-panel min-w-0 space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CalendarClock className="h-4 w-4 text-primary" /> Renewal check
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground" htmlFor="rn-exp">Policy expiry date</Label>
              <Input id="rn-exp" type="date" className="mt-1" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground" htmlFor="rn-ncb">NCB on current policy</Label>
              <select id="rn-ncb" className="ins-select mt-1" value={currentNcb} onChange={(e) => setCurrentNcb(Number(e.target.value))}>
                {NCB_SLABS.map((n) => (
                  <option key={n} value={n}>{n}%</option>
                ))}
              </select>
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={claimed} onChange={(e) => setClaimed(e.target.checked)} />
              I made a claim during this policy year
            </label>
          </div>

          {status && (
            <div className="space-y-2 text-sm">
              {status.status === "active" ? (
                <p className="flex gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Policy active — {Math.abs(status.days)} day(s) left. Renew now: no inspection, continuous cover.
                </p>
              ) : (
                <>
                  <p className="flex gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    Expired {status.days} day(s) ago — your vehicle has no third-party cover. Don't drive it until renewed.
                  </p>
                  <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    Break-in inspection required for own-damage cover (self-video or surveyor).
                  </p>
                </>
              )}
              <p className="rounded-xl border px-3 py-2">
                NCB at renewal: <strong>{newNcb}%</strong>
                {claimed
                  ? " — resets after a claim (unless you had NCB protector)."
                  : status.status === "expired_over_90"
                    ? " — lapsed: more than 90 days since expiry."
                    : currentNcb === 50
                      ? " — maximum slab retained."
                      : ` — up from ${currentNcb}% for a claim-free year.`}
              </p>
            </div>
          )}

          <Button className="w-full rounded-xl" onClick={goQuote}>
            <RefreshCw className="mr-2 h-4 w-4" /> Compare renewal quotes
          </Button>
        </section>

        <section className="ins-panel min-w-0 space-y-3">
          <h2 className="text-sm font-bold">Policies bought on MotorCart</h2>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/login?redirect=/insurance/renew" className="font-semibold text-primary">Sign in</Link> to see policies due for renewal.
            </p>
          ) : issued.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issued {vehicleTypeLabel(vehicleType).toLowerCase()} policies yet. Enter your current policy details on the left.</p>
          ) : (
            <ul className="space-y-2">
              {issued.map((a) => {
                const end = a.metadata.policyEnd!;
                const days = Math.ceil((new Date(end).getTime() - Date.now()) / DAY);
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <strong>{a.metadata.vehicle?.registrationNumber ?? `${a.metadata.vehicle?.make ?? ""} ${a.metadata.vehicle?.model ?? ""}`}</strong>
                      <span className="block text-xs text-muted-foreground">
                        {a.provider} · {a.metadata.policyNumber} · {days >= 0 ? `expires in ${days} days` : `expired ${-days} days ago`}
                        {a.premium ? ` · last ${formatCurrency(a.premium)}` : ""}
                      </span>
                    </span>
                    <Button size="sm" variant={days <= 45 ? "default" : "outline"} className="rounded-lg" onClick={() => renewFrom(a.metadata.quoteInput, end)}>
                      Renew
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
            <p>• NCB slabs: 20% → 25% → 35% → 45% → 50% for each claim-free year (own damage only).</p>
            <p>• NCB belongs to you, not the vehicle — sold your vehicle? Ask the insurer for an NCB reserving letter (valid 3 years).</p>
            <p>• Third-party cover has no grace period; NCB stays valid for 90 days after expiry.</p>
          </div>
        </section>
      </div>
    </InsuranceSubpageShell>
  );
}
