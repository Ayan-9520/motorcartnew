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
  const [fuelType, setFuelType] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [price, setPrice] = useState("");
  const [waitingDays, setWaitingDays] = useState("14");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const v2 = featureFlags.newCarInventoryV2;

  const reset = () => {
    setBrand("");
    setModel("");
    setVariant("");
    setFuelType("Petrol");
    setTransmission("Manual");
    setPrice("");
    setWaitingDays("14");
    setBrochureUrl("");
    setOfferTitle("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ex = Number(price.replace(/\D/g, ""));
    if (!brand.trim() || !model.trim() || !ex || ex < 100000) {
      toast.error("Brand, model and valid ex-showroom price required");
      return;
    }
    setLoading(true);
    const { error } = await createNewCarInventory(
      dealerId,
      {
        brand,
        model,
        variant: variant || "Standard",
        fuelType,
        transmission,
        exShowroomPrice: ex,
        waitingPeriodDays: v2 ? Number(waitingDays) || 14 : undefined,
        brochureUrl: v2 && brochureUrl.trim() ? brochureUrl.trim() : undefined,
        offers:
          v2 && offerTitle.trim()
            ? [{ title: offerTitle.trim(), validUntil: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) }]
            : undefined,
      },
      {
        syncMarketplace: Boolean(sellerId && dealerCity && dealerState),
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
          <DialogDescription>Stock appears in showroom inventory and on /buy/cars/new.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ncd-brand">Brand</Label>
              <Input id="ncd-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Hyundai" />
            </div>
            <div>
              <Label htmlFor="ncd-model">Model</Label>
              <Input id="ncd-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Creta" />
            </div>
          </div>
          <div>
            <Label htmlFor="ncd-variant">Variant</Label>
            <Input id="ncd-variant" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="SX(O) 1.5 Turbo" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ncd-fuel">Fuel</Label>
              <Input id="ncd-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ncd-tx">Transmission</Label>
              <Input id="ncd-tx" value={transmission} onChange={(e) => setTransmission(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ncd-price">Ex-showroom price (₹)</Label>
            <Input id="ncd-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1899000" />
          </div>
          {v2 ? (
            <>
              <div>
                <Label htmlFor="ncd-wait">Waiting period (days)</Label>
                <Input id="ncd-wait" inputMode="numeric" value={waitingDays} onChange={(e) => setWaitingDays(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ncd-brochure">Brochure URL</Label>
                <Input id="ncd-brochure" value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://…/brochure.pdf" />
              </div>
              <div>
                <Label htmlFor="ncd-offer">Dealer offer (title)</Label>
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
