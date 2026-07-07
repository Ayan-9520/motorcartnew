import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadDailyNewCarStock } from "../services/new-car-dealer.service";
import type { NcdInventoryItem } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: string;
  items: NcdInventoryItem[];
  onSaved: () => void;
};

export function NewCarDailyStockDialog({ open, onOpenChange, dealerId, items, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [stockAfter, setStockAfter] = useState("");
  const [fileName, setFileName] = useState("daily-stock.csv");
  const [notes, setNotes] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(stockAfter.replace(/\D/g, ""));
    if (!inventoryId || Number.isNaN(qty)) {
      toast.error("Select a variant and enter stock count");
      return;
    }
    setLoading(true);
    const { error } = await uploadDailyNewCarStock(dealerId, inventoryId, qty, fileName, notes || undefined);
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Stock update failed");
      return;
    }
    toast.success("Daily stock logged");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Daily stock upload</DialogTitle>
          <DialogDescription>Update units on hand and keep an audit trail for your showroom.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <Label htmlFor="ncd-stock-item">Variant</Label>
            <select
              id="ncd-stock-item"
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
            >
              <option value="">Select…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.brand} {i.model} {i.variant}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ncd-stock-qty">Stock count</Label>
            <Input id="ncd-stock-qty" inputMode="numeric" value={stockAfter} onChange={(e) => setStockAfter(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ncd-stock-file">File name (optional)</Label>
            <Input id="ncd-stock-file" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ncd-stock-notes">Notes</Label>
            <Input id="ncd-stock-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Morning yard count" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !items.length}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
