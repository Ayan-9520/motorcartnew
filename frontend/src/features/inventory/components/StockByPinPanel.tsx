import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api/axios";
import { fetchStockByPincode } from "../services/inventory-by-pincode.service";
import { INDIA_PIN_RE, stockItemDetailPath, stockItemLabel, type StockByPinResponse } from "../types";

export function StockByPinPanel() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StockByPinResponse | null>(null);

  async function onCheck(event: FormEvent) {
    event.preventDefault();
    const next = pin.trim();
    setError(null);
    if (!INDIA_PIN_RE.test(next)) {
      setResult(null);
      setError("Enter a valid 6-digit PIN.");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStockByPincode(next);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Enter PIN to check available stock</p>
      <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={onCheck}>
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="110001"
          aria-label="PIN code"
          className="w-36"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check Stock"}
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {result && result.count > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Available stock for {result.pincode}</p>
          <ul className="space-y-2">
            {result.items.map((item) => {
              const path = stockItemDetailPath(item);
              const key = `${item.source}-${item.inventoryId ?? item.vehicleId}`;
              const meta = [item.dealerName, item.city, item.branch?.name].filter(Boolean).join(" · ");
              const stockLabel = item.stock != null ? ` · ${item.stock} in stock` : "";
              const body = (
                <>
                  <span className="font-medium">{stockItemLabel(item)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {meta}
                    {stockLabel}
                  </span>
                </>
              );
              return (
                <li key={key} className="rounded-lg border border-border px-3 py-2 text-sm">
                  {path ? (
                    <Link to={path} className="hover:text-primary">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {result && result.count === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No available stock found for this PIN.</p>
      ) : null}
    </Card>
  );
}
