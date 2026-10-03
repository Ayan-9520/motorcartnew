import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import {
  INSURANCE_CITIES,
  MOTOR_ADDONS,
  NCB_SLABS,
  VOLUNTARY_DEDUCTIBLE_OPTIONS,
  addonEligibility,
  assessScenario,
  capacityUnit,
  cityZone,
  computeIdv,
  modelPresets,
  motorPlanLabel,
  type MotorAddonKey,
  type MotorFuelType,
  type MotorPlanType,
  type MotorQuoteInput,
  type PreviousPolicyStatus,
  type VoluntaryDeductible,
} from "../lib/insurance-engine";
import { InsuranceScenarioTabs } from "./InsuranceBits";

interface InsuranceQuoteFormProps {
  input: MotorQuoteInput;
  onChange: (patch: Partial<MotorQuoteInput>) => void;
  /** Hide advanced sections (hub quick quote). */
  compact?: boolean;
}

const FIELD_LABEL = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

const FUELS: { id: MotorFuelType; label: string }[] = [
  { id: "petrol", label: "Petrol" },
  { id: "diesel", label: "Diesel" },
  { id: "cng", label: "CNG / LPG" },
  { id: "electric", label: "Electric" },
];

const POLICY_STATUS: { id: PreviousPolicyStatus; label: string }[] = [
  { id: "active", label: "Active / not yet expired" },
  { id: "expired_under_90", label: "Expired less than 90 days ago" },
  { id: "expired_over_90", label: "Expired more than 90 days ago" },
  { id: "none", label: "No policy / don't know" },
];

