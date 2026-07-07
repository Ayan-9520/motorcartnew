import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, CheckCircle2, Percent } from "lucide-react";
import { loanProducts } from "@/data/loans";
import { useHomePage } from "@/features/home/context/HomePageContext";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "./SectionHeader";

function calcEmi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function FinanceSection() {
  const { loanProducts: dynamicLoans } = useHomePage();
  const [amount, setAmount] = useState(1200000);
  const [tenure, setTenure] = useState(60);
  const featured = (dynamicLoans.length ? dynamicLoans : loanProducts.filter((p) => p.is_featured)).slice(0, 3);

  const emi = useMemo(() => calcEmi(amount, 9.5, tenure), [amount, tenure]);

  return (
    <section className="home-section-card">
      <div className="container home-stack">
        <SectionHeader
          eyebrow="Smart finance"
          title="Loans for cars, bikes & commercial"
          description="14+ banks & NBFCs — instant EMI, pre-approval for dealers, repo buyers & fleet owners."
          href="/finance"
          linkLabel="Compare all loans"
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <Card className="border-primary/20 bg-muted/40 dark:bg-card">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-foreground">EMI Preview</h3>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-amount" className="text-xs">
                  Loan amount (₹)
                </Label>
                <Input
                  id="loan-amount"
                  type="number"
                  className="h-9"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  min={100000}
                  step={50000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenure" className="text-xs">
                  Tenure (months)
                </Label>
                <Input
                  id="tenure"
                  type="number"
                  className="h-9"
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value) || 12)}
                  min={12}
                  max={84}
                />
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-[10px] text-muted-foreground">Estimated EMI @ 9.5% p.a.</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(Math.round(emi))}/mo</p>
              </div>
              <Button variant="default" size="sm" className="h-9 w-full text-xs" asChild>
                <Link to="/finance/apply">
                  Check Eligibility
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((loan, index) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="relative h-full hover:shadow-card-hover">
                  {loan.is_featured && (
                    <Badge className="absolute right-2 top-2 border-0 bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  <CardContent className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                        {loan.bank_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{loan.bank_name}</h4>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Percent className="h-3 w-3" />
                          {loan.interest_rate_min}% – {loan.interest_rate_max}% p.a.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="rounded-md bg-muted/60 p-2 dark:bg-muted/40">
                        <p className="text-[10px] text-muted-foreground">Max loan</p>
                        <p className="font-semibold">{formatCurrency(loan.max_loan_amount)}</p>
                      </div>
                      <div className="rounded-md bg-muted/60 p-2 dark:bg-muted/40">
                        <p className="text-[10px] text-muted-foreground">Tenure</p>
                        <p className="font-semibold">Up to {loan.tenure_max_months} mo</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {loan.features.slice(0, 2).map((feature: string) => (
                        <li key={feature} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
