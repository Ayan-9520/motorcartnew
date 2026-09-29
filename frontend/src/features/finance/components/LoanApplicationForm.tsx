import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { submitLoanApplication } from "../services/finance.service";
import type { Lender } from "../types";
import { calculateEmi } from "../lib/emi-utils";
import {
  financeCategoryLabel,
  parseFinanceType,
} from "../lib/finance-hub-routes";
import toast from "react-hot-toast";

interface LoanApplicationFormProps {
  lenders: Lender[];
  defaultBankSlug?: string;
}

export function LoanApplicationForm({ lenders, defaultBankSlug }: LoanApplicationFormProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const loanType = parseFinanceType(params.get("type"));
  const bankSlug = params.get("bank") ?? defaultBankSlug ?? lenders[0]?.slug;

  const lender = lenders.find((l) => l.slug === bankSlug) ?? lenders[0];
  const vehicleId = params.get("vehicle");
  const vehiclePrice = Number(params.get("price")) || 0;
  const [loanAmount, setLoanAmount] = useState(() =>
    vehiclePrice > 0
      ? Math.round((vehiclePrice * 0.85) / 1000) * 1000
      : loanType === "bike-loan"
        ? 150000
        : 1200000
  );
  const [tenure, setTenure] = useState(loanType === "commercial-loan" ? 72 : 60);
  const [income, setIncome] = useState(75000);
  const [cibil, setCibil] = useState(720);
  const [employment, setEmployment] = useState("salaried");
  const [submitting, setSubmitting] = useState(false);

  const rate = lender ? (lender.interestRateMin + lender.interestRateMax) / 2 : 9.5;
  const emi = calculateEmi(loanAmount, rate, tenure);

  const submit = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to apply");
      navigate("/login", { state: { from: `/finance/apply${params.toString() ? `?${params}` : ""}` } });
      return;
    }
    if (!lender) return;

    setSubmitting(true);
    const result = await submitLoanApplication({
      bankId: lender.id,
      loanAmount,
      tenureMonths: tenure,
      interestRate: rate,
      monthlyIncome: income,
      cibilScore: cibil,
      employmentType: employment,
      applicantMetadata: {
        fullName: user.fullName,
        phone: user.phone,
        loanType: loanType ?? "used-car-loan",
        ...(vehicleId ? { vehicleId } : {}),
        ...(vehiclePrice > 0 ? { vehiclePrice } : {}),
      },
    });

    setSubmitting(false);
    if (result.ok) {
      const id = (result.data as { application_id: string }).application_id;
      toast.success("Application submitted! A DSA has been assigned.");
      navigate(`/dashboard/customer/loans/${id}`);
    } else {
      toast.error("Submission failed — try again");
    }
  };

  return (
    <Card className="finance-apply-card premium-vehicle-card overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-primary/5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Apply for loan
          </CardTitle>
          {loanType ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {financeCategoryLabel(loanType)}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          DSA auto-assigned · documents upload after submit
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select lender
          </Label>
          <select
            className="mc-input mt-1.5 w-full"
            value={lender?.slug ?? ""}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("bank", e.target.value);
              navigate(`/finance/apply?${next.toString()}`, { replace: true });
            }}
          >
            {lenders.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name} — {l.interestRateMin}% onwards
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Loan amount (₹)</Label>
            <Input
              type="number"
              className="mt-1"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Tenure (months)</Label>
            <Input
              type="number"
              className="mt-1"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Monthly income (₹)</Label>
            <Input
              type="number"
              className="mt-1"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">CIBIL score</Label>
            <Input
              type="number"
              className="mt-1"
              value={cibil}
              onChange={(e) => setCibil(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Employment type</Label>
          <select
            className="mc-input mt-1.5 w-full"
            value={employment}
            onChange={(e) => setEmployment(e.target.value)}
          >
            <option value="salaried">Salaried</option>
            <option value="self-employed">Self employed</option>
            <option value="business">Business owner</option>
          </select>
        </div>

        <div className="finance-emi-box rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground">Estimated EMI</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(emi)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            @ {rate.toFixed(2)}% · {lender?.name} · indicative only
          </p>
        </div>

        <ul className="space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Soft eligibility check — no CIBIL impact
          </li>
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Compare all offers on{" "}
            <Link to="/finance/compare" className="font-medium text-primary hover:underline">
              compare page
            </Link>
          </li>
        </ul>

        <Button
          variant="default"
          className="h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-primary)]"
          disabled={submitting}
          onClick={submit}
        >
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </CardContent>
    </Card>
  );
}
