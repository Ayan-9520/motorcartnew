import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Camera, FileCheck2, Percent, RefreshCw, Shield, ShoppingBag, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { InsurancePartnerStrip } from "../components/InsurancePartnerStrip";
import { InsuranceDisclaimer, InsuranceScenarioTabs, InsurerMonogram } from "../components/InsuranceBits";
import { storeQuoteInput, useInsuranceQuote } from "../hooks/useInsuranceQuote";
import { parseInsuranceVehicle, insuranceQuotePath, vehicleTypeLabel } from "../lib/insurance-routes";
import {
  INSURANCE_CITIES,
  INSURANCE_RATES_AS_OF,
  LONG_TERM_TP_YEARS,
  MOTOR_ADDONS,
  MOTOR_INSURERS,
  irdaiTpRows,
  modelPresets,
  type PolicyScenario,
} from "../lib/insurance-engine";
import type { InsuranceVehicleType } from "../types";

const SCENARIO_CARDS: {
  id: PolicyScenario;
  icon: typeof Sparkles;
  title: string;
  points: (v: InsuranceVehicleType) => string[];
}[] = [
  {
    id: "new",
    icon: ShoppingBag,
    title: "Brand-new vehicle",
    points: (v) => [
      `Bundled policy: 1-yr own damage + ${LONG_TERM_TP_YEARS[v]}-yr third party (mandatory)`,
      "IDV = ex-showroom − 5% · return-to-invoice available",
      "Transfer NCB from your old vehicle via reserving letter",
      "You don't have to buy the dealer's insurance",
    ],
  },
  {
    id: "renew",
    icon: RefreshCw,
    title: "Renew existing policy",
    points: () => [
      "NCB steps up 20 → 25 → 35 → 45 → 50% each claim-free year",
      "Renew before expiry: no inspection, NCB intact",
      "Expired > 90 days: NCB lapses + break-in inspection",
      "Switch insurer freely — NCB moves with you",
    ],
  },
  {
    id: "used",
    icon: FileCheck2,
    title: "Bought a used vehicle",
    points: () => [
      "Transfer the seller's policy within 14 days, or buy fresh",
      "Seller's NCB never transfers — use your own NCB certificate",
      "No active policy → pre-insurance inspection",
      "Needs RC transfer (Form 29/30) & valid PUC",
    ],
  },
];

const HOW = [
  { title: "Compare", body: "Live premiums from 9 insurers with IRDAI TP rates, your IDV, NCB, add-ons and GST." },
  { title: "Apply", body: "Owner, vehicle & nominee details with documents. No payment taken yet." },
  { title: "Confirm & inspect", body: "Insurance desk confirms the final premium with the insurer; inspection if the policy lapsed." },
  { title: "Pay & get policy", body: "Pay on the insurer's secure link. Policy PDF lands in My insurance with renewal reminders." },
];

