import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSellRequests, mutateSaleOffer } from "@/features/customer-ecosystem/services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function DealerAcquisitionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [amount, setAmount] = useState("500000");

  async function refresh() {
    setRows(await fetchSellRequests("open"));
  }

  useEffect(() => {
    setPageMeta({ title: "Vehicle acquisition" });
    void refresh();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Customer sell requests</h1>
      <p className="text-sm text-muted-foreground">
        Public vehicle facts only. Customer phone and email are withheld. Offers are purchase interest, not settlement.
      </p>
      <ul className="space-y-3">
        {rows.length === 0 ? <p>No open sell requests.</p> : null}
        {rows.map((r) => (
          <li key={String(r.id)} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">
              {String(r.brand)} {String(r.model)} {String(r.year)} · {String(r.city)}
            </p>
            <p>
              {String(r.kmsDriven)} km · {String(r.fuelType)} · {String(r.transmission)}
            </p>
            <div className="mt-2 flex gap-2">
              <Input className="max-w-40" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button
                size="sm"
                onClick={() =>
                  void mutateSaleOffer({ saleRequestId: r.id, amount: Number(amount) }).then(refresh)
                }
              >
                Submit offer
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
