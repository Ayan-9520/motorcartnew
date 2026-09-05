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
import { featureFlags } from "@/config/feature-flags";
import { createNewCarInventory } from "../services/new-car-dealer.service";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: string;
  sellerId?: string;
  dealerCity?: string;
  dealerState?: string;
  onSaved: () => void;
};

export function NewCarAddInventoryDialog({ open, onOpenChange, dealerId, sellerId, dealerCity, dealerState, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [stock, setStock] = useState("1");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [price, setPrice] = useState("");
  const [waitingDays, setWaitingDays] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const v2 = featureFlags.newCarInventoryV2;

  const reset = () => {
    setBrand("");
    setModel("");
    setVariant("");
    setStock("1");
    setFuelType("");
    setTransmission("");
    setPrice("");
    setWaitingDays("");
    setBrochureUrl("");
    setOfferTitle("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      toast.error("Brand and model are required");
      return;
    }
    const stockN = Number(String(stock || "1").replace(/\D/g, "")) || 1;
    if (!Number.isInteger(stockN) || stockN < 0) {
      toast.error("Stock must be an integer ≥ 0");
      return;
    }
    const exDigits = price.replace(/\D/g, "");
    const ex = exDigits ? Number(exDigits) : 0;
    if (exDigits && (!Number.isFinite(ex) || ex < 0)) {
      toast.error("Price must be ≥ 0 or left blank");
      return;
    }
    setLoading(true);
    const { error } = await createNewCarInventory(
      dealerId,
      {
        brand,
        model,
        variant: variant.trim() || "",
        fuelType: fuelType.trim() || "Petrol",
        transmission: transmission.trim() || "Manual",
        exShowroomPrice: ex,
        stock: stockN,
        waitingPeriodDays: v2 && waitingDays.trim() ? Number(waitingDays) || undefined : undefined,
        brochureUrl: v2 && brochureUrl.trim() ? brochureUrl.trim() : undefined,
        offers:
          v2 && offerTitle.trim()
            ? [{ title: offerTitle.trim(), validUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) }]
            : undefined,
      },
      {
        syncMarketplace: Boolean(sellerId && dealerCity && dealerState && ex > 0),
        sellerId,
        dealerCity,
        dealerState,
      }
    );
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not add vehicle");
      return;
    }
    toast.success("Vehicle added to showroom stock");
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add new car</DialogTitle>
          <DialogDescription>
            Required: Brand and Model. Variant, Stock, and price are optional (stock defaults to 1).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ncd-brand">Brand *</Label>
              <Input id="ncd-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Hyundai" required />
            </div>
            <div>
              <Label htmlFor="ncd-model">Model *</Label>
              <Input id="ncd-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Creta" required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ncd-variant">Variant (optional)</Label>
              <Input id="ncd-variant" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="SX(O) 1.5 Turbo" />
            </div>
            <div>
              <Label htmlFor="ncd-stock">Stock (optional, default 1)</Label>
              <Input id="ncd-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="1" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ncd-fuel">Fuel (optional)</Label>
              <Input id="ncd-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="Petrol" />
            </div>
            <div>
              <Label htmlFor="ncd-tx">Transmission (optional)</Label>
              <Input id="ncd-tx" value={transmission} onChange={(e) => setTransmission(e.target.value)} placeholder="Manual" />
            </div>
          </div>
          <div>
            <Label htmlFor="ncd-price">Ex-showroom / dealer price (optional)</Label>
            <Input id="ncd-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Leave blank if unknown" />
          </div>
          {v2 ? (
            <>
              <div>
                <Label htmlFor="ncd-wait">Waiting period days (optional)</Label>
                <Input id="ncd-wait" inputMode="numeric" value={waitingDays} onChange={(e) => setWaitingDays(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ncd-brochure">Brochure URL (optional)</Label>
                <Input id="ncd-brochure" value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://…/brochure.pdf" />
              </div>
              <div>
                <Label htmlFor="ncd-offer">Dealer offer title (optional)</Label>
                <Input id="ncd-offer" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="Festival discount" />
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save to stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