const PLAN_DESC: Record<MotorPlanType, string> = {
  comprehensive: "Own damage + third party + PA — recommended",
  third_party: "Legal minimum — no cover for your own vehicle",
  own_damage: "Only own damage — when long-term TP is already active",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function InsuranceQuoteForm({ input, onChange, compact }: InsuranceQuoteFormProps) {
  const presets = modelPresets(input.vehicleType);
  const assessment = useMemo(() => assessScenario(input), [input]);
  const idv = useMemo(() => computeIdv(input.exShowroom, assessment.ageMonths), [input.exShowroom, assessment.ageMonths]);
  const unit = capacityUnit(input.fuel);
  const presetKey = `${input.make}|${input.model}`;
  const month = new Date().toISOString().slice(0, 7);

  const toggleAddon = (key: MotorAddonKey) => {
    const next = input.addons.includes(key) ? input.addons.filter((a) => a !== key) : [...input.addons, key];
    onChange({ addons: next });
  };

  const applyPreset = (key: string) => {
    const p = presets.find((x) => `${x.make}|${x.model}` === key);
    if (!p) return;
    onChange({ make: p.make, model: p.model, fuel: p.fuel, capacity: p.capacity, exShowroom: p.exShowroom, idvOverride: undefined, cngKitValue: 0 });
  };

  return (
    <div className="ins-quote-form space-y-6">
      <InsuranceScenarioTabs value={input.scenario} onChange={(scenario) => onChange({ scenario })} />

      <Section title="Vehicle">
        <div>
          <Label className={FIELD_LABEL} htmlFor="ins-preset">
            Popular models
          </Label>
          <select id="ins-preset" className="ins-select mt-1.5" value={presets.some((p) => `${p.make}|${p.model}` === presetKey) ? presetKey : ""} onChange={(e) => applyPreset(e.target.value)}>
            <option value="">Other / enter manually</option>
            {presets.map((p) => (
              <option key={`${p.make}|${p.model}`} value={`${p.make}|${p.model}`}>
                {p.make} {p.model} · {p.capacity}
                {capacityUnit(p.fuel)} · {formatCurrency(p.exShowroom)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className={FIELD_LABEL} htmlFor="ins-make">Make</Label>
            <Input id="ins-make" className="mt-1.5" value={input.make} onChange={(e) => onChange({ make: e.target.value })} />
          </div>
          <div>
            <Label className={FIELD_LABEL} htmlFor="ins-model">Model / variant</Label>
            <Input id="ins-model" className="mt-1.5" value={input.model} onChange={(e) => onChange({ model: e.target.value })} />
          </div>
          <div>
            <Label className={FIELD_LABEL} htmlFor="ins-fuel">Fuel</Label>
            <select
              id="ins-fuel"
              className="ins-select mt-1.5"
              value={input.fuel}
              onChange={(e) => {
                const fuel = e.target.value as MotorFuelType;
                const switchingUnit = (fuel === "electric") !== (input.fuel === "electric");
                onChange({
                  fuel,
                  capacity: switchingUnit ? (fuel === "electric" ? (input.vehicleType === "car" ? 45 : 3) : input.vehicleType === "car" ? 1197 : 110) : input.capacity,
                  cngKitValue: fuel === "cng" ? input.cngKitValue : 0,
                });
              }}
            >
              {FUELS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className={FIELD_LABEL} htmlFor="ins-cap">
              {unit === "kW" ? "Motor power (kW)" : "Engine (cc)"}
            </Label>
            <Input
              id="ins-cap"
              type="number"
              inputMode="decimal"
              className="mt-1.5"
              value={input.capacity || ""}
              onChange={(e) => onChange({ capacity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className={FIELD_LABEL} htmlFor="ins-price">Ex-showroom price (₹)</Label>
            <Input
              id="ins-price"
              type="number"
              inputMode="numeric"
              className="mt-1.5"
              value={input.exShowroom || ""}
              onChange={(e) => onChange({ exShowroom: Number(e.target.value), idvOverride: undefined })}
            />
          </div>
          {input.scenario !== "new" && (
            <div>
              <Label className={FIELD_LABEL} htmlFor="ins-reg">First registration</Label>
              <Input
                id="ins-reg"
                type="month"
                max={month}
                className="mt-1.5"
                value={input.registrationMonth ?? ""}
                onChange={(e) => onChange({ registrationMonth: e.target.value, idvOverride: undefined })}
              />
            </div>
          )}
          <div className={cn(input.scenario === "new" && "sm:col-span-2")}>
            <Label className={FIELD_LABEL} htmlFor="ins-city">Registration city (RTO)</Label>
            <select id="ins-city" className="ins-select mt-1.5" value={input.city} onChange={(e) => onChange({ city: e.target.value })}>
              {INSURANCE_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">Zone {cityZone(input.city)} OD tariff</p>
          </div>
          {input.fuel === "cng" && (
            <div className="sm:col-span-2">
              <Label className={FIELD_LABEL} htmlFor="ins-kit">Aftermarket CNG/LPG kit value (₹) — 0 if factory-fitted</Label>
              <Input
                id="ins-kit"
                type="number"
                className="mt-1.5"
                value={input.cngKitValue || ""}
                placeholder="0"
                onChange={(e) => onChange({ cngKitValue: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      </Section>

      <Section title={input.scenario === "new" ? "No Claim Bonus transfer" : input.scenario === "used" ? "Policy on the vehicle" : "Expiring policy"}>
        <div className="grid gap-3 sm:grid-cols-2">
          {input.scenario !== "new" && (
            <div className="sm:col-span-2">
              <Label className={FIELD_LABEL} htmlFor="ins-prev">
                {input.scenario === "used" ? "Existing policy on this vehicle" : "Previous policy status"}
              </Label>
              <select
                id="ins-prev"
                className="ins-select mt-1.5"
                value={input.previousPolicyStatus}
                onChange={(e) => onChange({ previousPolicyStatus: e.target.value as PreviousPolicyStatus })}
              >
                {POLICY_STATUS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
          {input.scenario === "renew" ? (
            <>
              <div>
                <Label className={FIELD_LABEL} htmlFor="ins-ncb">NCB on expiring policy</Label>
                <select id="ins-ncb" className="ins-select mt-1.5" value={input.currentNcb} onChange={(e) => onChange({ currentNcb: Number(e.target.value) })}>
                  {NCB_SLABS.map((n) => (
                    <option key={n} value={n}>{n}%</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 self-end rounded-xl border px-3 py-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={input.claimInLastPolicy} onChange={(e) => onChange({ claimInLastPolicy: e.target.checked })} />
                I made a claim on this policy
              </label>
            </>
          ) : (
            <div className="sm:col-span-2">
              <Label className={FIELD_LABEL} htmlFor="ins-tncb">
                {input.scenario === "new" ? "NCB from your previous (sold) vehicle" : "Your own NCB certificate / reserving letter"}
              </Label>
              <select id="ins-tncb" className="ins-select mt-1.5" value={input.transferredNcb} onChange={(e) => onChange({ transferredNcb: Number(e.target.value) })}>
                {NCB_SLABS.map((n) => (
                  <option key={n} value={n}>{n === 0 ? "None" : `${n}%`}</option>
                ))}
              </select>
            </div>
          )}
          {input.scenario !== "new" && (
            <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={Boolean(input.hasActiveTp)} onChange={(e) => onChange({ hasActiveTp: e.target.checked })} />
              A separate third-party policy is still active on this vehicle
            </label>
          )}
        </div>
      </Section>

      <Section title="Plan">
        <div className="grid gap-2">
          {(["comprehensive", "third_party", "own_damage"] as MotorPlanType[]).map((p) => {
            const disabled = p === "own_damage" && !assessment.ownDamageAllowed;
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                title={disabled ? assessment.ownDamageReason : undefined}
                onClick={() => onChange({ planType: p })}
                className={cn("ins-plan-pill text-left disabled:cursor-not-allowed disabled:opacity-50", input.planType === p && "ins-plan-pill--active")}
              >
                <span className="block text-sm font-semibold">{motorPlanLabel(p, input.scenario, input.vehicleType)}</span>
                <span className="block text-[11px] text-muted-foreground">{disabled ? assessment.ownDamageReason : PLAN_DESC[p]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {input.planType !== "third_party" && (
        <Section title="Insured Declared Value (IDV)">
          <div className="rounded-xl border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold tabular-nums">{formatCurrency(input.idvOverride ?? idv.idv)}</span>
              <span className="text-[11px] text-muted-foreground">
                {Math.round(idv.depreciation * 100)}% depreciation · age {assessment.ageYears} yr
              </span>
            </div>
            <input
              type="range"
              aria-label="IDV"
              min={idv.min}
              max={Math.max(idv.max, idv.min + 1)}
              step={Math.max(500, Math.round((idv.max - idv.min) / 40))}
              className="mt-2 w-full accent-primary"
              value={input.idvOverride ?? idv.idv}
              onChange={(e) => onChange({ idvOverride: Number(e.target.value) })}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatCurrency(idv.min)}</span>
              <span>Higher IDV = higher claim payout & premium</span>
              <span>{formatCurrency(idv.max)}</span>
            </div>
          </div>
        </Section>
      )}

      {input.planType !== "third_party" && !compact && (
        <Section title="Add-ons">
          <ul className="grid gap-2">
            {MOTOR_ADDONS.filter((a) => a.vehicleTypes.includes(input.vehicleType)).map((addon) => {
              const elig = addonEligibility(addon, input.vehicleType, assessment.ageYears, assessment.ncbPercent);
              const baseIdv = input.idvOverride ?? idv.idv;
              const rate = addon.idvRate?.[input.vehicleType];
              const approx = rate != null ? Math.round((baseIdv * rate) / 100) : addon.flat?.[input.vehicleType] ?? 0;
              const on = input.addons.includes(addon.key) && elig.eligible;
              return (
                <li key={addon.key}>
                  <button
                    type="button"
                    disabled={!elig.eligible}
                    onClick={() => toggleAddon(addon.key)}
                    className={cn("ins-addon-pill w-full text-left disabled:cursor-not-allowed disabled:opacity-50", on && "ins-addon-pill--on")}
                    aria-pressed={on}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{addon.label}</span>
                      <span className="text-xs font-semibold text-primary">{elig.eligible ? `~${formatCurrency(approx)}` : "N/A"}</span>
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{elig.eligible ? addon.description : elig.reason}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {!compact && (
        <Section title="Discounts & covers">
          <div className="grid gap-3 sm:grid-cols-2">
            {input.vehicleType === "car" && input.planType !== "third_party" && (
              <div>
                <Label className={FIELD_LABEL} htmlFor="ins-vd">Voluntary deductible</Label>
                <select
                  id="ins-vd"
                  className="ins-select mt-1.5"
                  value={input.voluntaryDeductible}
                  onChange={(e) => onChange({ voluntaryDeductible: Number(e.target.value) as VoluntaryDeductible })}
                >
                  {VOLUNTARY_DEDUCTIBLE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v === 0 ? "None" : `₹${v.toLocaleString("en-IN")} — you pay this much per claim`}</option>
                  ))}
                </select>
              </div>
            )}
            {input.planType !== "third_party" && (
              <label className="flex items-center gap-2 self-end rounded-xl border px-3 py-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={input.antiTheftDevice} onChange={(e) => onChange({ antiTheftDevice: e.target.checked })} />
                ARAI-approved anti-theft device fitted
              </label>
            )}
            {input.planType !== "own_damage" && (
              <label className="sm:col-span-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm">
                <input type="checkbox" className="mt-0.5 accent-primary" checked={input.hasOtherPaCover} onChange={(e) => onChange({ hasOtherPaCover: e.target.checked })} />
                <span>
                  I already have ₹15 lakh personal-accident cover (skip compulsory PA owner-driver)
                  <span className="block text-[11px] text-muted-foreground">PA is mandatory unless you hold another ₹15L PA policy or another vehicle's PA cover.</span>
                </span>
              </label>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
