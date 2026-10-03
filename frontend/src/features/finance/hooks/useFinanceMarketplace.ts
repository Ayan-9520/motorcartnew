import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLenders } from "../services/finance.service";
import { LENDER_CATALOG } from "../data/lenders";
import { buildLoanOffers, getAiRecommendations } from "../lib/ai-engine";
import { PRODUCT_RULES, toLoanProduct } from "../lib/rate-card";
import type { EligibilityInput, Lender, LoanOffer, AiRecommendation } from "../types";

const DEFAULT_AMOUNT: Record<string, number> = {
  two_wheeler: 120000,
  commercial: 2500000,
  used_car: 500000,
  loan_against_car: 300000,
  refinance: 600000,
};

export function useFinanceMarketplace(productParam?: string) {
  const product = toLoanProduct(productParam);
  const [lenders, setLenders] = useState<Lender[]>(LENDER_CATALOG);
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState(DEFAULT_AMOUNT[product] ?? 800000);
  const [tenureMonths, setTenureMonths] = useState(Math.min(60, PRODUCT_RULES[product].maxTenureMonths));
  const [eligibility, setEligibility] = useState<EligibilityInput>({
    monthlyIncome: 75000,
    existingEmi: 0,
    loanAmount: 800000,
    tenureMonths: 60,
    cibilScore: 750,
    employmentType: "salaried",
  });

  useEffect(() => {
    setLoanAmount(DEFAULT_AMOUNT[product] ?? 800000);
    setTenureMonths(Math.min(60, PRODUCT_RULES[product].maxTenureMonths));
  }, [product]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchLenders();
      setLenders(list.length ? list : LENDER_CATALOG);
    } catch {
      setLenders(LENDER_CATALOG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const input: EligibilityInput = useMemo(
    () => ({ ...eligibility, loanAmount, tenureMonths, product }),
    [eligibility, loanAmount, tenureMonths, product]
  );

  const offers: LoanOffer[] = useMemo(
    () => (lenders.length ? buildLoanOffers(lenders, loanAmount, tenureMonths, input, product) : []),
    [lenders, loanAmount, tenureMonths, input, product]
  );

  const recommendations: AiRecommendation[] = useMemo(
    () => getAiRecommendations(lenders, loanAmount, tenureMonths, input, 3, product),
    [lenders, loanAmount, tenureMonths, input, product]
  );

  return {
    lenders,
    offers,
    recommendations,
    loading,
    product,
    loanAmount,
    tenureMonths,
    setLoanAmount,
    setTenureMonths,
    setEligibility,
    eligibility: input,
    refetch: load,
  };
}