export function InsuranceHubPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const { input, patchInput, offers } = useInsuranceQuote(vehicleType);
  const [tpFuel, setTpFuel] = useState<"petrol" | "electric">("petrol");
  const presets = modelPresets(vehicleType);
  const best = offers[0] ?? null;
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    setPageMeta({
      title: `${vehicleTypeLabel(vehicleType)} insurance — new, renewal & used | Motorcart`,
      description:
        "Compare car & bike insurance from ACKO, HDFC ERGO, ICICI Lombard, Bajaj, SBI General, Digit & more. IRDAI third-party rates, IDV, NCB, zero dep, claims support.",
    });
  }, [vehicleType]);

  const setType = (t: InsuranceVehicleType) => setParams({ type: t }, { replace: true });

  const minTp = useMemo(() => Math.min(...irdaiTpRows(vehicleType, "petrol").map((r) => r.annual)), [vehicleType]);
  const maxGarages = Math.max(...MOTOR_INSURERS.map((i) => i.cashlessGarages));

  const goScenario = (s: PolicyScenario) => {
    patchInput({ scenario: s });
    navigate(insuranceQuotePath(vehicleType, s));
  };

  const seeQuotes = () => {
    storeQuoteInput(input);
    navigate(insuranceQuotePath(vehicleType, input.scenario));
  };

  const presetKey = `${input.make}|${input.model}`;

  return (
    <InsuranceSubpageShell
      title={`${vehicleTypeLabel(vehicleType)} insurance`}
      subtitle="New vehicle, renewal or second-hand purchase — compare real premiums, understand NCB & inspection rules, buy and claim in one place."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle value={vehicleType} onChange={setType} className="mb-6" />

      <div className="mb-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <ul className="ins-hub-stats">
            <li className="ins-hub-stat"><Shield className="h-4 w-4 text-primary" /><span><strong>{MOTOR_INSURERS.length} insurers</strong><em>compared side by side</em></span></li>
            <li className="ins-hub-stat"><BadgeCheck className="h-4 w-4 text-primary" /><span><strong>TP from {formatCurrency(minTp)}</strong><em>IRDAI {INSURANCE_RATES_AS_OF}</em></span></li>
            <li className="ins-hub-stat"><Percent className="h-4 w-4 text-primary" /><span><strong>Up to 50% NCB</strong><em>on own damage</em></span></li>
            <li className="ins-hub-stat"><Wrench className="h-4 w-4 text-primary" /><span><strong>{maxGarages.toLocaleString("en-IN")}+</strong><em>cashless garages</em></span></li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={`/insurance/renew?type=${vehicleType}`}>Renew policy</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={`/insurance/claims?type=${vehicleType}`}>File a claim</Link>
            </Button>
            <Button variant="ghost" className="rounded-xl" asChild>
              <Link to="/dashboard/customer/insurance">My policies</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Third-party insurance is compulsory by law (Motor Vehicles Act Sec. 146). Comprehensive cover adds protection for your own {vehicleType === "bike" ? "bike" : "car"} against accident, theft, fire and floods.
          </p>
        </div>

        <section className="ins-panel ins-panel--glow min-w-0 space-y-4 lg:col-span-3" aria-label="Quick quote">
          <h2 className="text-sm font-bold">Quick quote</h2>
          <InsuranceScenarioTabs value={input.scenario} onChange={(s) => patchInput({ scenario: s })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label className="text-xs font-semibold text-muted-foreground" htmlFor="hq-model">Vehicle</Label>
              <select
                id="hq-model"
                className="ins-select mt-1"
                value={presets.some((p) => `${p.make}|${p.model}` === presetKey) ? presetKey : ""}
                onChange={(e) => {
                  const p = presets.find((x) => `${x.make}|${x.model}` === e.target.value);
                  if (p) patchInput({ make: p.make, model: p.model, fuel: p.fuel, capacity: p.capacity, exShowroom: p.exShowroom, idvOverride: undefined, cngKitValue: 0 });
                }}
              >
                {!presets.some((p) => `${p.make}|${p.model}` === presetKey) && <option value="">{input.make} {input.model}</option>}
                {presets.map((p) => (
                  <option key={`${p.make}|${p.model}`} value={`${p.make}|${p.model}`}>{p.make} {p.model}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground" htmlFor="hq-city">City</Label>
              <select id="hq-city" className="ins-select mt-1" value={input.city} onChange={(e) => patchInput({ city: e.target.value })}>
                {INSURANCE_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {input.scenario !== "new" ? (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground" htmlFor="hq-reg">Registered</Label>
                <Input id="hq-reg" type="month" max={month} className="mt-1" value={input.registrationMonth ?? ""} onChange={(e) => patchInput({ registrationMonth: e.target.value, idvOverride: undefined })} />
              </div>
            ) : (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground" htmlFor="hq-price">Ex-showroom ₹</Label>
                <Input id="hq-price" type="number" className="mt-1" value={input.exShowroom || ""} onChange={(e) => patchInput({ exShowroom: Number(e.target.value), idvOverride: undefined })} />
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground" htmlFor="hq-plan">Plan</Label>
              <select id="hq-plan" className="ins-select mt-1" value={input.planType === "own_damage" ? "comprehensive" : input.planType} onChange={(e) => patchInput({ planType: e.target.value as "comprehensive" | "third_party" })}>
                <option value="comprehensive">Comprehensive</option>
                <option value="third_party">Third party only</option>
              </select>
            </div>
          </div>
          {best ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-3">
                <InsurerMonogram name={best.insurerShortName} />
                <div>
                  <p className="text-xs text-muted-foreground">Lowest · {best.insurerShortName}</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(best.totalPremium)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    incl. GST{best.idv ? ` · IDV ${formatCurrency(best.idv)}` : ""}{best.tpTermYears > 1 ? ` · TP ${best.tpTermYears} yrs` : ""}
                  </p>
                </div>
              </div>
              <Button size="lg" className="rounded-xl shadow-[var(--shadow-primary)]" onClick={seeQuotes}>
                See all {offers.length} quotes <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="lg" className="w-full rounded-xl" onClick={seeQuotes}>
              Get quotes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {best?.inspectionRequired && (
            <p className="flex items-center gap-2 text-xs text-amber-700"><Camera className="h-3.5 w-3.5" /> Inspection will be required for own-damage cover.</p>
          )}
        </section>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">What's your situation?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SCENARIO_CARDS.map(({ id, icon: Icon, title, points }) => (
            <article key={id} className="ins-feature-card flex flex-col">
              <Icon className="mb-2 h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">{title}</h3>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-muted-foreground">
                {points(vehicleType).map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => goScenario(id)}>
                Get {title.toLowerCase()} quotes
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <div className="ins-panel min-w-0">
          <h2 className="mb-3 text-sm font-bold">Plans explained</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Comprehensive (OD + TP)</dt>
              <dd className="text-muted-foreground">Your vehicle (accident, theft, fire, flood, riots) + third-party liability + ₹15L PA cover. Recommended.</dd>
            </div>
            <div>
              <dt className="font-semibold">Third party only</dt>
              <dd className="text-muted-foreground">Legal minimum. Pays for injury/death/property damage to others. Price fixed by IRDAI; nothing for your own vehicle.</dd>
            </div>
            <div>
              <dt className="font-semibold">Standalone own damage</dt>
              <dd className="text-muted-foreground">Only OD — for vehicles whose long-term TP ({LONG_TERM_TP_YEARS.car} yr car / {LONG_TERM_TP_YEARS.bike} yr bike) is still running.</dd>
            </div>
          </dl>
          <h3 className="mb-2 mt-4 text-sm font-bold">Popular add-ons</h3>
          <ul className="flex flex-wrap gap-1.5">
            {MOTOR_ADDONS.filter((a) => a.vehicleTypes.includes(vehicleType)).map((a) => (
              <li key={a.key} className="rounded-full border px-2.5 py-1 text-xs" title={a.description}>{a.label}</li>
            ))}
          </ul>
        </div>
        <div className="ins-panel min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">IRDAI third-party premium ({INSURANCE_RATES_AS_OF})</h2>
            <select className="ins-select w-auto" value={tpFuel} onChange={(e) => setTpFuel(e.target.value as "petrol" | "electric")} aria-label="Fuel">
              <option value="petrol">Petrol / diesel / CNG</option>
              <option value="electric">Electric</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">{tpFuel === "electric" ? "Motor power" : "Engine"}</th>
                <th className="py-1 text-right">1 year</th>
                <th className="py-1 text-right">New ({LONG_TERM_TP_YEARS[vehicleType]} yrs)</th>
              </tr>
            </thead>
            <tbody>
              {irdaiTpRows(vehicleType, tpFuel).map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.annual)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.longTerm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">Excl. 18% GST. Same price at every insurer. CNG/LPG aftermarket kit adds ₹60.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">Insurers compared</h2>
        <div className="ins-panel overflow-x-auto p-0">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Insurer</th>
                <th className="px-3 py-3 text-right">Claims settled (FY25)</th>
                <th className="px-3 py-3 text-right">Cashless garages</th>
                <th className="px-3 py-3">Known for</th>
                <th className="px-4 py-3 text-right">Claim helpline</th>
              </tr>
            </thead>
            <tbody>
              {[...MOTOR_INSURERS].sort((a, b) => b.claimSettlementRatio - a.claimSettlementRatio).map((i) => (
                <tr key={i.slug} className="border-t">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <InsurerMonogram name={i.shortName} className="h-8 w-8 text-xs" />
                      <span className="font-medium">{i.shortName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{i.claimSettlementRatio}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{i.cashlessGarages.toLocaleString("en-IN")}+</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{i.highlights[0]}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{i.claimHelpline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">How buying works on MotorCart</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((s, i) => (
            <li key={s.title} className="ins-panel">
              <p className="text-xs font-bold text-emerald-600">Step {i + 1}</p>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <InsurancePartnerStrip />
      <InsuranceDisclaimer className="mt-6" />
    </InsuranceSubpageShell>
  );
}
