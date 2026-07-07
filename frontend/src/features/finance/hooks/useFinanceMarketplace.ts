import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLenders } from "../services/finance.service";
import { buildLoanOffers, getAiRecommendations } from "../lib/ai-engine";
import type { EligibilityInput, Lender, LoanOffer, AiRecommendation } from "../types";

export function useFinanceMarketplace() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState(1200000);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [eligibility, setEligibility] = useState<EligibilityInput>({
    monthlyIncome: 75000,
    existingEmi: 0,
    loanAmount: 1200000,
    tenureMonths: 60,
    cibilScore: 720,
    employmentType: "salaried",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchLenders();
    setLenders(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const input: EligibilityInput = useMemo(
    () => ({ ...eligibility, loanAmount, tenureMonths }),
    [eligibility, loanAmount, tenureMonths]
  );

  const offers: LoanOffer[] = useMemo(
    () => (lenders.length ? buildLoanOffers(lenders, loanAmount, tenureMonths, input) : []),
    [lenders, loanAmount, tenureMonths, input]
  );

  const recommendations: AiRecommendation[] = useMemo(
    () => getAiRecommendations(lenders, loanAmount, tenureMonths, input, 3),
    [lenders, loanAmount, tenureMonths, input]
  );

  return {
    lenders,
    offers,
    recommendations,
    loading,
    loanAmount,
    tenureMonths,
    setLoanAmount,
    setTenureMonths,
    setEligibility,
    eligibility: input,
    refetch: load,
  };
}
