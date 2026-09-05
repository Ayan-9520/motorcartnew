import { useEffect, useState } from "react";
import { FinanceDashboardShell } from "@/features/finance/components/FinanceDashboardShell";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";

type Quote = { id: string; quoteKind: string; premium?: number | string | null };
type Policy = { id: string; policyNumber: string; status: string };
type Claim = { id: string; status: string; description: string };

export function InsurancePartnerDashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    setPageMeta({ title: "Insurance console — MotorCart" });
    void Promise.all([
      api.get<{ data: Quote[] }>("/api/insurance/quotes").then((r) => setQuotes(r.data.data ?? [])),
      api.get<{ data: Policy[] }>("/api/insurance/policies").then((r) => setPolicies(r.data.data ?? [])),
      api.get<{ data: Claim[] }>("/api/insurance/claims").then((r) => setClaims(r.data.data ?? [])),
    ]).catch(() => {
      setQuotes([]);
      setPolicies([]);
      setClaims([]);
    });
  }, []);

  return (
    <FinanceDashboardShell variant="lender" title="Insurance console" subtitle="Quotes, policies, and claim notifications">
      <section className="fin-section">
        <h2 className="fin-section__title">Partner quotes</h2>
        {!quotes.length ? <p className="text-muted-foreground">No partner quotes yet.</p> : (
          <ul className="space-y-2 text-sm">
            {quotes.map((q) => (
              <li key={q.id}>{q.quoteKind} · {String(q.premium ?? "—")}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="fin-section">
        <h2 className="fin-section__title">Policies</h2>
        {!policies.length ? <p className="text-muted-foreground">No policies issued.</p> : (
          <ul className="space-y-2 text-sm">
            {policies.map((p) => (
              <li key={p.id}>{p.policyNumber} · {p.status}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="fin-section">
        <h2 className="fin-section__title">Claims</h2>
        {!claims.length ? <p className="text-muted-foreground">No claim notifications.</p> : (
          <ul className="space-y-2 text-sm">
            {claims.map((c) => (
              <li key={c.id}>{c.status} · {c.description}</li>
            ))}
          </ul>
        )}
      </section>
    </FinanceDashboardShell>
  );
}
