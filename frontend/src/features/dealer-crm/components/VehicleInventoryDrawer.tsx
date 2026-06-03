import { useEffect, useMemo, useState } from "react";
import { X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  INDIAN_AUTO_BRANDS,
  BRAND_MODELS,
  INDIAN_STATES,
  calculateEmiMonthly,
  formatEmiLabel,
  type IndianAutoBrand,
} from "../data/indian-automobile-catalog";
import { generateAISpecs } from "../lib/excel-parser";
import { VehicleImagePicker } from "./VehicleImagePicker";
import type { VehicleListing } from "@/types/vehicle";

export type VehicleFormState = {
  title: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  emiTenure: number;
  emiRate: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  category: string;
  kmsDriven: number;
  owners: number;
  city: string;
  state: string;
  color: string;
  description: string;
  imageUrls: string[];
  condition: "new" | "used";
  discount: number;
  status: string;
  featured: boolean;
};

export const emptyVehicleForm = (city = "Mumbai", state = "Maharashtra"): VehicleFormState => ({
  title: "",
  brand: "Hyundai",
  model: "Creta",
  variant: "",
  year: 2023,
  price: 8_50_000,
  emiTenure: 60,
  emiRate: 9.5,
  fuelType: "Petrol",
  transmission: "Manual",
  bodyType: "SUV",
  category: "used-cars",
  kmsDriven: 15000,
  owners: 1,
  city,
  state,
  color: "",
  description: "",
  imageUrls: [""],
  condition: "used",
  discount: 0,
  status: "available",
  featured: false,
});

export function vehicleToForm(v: VehicleListing, city: string, state: string): VehicleFormState {
  const emi = (v.metadata as { emiMonthly?: number })?.emiMonthly ?? calculateEmiMonthly(v.price);
  return {
    title: v.title,
    brand: v.brand,
    model: v.model,
    variant: v.variant ?? "",
    year: v.year,
    price: v.price,
    emiTenure: 60,
    emiRate: 9.5,
    fuelType: v.fuelType,
    transmission: v.transmission,
    bodyType: v.bodyType,
    category: v.category,
    kmsDriven: v.kmsDriven,
    owners: v.owners,
    city: v.location?.split(",")[0]?.trim() ?? city,
    state,
    color: v.color ?? "",
    description: v.description ?? "",
    imageUrls: v.images?.length ? v.images : [""],
    condition: v.condition === "new" ? "new" : "used",
    discount: v.metadata?.discountPercent ?? 0,
    status: v.status,
    featured: v.isFeatured,
  };
}

type VehicleInventoryDrawerProps = {
  open: boolean;
  editing: VehicleListing | null;
  dealerId?: string;
  defaultCity?: string;
  defaultState?: string;
  onClose: () => void;
  onSave: (form: VehicleFormState) => Promise<void>;
  onAiPrice?: (form: VehicleFormState) => void;
};

export function VehicleInventoryDrawer({
  open,
  editing,
  dealerId,
  defaultCity = "Mumbai",
  defaultState = "Maharashtra",
  onClose,
  onSave,
  onAiPrice,
}: VehicleInventoryDrawerProps) {
  const [form, setForm] = useState(() => emptyVehicleForm(defaultCity, defaultState));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? vehicleToForm(editing, defaultCity, defaultState) : emptyVehicleForm(defaultCity, defaultState));
  }, [open, editing, defaultCity, defaultState]);

  const models = useMemo(() => {
    const b = form.brand as IndianAutoBrand;
    return BRAND_MODELS[b] ?? BRAND_MODELS.Hyundai;
  }, [form.brand]);

  const emi = calculateEmiMonthly(form.price, form.emiRate, form.emiTenure);

  const aiFillSpecs = () => {
    const specs = generateAISpecs({
      rowNumber: 0,
      brand: form.brand,
      model: form.model,
      year: form.year,
      fuel: form.fuelType,
      transmission: form.transmission,
      kmsDriven: form.kmsDriven,
      ownership: form.owners,
      price: form.price,
      registrationState: form.state,
    });
    setForm((f) => ({
      ...f,
      description:
        f.description ||
        `${f.year} ${f.brand} ${f.model} ${f.variant} — ${specs.engine}, ${specs.mileage}. Single owner, service history available.`,
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <button type="button" className="dealer-drawer-backdrop" aria-label="Close" onClick={onClose} />
      <aside className="dealer-drawer-panel" role="dialog" aria-labelledby="vehicle-drawer-title">
        <div className="dealer-drawer-head">
          <div>
            <h2 id="vehicle-drawer-title" className="text-lg font-semibold">
              {editing ? "Edit vehicle" : "Add vehicle"}
            </h2>
            <p className="text-xs text-muted-foreground">Indian market specs · multi-image · EMI</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="dealer-drawer-body">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Brand</Label>
              <select
                className="dealer-os-select mt-1"
                value={form.brand}
                onChange={(e) =>
                  setForm({ ...form, brand: e.target.value, model: BRAND_MODELS[e.target.value as IndianAutoBrand]?.[0] ?? "" })
                }
              >
                {INDIAN_AUTO_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Model</Label>
              <select
                className="dealer-os-select mt-1"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Variant</Label>
              <Input className="mt-1" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" className="mt-1" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" className="mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>EMI @ {form.emiRate}% · {form.emiTenure} mo</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/40">
                  {formatEmiLabel(emi)}
                </Badge>
                <Input
                  type="number"
                  className="h-8 w-20"
                  value={form.emiRate}
                  onChange={(e) => setForm({ ...form, emiRate: Number(e.target.value) })}
                  title="Rate %"
                />
              </div>
            </div>
            <div>
              <Label>KM driven</Label>
              <Input type="number" className="mt-1" value={form.kmsDriven} onChange={(e) => setForm({ ...form, kmsDriven: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Owners</Label>
              <Input type="number" className="mt-1" value={form.owners} onChange={(e) => setForm({ ...form, owners: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Fuel</Label>
              <select className="dealer-os-select mt-1" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Transmission</Label>
              <select className="dealer-os-select mt-1" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
                {["Manual", "Automatic", "AMT", "DCT", "CVT"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Body type</Label>
              <select className="dealer-os-select mt-1" value={form.bodyType} onChange={(e) => setForm({ ...form, bodyType: e.target.value })}>
                {["Hatchback", "Sedan", "SUV", "MUV", "Coupe"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="dealer-os-select mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="available">Live</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <Label>City</Label>
              <Input className="mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <select className="dealer-os-select mt-1" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Featured on storefront
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.condition === "new"}
                  onChange={(e) => setForm({ ...form, condition: e.target.checked ? "new" : "used" })}
                />
                New car
              </label>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Listing media</span>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={aiFillSpecs}>
                <Wand2 className="h-3.5 w-3.5" /> AI specs
              </Button>
            </div>
            <VehicleImagePicker
              imageUrls={form.imageUrls}
              uploadPrefix={dealerId ? `dealer-${dealerId}` : "inventory"}
              onChange={(imageUrls) => setForm({ ...form, imageUrls })}
            />
          </div>

          <div className="mt-3">
            <Label>Description & specifications</Label>
            <textarea
              className="dealer-os-textarea mt-1"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="dealer-drawer-foot">
          {onAiPrice && (
            <Button type="button" variant="outline" onClick={() => onAiPrice(form)}>
              AI price
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save listing"}
          </Button>
        </div>
      </aside>
    </>
  );
}
