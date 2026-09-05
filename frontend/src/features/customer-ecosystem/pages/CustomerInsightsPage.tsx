import { useEffect } from "react";
import { CustomerAiInsightList } from "../components/CustomerAiInsightList";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerInsightsPage() {
  const { data } = useCustomerEcosystem();

  useEffect(() => {
    setPageMeta({ title: "Ownership alerts" });
  }, []);

  return (
    <CustomerEcosystemPage title="Ownership alerts" description="Deterministic alerts from insurance, quotations, test drives, finance, and sell requests. Not AI.">
      <CustomerAiInsightList insights={data?.insights ?? []} />
    </CustomerEcosystemPage>
  );
}
