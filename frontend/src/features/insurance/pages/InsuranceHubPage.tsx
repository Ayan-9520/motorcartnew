import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Clock, Percent, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { InsurancePartnerStrip } from "../components/InsurancePartnerStrip";
import { parseInsuranceVehicle, insuranceQuotePath, vehicleTypeLabel } from "../lib/insurance-routes";
import type { InsuranceVehicleType } from "../types";

const STATS = [
  { icon: Shield, label: "97%", sub: "Max claim settlement" },
  { icon: Clock, label: "2 min", sub: "Instant quote" },
  { icon: Percent, label: "50%", sub: "NCB discount" },
  { icon: Sparkles, label: "6", sub: "Top insurers" },
];

export function InsuranceHubPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleType = parseInsuranceVehicle(params.get("type"));

  useEffect(() => {
    setPageMeta({
      title: `${vehicleTypeLabel(vehicleType)} — Motorcart Insurance`,
      description: "Compare car & bike insurance from HDFC ERGO, ICICI Lombard, ACKO, Digit & more. Zero dep, comprehensive, instant quotes.",
    });
  }, [vehicleType]);

  const setType = (t: InsuranceVehicleType) => {
    setParams({ type: t }, { replace: true });
  };

  return (
    <InsuranceSubpageShell
      title={`${vehicleTypeLabel(vehicleType)}`}
      subtitle="Compare premiums from India's top insurers · comprehensive, zero dep & third party · instant policy issuance."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle value={vehicleType} onChange={setType} className="mb-8" />

      <ul className="ins-hub-stats mb-8">
        {STATS.map(({ icon: Icon, label, sub }) => (
          <li key={sub} className="ins-hub-stat">
            <Icon className="h-4 w-4 text-primary" />
            <span>
              <strong>{label}</strong>
              <em>{sub}</em>
            </span>
          </li>
        ))}
      </ul>

      <div className="ins-hub-cta mb-10 flex flex-wrap gap-3">
        <Button
          size="lg"
          className="rounded-xl shadow-[var(--shadow-primary)]"
          onClick={() => navigate(insuranceQuotePath(vehicleType))}
        >
          Get instant quote <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" className="rounded-xl" asChild>
          <Link to={`/insurance/compare?type=${vehicleType}`}>Compare all plans</Link>
        </Button>
        <Button size="lg" variant="ghost" className="rounded-xl" asChild>
          <Link to="/dashboard/customer/insurance">My policies</Link>
        </Button>
        <Button size="lg" variant="ghost" className="rounded-xl" asChild>
          <Link to={`/insurance/renew?type=${vehicleType}`}>Renew policy</Link>
        </Button>
        <Button size="lg" variant="ghost" className="rounded-xl" asChild>
          <Link to={`/insurance/claims?type=${vehicleType}`}>File a claim</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { title: "Comprehensive", desc: "TP + OD — recommended for new cars" },
          { title: "Zero Depreciation", desc: "Full parts value on claim" },
          { title: "Third Party", desc: "Mandatory legal cover" },
        ].map((card) => (
          <article key={card.title} className="ins-feature-card">
            <h3 className="font-semibold">{card.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
          </article>
        ))}
      </div>

      <InsurancePartnerStrip />
    </InsuranceSubpageShell>
  );
}
