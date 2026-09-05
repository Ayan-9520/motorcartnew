import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { fetchMotorCartOne, issueMotorCartOneQr } from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function CustomerMotorCartOnePage() {
  const [card, setCard] = useState<Record<string, unknown>>({});
  const [qr, setQr] = useState<{ token?: string; verifyPath?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "MotorCart One" });
    void fetchMotorCartOne()
      .then(setCard)
      .catch((e) => setError(e instanceof Error ? e.message : "Unavailable"));
  }, []);

  return (
    <CustomerEcosystemPage
      title="MotorCart One"
      description="Ecosystem membership identity. NOT A PAYMENT CARD. NOT A BANK CARD. NOT A WALLET. NOT A FASTAG. NOT CREDIT. NOT PREPAID."
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="cos-fastag-card max-w-lg space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">MotorCart One</p>
        <p className="text-2xl font-semibold">{String(card.fullName ?? "")}</p>
        <p className="font-mono text-lg">{String(card.publicId ?? "")}</p>
        <p className="text-sm text-muted-foreground">Status {String(card.status ?? "")}</p>
        <p className="text-sm">Reward points {String(card.rewardBalance ?? 0)} (from Reward ledger)</p>
        <p className="text-xs text-muted-foreground">Member since {String(card.memberSince ?? "").slice(0, 10)}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            className="rounded-xl"
            onClick={() => void issueMotorCartOneQr().then(setQr)}
          >
            Show QR
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/dashboard/customer/rewards">Rewards</Link>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/dashboard/customer/garage">My Garage</Link>
          </Button>
        </div>
        {qr?.verifyPath ? (
          <div className="rounded-lg border p-3 text-sm">
            <p>Verification link (read-only, not a login token):</p>
            <Link className="break-all text-primary" to={qr.verifyPath}>
              {qr.verifyPath}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          ["/dashboard/customer/quotations", "My Quotations"],
          ["/dashboard/customer/test-drives", "My Test Drives"],
          ["/dashboard/customer/insurance-wallet", "Insurance"],
          ["/dashboard/customer/loans", "Finance"],
          ["/dashboard/customer/service-records", "Service"],
          ["/dashboard/customer/documents", "Documents"],
          ["/dashboard/customer/activity", "Activity"],
          ["/dashboard/customer/reminders", "Reminders"],
        ].map(([to, label]) => (
          <Button key={to} variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>
    </CustomerEcosystemPage>
  );
}
