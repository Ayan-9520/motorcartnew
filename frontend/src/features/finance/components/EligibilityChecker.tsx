import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { checkEligibility } from "../lib/eligibility";
import { PRODUCT_RULES, toLoanProduct } from "../lib/rate-card";
import type { EligibilityInput } from "../types";
import { cn } from "@/lib/utils";

interface EligibilityCheckerProps {
  onResult?: (input: EligibilityInput) => void;
  product?: string;
}

export function EligibilityChecker({ onResult, product }: EligibilityCheckerProps) {
  const rule = PRODUCT_RULES[toLoanProduct(product)];
  const [income, setIncome] = useState(75000);
  const [existingEmi, setExistingEmi] = useState(0);
  const [vehiclePrice, setVehiclePrice] = useState(1000000);
  const [loanAmount, setLoanAmount] = useState(800000);
  const [tenure, setTenure] = useState(Math.min(60, rule.maxTenureMonths));
  const [cibil, setCibil] = useState(750);
  const [employment, setEmployment] = useState<EligibilityInput["employmentType"]>("salaried");
  const [result, setResult] = useState<ReturnType<typeof checkEligibility> | null>(null);

  const run = () => {
    const input: EligibilityInput = {
      monthlyIncome: income,
      existingEmi,
      loanAmount,
      tenureMonths: tenure,
      cibilScore: cibil,
      employmentType: employment,
      product,
      vehiclePrice: vehiclePrice > 0 ? vehiclePrice : undefined,
    };
    const r = checkEligibility(input);
    setResult(r);
    onResult?.(input);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Eligibility checker
        </CardTitle>
        <p className="text-xs text-muted-foreground">Soft check · no CIBIL enquiry · {rule.label}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Net monthly income (₹)</Label>
            <Input type="number" className="mt-1" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Existing EMIs (₹/month)</Label>
            <Input type="number" className="mt-1" value={existingEmi} onChange={(e) => setExistingEmi(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Vehicle price (₹, on-road)</Label>
            <Input type="number" className="mt-1" value={vehiclePrice} onChange={(e) => setVehiclePrice(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Loan amount (₹)</Label>
            <Input type="number" className="mt-1" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Tenure (months, max {rule.maxTenureMonths})</Label>
            <Input type="number" className="mt-1" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">CIBIL score</Label>
            <Input type="number" className="mt-1" value={cibil} onChange={(e) => setCibil(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Employment</Label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={employment}
            onChange={(e) => setEmployment(e.target.value as EligibilityInput["employmentType"])}
          >
            <option value="salaried">Salaried</option>
            <option value="self_employed">Self employed</option>
            <option value="business">Business</option>
          </select>
        </div>
        <Button variant="default" className="w-full" onClick={run}>
          Check eligibility
        </Button>
        {result && (
          <aside
            className={cn(
              "rounded-xl border p-4 text-sm",
              result.eligible ? "border-primary/40 bg-primary/5" : "border-amber-500/40 bg-amber-500/5"
            )}
          >
            <p className="font-semibold">{result.eligible ? "Likely eligible" : "Needs improvement"}</p>
            <p className="mt-1 text-muted-foreground">{result.message}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">EMI capacity</dt>
                <dd className="font-semibold">{formatCurrency(result.maxEmi)}/mo</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Max loan</dt>
                <dd className="font-semibold">{formatCurrency(result.maxLoan)}</dd>
              </div>
              {result.ltvCap != null && (
                <div>
                  <dt className="text-muted-foreground">LTV cap ({Math.round(rule.maxLtv * 100)}%)</dt>
                  <dd className="font-semibold">{formatCurrency(result.ltvCap)}</dd>
                </div>
              )}
              {result.rateUsed != null && (
                <div>
                  <dt className="text-muted-foreground">Typical rate for you</dt>
                  <dd className="font-semibold">~{result.rateUsed}% p.a.</dd>
                </div>
              )}
            </dl>
          </aside>
        )}
      </CardContent>
    </Card>
  );
}
