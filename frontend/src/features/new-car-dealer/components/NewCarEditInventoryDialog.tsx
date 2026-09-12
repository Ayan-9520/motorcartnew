import { useEffect, useState } from "react";
import { Check, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
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
import { guessHexFromName } from "@/features/vehicles/lib/vehicle-paint";
import { cn, formatCurrency } from "@/lib/utils";
import { updateNewCarInventory } from "../services/new-car-dealer.service";
import type { NcdInventoryItem } from "../types";

function isLightHex(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

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
  const [paintNames, setPaintNames] = useState<string[]>([]);
  const [paintIdx, setPaintIdx] = useState(0);
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
    setImageUrls(collectPhotos(item));
    const paints = (item.colors ?? []).map((c) => String(c ?? "").trim()).filter(Boolean);
    setPaintNames(paints);
    setPaintIdx(0);
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
    const colors = paintNames.map((n) => n.trim()).filter(Boolean);
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
      images: photos,
      ...(photos[0] ? { imageUrl: photos[0] } : {}),
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
    toast.success("Stock updated");
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paint colours</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => {
                  setPaintNames((prev) => [...prev, ""]);
                  setPaintIdx(paintNames.length);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add colour
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Same as Buy page — tap a circle, type the OEM paint name (e.g. Mythos Black). Photo order matches colour
              order (1st colour ↔ 1st photo).
            </p>
            {paintNames.length ? (
              <>
                <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto pb-1" role="listbox" aria-label="Paint colours">
                  {paintNames.map((name, i) => {
                    const hex = guessHexFromName(name.trim() || "Grey");
                    const active = i === paintIdx;
                    const light = isLightHex(hex);
                    return (
                      <button
                        key={`paint-${i}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        title={name.trim() || `Colour ${i + 1}`}
                        onClick={() => setPaintIdx(i)}
                        className={cn(
                          "relative h-10 w-10 shrink-0 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          active ? "scale-105 border-foreground ring-2 ring-primary/40" : "border-border/80",
                        )}
                        style={{ backgroundColor: hex }}
                      >
                        {active ? (
                          <span
                            className={cn(
                              "absolute inset-0 flex items-center justify-center",
                              light ? "text-slate-900" : "text-white",
                            )}
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="edit-paint-name">Colour name</Label>
                    <Input
                      id="edit-paint-name"
                      value={paintNames[paintIdx] ?? ""}
                      onChange={(e) => {
                        const next = [...paintNames];
                        next[paintIdx] = e.target.value;
                        setPaintNames(next);
                      }}
                      placeholder="e.g. Navarra Blue Metallic"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    title="Remove colour"
                    onClick={() => {
                      const next = paintNames.filter((_, i) => i !== paintIdx);
                      setPaintNames(next);
                      setPaintIdx((idx) => Math.max(0, Math.min(idx, next.length - 1)));
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No colours yet — add paint options for the Buy page swatches.</p>
            )}
          </section>

          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos</p>
            <VehicleImagePicker
              imageUrls={imageUrls}
              uploadPrefix={`ncd/${item?.id ?? "edit"}`}
              onChange={setImageUrls}
            />
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
