import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { getRefinanceSavings } from "../lib/ai-engine";

export function RefinancePanel() {
  const [outstanding, setOutstanding] = useState(800000);
  const [currentRate, setCurrentRate] = useState(12.5);
  const [remaining, setRemaining] = useState(48);
  const [newRate, setNewRate] = useState(9.5);
  const [newTenure, setNewTenure] = useState(48);
  const [foreclosurePct, setForeclosurePct] = useState(4);
  const [newFeePct, setNewFeePct] = useState(1);

  const savings = useMemo(
    () =>
      getRefinanceSavings(outstanding, currentRate, remaining, newRate, newTenure, {
        foreclosurePct,
        newProcessingPct: newFeePct,
      }),
    [outstanding, currentRate, remaining, newRate, newTenure, foreclosurePct, newFeePct]
  );

  const worthIt = savings.netSavings > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          Refinance calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground">Includes foreclosure charge and new lender fee (+18% GST)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Outstanding principal (₹)</Label>
            <Input type="number" className="mt-1" value={outstanding} onChange={(e) => setOutstanding(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Current rate %</Label>
            <Input type="number" step="0.1" className="mt-1" value={currentRate} onChange={(e) => setCurrentRate(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Months left</Label>
            <Input type="number" className="mt-1" value={remaining} onChange={(e) => setRemaining(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">New rate %</Label>
            <Input type="number" step="0.1" className="mt-1" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">New tenure (months)</Label>
            <Input type="number" className="mt-1" value={newTenure} onChange={(e) => setNewTenure(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Foreclosure charge %</Label>
            <Input type="number" step="0.5" className="mt-1" value={foreclosurePct} onChange={(e) => setForeclosurePct(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">New lender processing fee %</Label>
            <Input type="number" step="0.25" className="mt-1" value={newFeePct} onChange={(e) => setNewFeePct(Number(e.target.value))} />
          </div>
        </div>
        <aside
          className={cn(
            "grid gap-2 rounded-xl border p-4 text-sm sm:grid-cols-2",
            worthIt ? "border-primary/30 bg-primary/5" : "border-amber-500/40 bg-amber-500/5"
          )}
        >
          <p>Current EMI: <strong>{formatCurrency(savings.currentEmi)}</strong></p>
          <p>New EMI: <strong className="text-primary">{formatCurrency(savings.newEmi)}</strong></p>
          <p>Monthly savings: <strong>{formatCurrency(savings.monthlySavings)}</strong></p>
          <p>Switching cost: <strong>{formatCurrency(savings.switchingCost)}</strong></p>
          <p className="sm:col-span-2">
            Net savings after charges:{" "}
            <strong className={worthIt ? "text-primary" : "text-amber-600"}>{formatCurrency(savings.netSavings)}</strong>
            {savings.breakEvenMonths != null && worthIt ? ` · break-even in ${savings.breakEvenMonths} months` : ""}
          </p>
          {!worthIt && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Charges outweigh the interest saved — refinancing is not worth it at these numbers.
            </p>
          )}
        </aside>
      </CardContent>
    </Card>
  );
}
