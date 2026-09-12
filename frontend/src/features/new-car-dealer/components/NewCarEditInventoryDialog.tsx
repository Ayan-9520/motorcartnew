import { useEffect, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
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
import { VehicleImagePicker } from "@/features/dealer-crm/components/VehicleImagePicker";
import { cn, formatCurrency } from "@/lib/utils";
import { updateNewCarInventory } from "../services/new-car-dealer.service";
import type { NcdInventoryItem } from "../types";

type Props = {
  item: NcdInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function collectPhotos(v: NcdInventoryItem): string[] {
  const fromList = (v.images ?? []).map((u) => u.trim()).filter(Boolean);
  const primary = v.imageUrl?.trim() || "";
  const merged = [...fromList, ...(primary ? [primary] : [])].filter(
    (u, i, arr) => Boolean(u) && arr.indexOf(u) === i && (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")),
  );
  return merged.length ? merged : [""];
}

export function NewCarEditInventoryDialog({ item, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [stockQty, setStockQty] = useState("1");
  const [price, setPrice] = useState("");
  const [onRoad, setOnRoad] = useState("");
  const [discount, setDiscount] = useState("");
  const [colorNames, setColorNames] = useState<string[]>([]);
  const [deliveryDays, setDeliveryDays] = useState("");
  const [waitingDays, setWaitingDays] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [stockStatus, setStockStatus] = useState<NcdInventoryItem["stockStatus"]>("available");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  // Controlled Dialog sets `open` without calling onOpenChange(true) — hydrate whenever item opens
  useEffect(() => {
    if (!open || !item) return;
    setBrand(item.brand ?? "");
    setModel(item.model ?? "");
    setVariant(item.variant ?? "");
    setFuelType(item.fuelType || "Petrol");
    setTransmission(item.transmission || "Manual");
    setStockQty(String(Math.max(1, Number(item.stock) || 1)));
    setPrice(item.exShowroomPrice > 0 ? String(Math.round(item.exShowroomPrice)) : "");
    setOnRoad(item.onRoadPrice > 0 ? String(Math.round(item.onRoadPrice)) : "");
    setDiscount(item.discountAmount > 0 ? String(Math.round(item.discountAmount)) : "");
    setStockStatus(item.stockStatus || "available");
    const photos = collectPhotos(item);
    setImageUrls(photos);
    const existingColors = (item.colors ?? []).map((c) => String(c ?? "").trim());
    setColorNames(photos.map((_, i) => existingColors[i] ?? ""));
    setDeliveryDays(
      item.expectedDeliveryDays != null && item.expectedDeliveryDays > 0
        ? String(item.expectedDeliveryDays)
        : "",
    );
    setWaitingDays(
      item.waitingPeriodDays != null && item.waitingPeriodDays > 0 ? String(item.waitingPeriodDays) : "",
    );
    setBrochureUrl(item.brochureUrl?.trim() || "");
  }, [open, item]);

  function onPhotosChange(next: string[]) {
    setImageUrls(next);
    setColorNames((prev) => next.map((_, i) => prev[i] ?? ""));
  }

  const previewSrc = imageUrls.map((u) => u.trim()).find(Boolean) || item?.imageUrl || "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!brand.trim() || !model.trim()) {
      toast.error("Brand and model are required");
      return;
    }
    const stockN = Math.max(1, Number(String(stockQty).replace(/\D/g, "")) || 1);
    const exDigits = price.replace(/\D/g, "");
    const ex = exDigits ? Number(exDigits) : 0;
    const orDigits = onRoad.replace(/\D/g, "");
    const or = orDigits ? Number(orDigits) : 0;
    const discDigits = discount.replace(/\D/g, "");
    const disc = discDigits ? Number(discDigits) : 0;
    if (Number.isNaN(ex) || ex < 0 || Number.isNaN(or) || or < 0 || Number.isNaN(disc) || disc < 0) {
      toast.error("Enter valid amounts, or leave price fields blank");
      return;
    }
    const photos = imageUrls.map((u) => u.trim()).filter(Boolean);
    // Paint order = photo order (CarLelo). Keep only named paints, re-order photos to match.
    const paired = photos
      .map((url, i) => ({ url, name: (colorNames[i] ?? "").trim() }))
      .filter((p) => p.name);
    if (photos.length > 0 && paired.length === 0) {
      toast.error("Add colour names under each paint photo — then Buy page shows colour swatches");
      return;
    }
    const colors = paired.map((p) => p.name);
    const orderedPhotos = paired.length
      ? [...paired.map((p) => p.url), ...photos.filter((u) => !paired.some((p) => p.url === u))]
      : photos;
    const delivery = deliveryDays.trim() ? Number(deliveryDays.replace(/\D/g, "")) : undefined;
    const waiting = waitingDays.trim() ? Number(waitingDays.replace(/\D/g, "")) : undefined;
    setLoading(true);
    const { error } = await updateNewCarInventory(item, {
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim() || "Standard",
      fuelType: fuelType.trim() || "Petrol",
      transmission: transmission.trim() || "Manual",
      exShowroomPrice: ex,
      ...(or > 0 ? { onRoadPrice: or } : ex > 0 ? { onRoadPrice: Math.round(ex * 1.12) } : {}),
      stock: stockN,
      discountAmount: disc,
      stockStatus: stockStatus === "out_of_stock" ? "available" : stockStatus,
      images: orderedPhotos,
      ...(orderedPhotos[0] ? { imageUrl: orderedPhotos[0] } : {}),
      colors,
      expectedDeliveryDays: delivery != null && Number.isFinite(delivery) ? delivery : undefined,
      waitingPeriodDays: waiting != null && Number.isFinite(waiting) ? waiting : undefined,
      brochureUrl: brochureUrl.trim() || undefined,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Update failed");
      return;
    }
    toast.success("Stock updated — colour swatches will show on Buy page");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="border-b border-border/70 bg-gradient-to-br from-card via-card to-muted/40 px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted",
                  !previewSrc && "flex items-center justify-center",
                )}
              >
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">Edit stock</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {item ? (
                    <>
                      <span className="font-medium text-foreground">
                        {item.brand} {item.model}
                      </span>
                      {item.variant ? <span> · {item.variant}</span> : null}
                      {(item.exShowroomPrice > 0 || item.onRoadPrice > 0) && (
                        <span>
                          {" "}
                          ·{" "}
                          {formatCurrency(item.onRoadPrice > 0 ? item.onRoadPrice : item.exShowroomPrice)}
                        </span>
                      )}
                    </>
                  ) : (
                    "Update showroom details, colours, and photos."
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={onSubmit} className="grid max-h-[min(70vh,640px)] gap-5 overflow-y-auto px-5 py-4 sm:px-6">
          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-brand">Brand *</Label>
                <Input id="edit-brand" value={brand} onChange={(e) => setBrand(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="edit-model">Model *</Label>
                <Input id="edit-model" value={model} onChange={(e) => setModel(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-variant">Variant</Label>
              <Input id="edit-variant" value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Standard" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-fuel">Fuel</Label>
                <select
                  id="edit-fuel"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                >
                  {["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "Petrol + CNG"].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-tx">Transmission</Label>
                <select
                  id="edit-tx"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                >
                  {["Manual", "Automatic", "AMT", "CVT", "DCT", "IVT"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & stock</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="edit-price">Ex-showroom (₹)</Label>
                <Input
                  id="edit-price"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Blank = POR"
                />
              </div>
              <div>
                <Label htmlFor="edit-onroad">On-road (₹)</Label>
                <Input
                  id="edit-onroad"
                  inputMode="numeric"
                  value={onRoad}
                  onChange={(e) => setOnRoad(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="edit-discount">Discount (₹)</Label>
                <Input
                  id="edit-discount"
                  inputMode="numeric"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-qty">Units in stock</Label>
                <Input id="edit-qty" inputMode="numeric" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
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
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colours & delivery</p>
            <p className="text-[11px] text-muted-foreground">
              Name each paint photo below (e.g. Mythos Black). Same order = colour circles on the public Buy page
              (CarLelo style). Interior photos can stay unnamed.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-delivery">Expected delivery (days)</Label>
                <Input
                  id="edit-delivery"
                  inputMode="numeric"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="14"
                />
              </div>
              <div>
                <Label htmlFor="edit-wait">Waiting period (days)</Label>
                <Input
                  id="edit-wait"
                  inputMode="numeric"
                  value={waitingDays}
                  onChange={(e) => setWaitingDays(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-brochure">Brochure URL</Label>
              <Input
                id="edit-brochure"
                value={brochureUrl}
                onChange={(e) => setBrochureUrl(e.target.value)}
                placeholder="https://…/brochure.pdf"
              />
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos + paint names</p>
            <VehicleImagePicker
              imageUrls={imageUrls}
              uploadPrefix={`ncd/${item?.id ?? "edit"}`}
              onChange={onPhotosChange}
            />
            <div className="space-y-2">
              {imageUrls.map((url, i) => {
                const src = url.trim();
                if (!src) return null;
                return (
                  <div
                    key={`${src}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-2"
                  >
                    <img src={src} alt="" className="h-12 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Colour name {i === 0 ? "(main / hero)" : ""}
                      </Label>
                      <Input
                        value={colorNames[i] ?? ""}
                        onChange={(e) =>
                          setColorNames((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                        placeholder={i === 0 ? "e.g. Navarra Blue Metallic" : "Leave blank if not a paint"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <DialogFooter className="sticky bottom-0 -mx-5 border-t border-border/70 bg-card/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
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
