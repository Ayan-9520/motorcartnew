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
import { updateNewCarInventory } from "../services/new-car-dealer.service";
import type { NcdInventoryItem } from "../types";

type Props = {
  item: NcdInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function NewCarEditInventoryDialog({ item, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [price, setPrice] = useState("");
  const [stockStatus, setStockStatus] = useState<NcdInventoryItem["stockStatus"]>("available");

  const resetFromItem = (v: NcdInventoryItem) => {
    setBrand(v.brand);
    setModel(v.model);
    setVariant(v.variant);
    setFuelType(v.fuelType);
    setTransmission(v.transmission);
    setPrice(String(v.exShowroomPrice));
    setStockStatus(v.stockStatus);
  };

  const onOpen = (next: boolean) => {
    if (next && item) resetFromItem(item);
    onOpenChange(next);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const ex = Number(price.replace(/\D/g, ""));
    if (!brand.trim() || !model.trim() || !ex) {
      toast.error("Brand, model and price required");
      return;
    }
    setLoading(true);
    const { error } = await updateNewCarInventory(item, {
      brand,
      model,
      variant: variant || "Standard",
      fuelType,
      transmission,
      exShowroomPrice: ex,
      onRoadPrice: Math.round(ex * 1.12),
      stockStatus,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Update failed");
      return;
    }
    toast.success("Stock updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit stock</DialogTitle>
          <DialogDescription>Updates showroom and public listing when synced.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-brand">Brand</Label>
              <Input id="edit-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-model">Model</Label>
              <Input id="edit-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-variant">Variant</Label>
            <Input id="edit-variant" value={variant} onChange={(e) => setVariant(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-fuel">Fuel</Label>
              <Input id="edit-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-tx">Transmission</Label>
              <Input id="edit-tx" value={transmission} onChange={(e) => setTransmission(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-price">Ex-showroom (₹)</Label>
            <Input id="edit-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-status">Stock status</Label>
            <select
              id="edit-status"
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as NcdInventoryItem["stockStatus"])}
            >
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="transit">In transit</option>
              <option value="upcoming">Upcoming</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
