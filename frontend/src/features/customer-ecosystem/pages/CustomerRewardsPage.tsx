import { useEffect, useState } from "react";
import { CustomerRewardsPanel } from "../components/CustomerRewardsPanel";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { setPageMeta } from "@/utils/seo";
import { fetchRewardAccount, fetchRewardStatement } from "@/features/commercial/commercial.service";

export function CustomerRewardsPage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<Array<Record<string, unknown>>>([]);
  const [statement, setStatement] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Loyalty & Rewards" });
    const now = new Date();
    void Promise.all([fetchRewardAccount(), fetchRewardStatement(now.getFullYear(), now.getMonth() + 1)])
      .then(([acct, stmt]) => {
        setBalance(Number(acct.balance ?? 0));
        setLedger(acct.ledger ?? []);
        setStatement(stmt);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Rewards unavailable"));
  }, []);

  return (
    <CustomerEcosystemPage title="Loyalty & rewards" description="Points come from the Batch 8 reward ledger. MotorCart One displays this balance and is not a payment card.">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <CustomerRewardsPanel balance={balance} ledger={ledger} statement={statement} />
    </CustomerEcosystemPage>
  );
}
