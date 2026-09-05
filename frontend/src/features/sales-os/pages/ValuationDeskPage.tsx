import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchValuationQueue, submitValuation } from "@/features/customer-ecosystem/services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function ValuationDeskPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [min, setMin] = useState("600000");
  const [max, setMax] = useState("700000");

  async function refresh() {
    setRows(await fetchValuationQueue());
  }

  useEffect(() => {
    setPageMeta({ title: "Valuation desk" });
    void refresh();
  }, []);

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-xl font-semibold">Valuation requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Indicative professional valuation only — not a guaranteed purchase price, loan sanction, or insurance IDV.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 ? <p>No assigned requests.</p> : null}
        {rows.map((r) => (
          <li key={String(r.id)} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">
              {String(r.brand)} {String(r.model)} {String(r.year)} · {String(r.city)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input className="max-w-32" value={min} onChange={(e) => setMin(e.target.value)} />
              <Input className="max-w-32" value={max} onChange={(e) => setMax(e.target.value)} />
              <Button
                size="sm"
                onClick={() =>
                  void submitValuation({
                    saleRequestId: r.id,
                    amountMin: Number(min),
                    amountMax: Number(max),
                  }).then(refresh)
                }
              >
                Submit valuation
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
