import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { fetchSellRequests, mutateSaleOffer, mutateSellRequest } from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function CustomerSellRequestsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ brand: "", model: "", year: 2020, kmsDriven: 20000, city: "Pune", state: "MH" });

  async function refresh() {
    setRows(await fetchSellRequests());
  }

  useEffect(() => {
    setPageMeta({ title: "Sell my vehicle" });
    void refresh();
  }, []);

  return (
    <CustomerEcosystemPage
      title="Sell my vehicle"
      description="Create a sell request, receive partner valuations and dealer purchase offers. MotorCart does not auto-pick the highest offer. Settlement is not automatic."
    >
      <form
        className="mb-6 grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void mutateSellRequest(form).then(refresh);
        }}
      >
        <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Button type="submit">Save draft</Button>
      </form>
      <ul className="space-y-4">
        {rows.length === 0 ? <p className="cos-empty">No sell requests yet.</p> : null}
        {rows.map((r) => {
          const offers = (r.offers as Array<Record<string, unknown>> | undefined) ?? [];
          const vals = (r.valuations as Array<Record<string, unknown>> | undefined) ?? [];
          return (
            <li key={String(r.id)} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">
                {String(r.brand)} {String(r.model)} · {String(r.status)}
              </p>
              <div className="mt-2 flex gap-2">
                {r.status === "DRAFT" ? (
                  <Button size="sm" onClick={() => void mutateSellRequest({ action: "submit", id: r.id }).then(refresh)}>
                    Submit for offers
                  </Button>
                ) : null}
                {r.status !== "CANCELLED" ? (
                  <Button size="sm" variant="outline" onClick={() => void mutateSellRequest({ action: "cancel", id: r.id }).then(refresh)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 text-xs uppercase text-muted-foreground">Valuations (indicative, not a purchase offer)</p>
              {vals.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
              {vals.map((v) => (
                <p key={String(v.id)}>
                  ₹{String(v.amountMin)}–₹{String(v.amountMax)} · {String(v.status)}
                </p>
              ))}
              <p className="mt-3 text-xs uppercase text-muted-foreground">Dealer offers</p>
              {offers.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
              {offers.map((o) => (
                <div key={String(o.id)} className="mt-1 flex items-center justify-between gap-2">
                  <span>
                    ₹{String(o.amount)} · {String(o.status)} · {o.validUntil ? String(o.validUntil) : "no expiry"}
                  </span>
                  {o.status === "ACTIVE" ? (
                    <Button size="sm" onClick={() => void mutateSaleOffer({ action: "accept", id: o.id }).then(refresh)}>
                      Accept
                    </Button>
                  ) : null}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </CustomerEcosystemPage>
  );
}
