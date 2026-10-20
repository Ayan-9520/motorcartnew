import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Car, ImageOff } from "lucide-react";
import type { VehicleListing } from "@/types/vehicle";
import { missingRequiredAngles, photoAngleLabel } from "@/lib/photo-angles";
import { cn } from "@/lib/utils";
import { formatLakh } from "../lib/brochure-model";
import type { BrochureVehicle } from "../types";

const selectCls = "mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm";

type Props = {
  listings: VehicleListing[] | null;
  selectedId: string;
  vehicle: BrochureVehicle | null;
  inventoryPath: string;
  onSelect: (id: string) => void;
};

export function VehiclePanel({ listings, selectedId, vehicle, inventoryPath, onSelect }: Props) {
  const selected = listings?.find((l) => l.id === selectedId) ?? null;
  const [tab, setTab] = useState<"new" | "used">(selected?.condition === "used" ? "used" : "new");
  const [brand, setBrand] = useState(selected?.brand ?? "");
  const [model, setModel] = useState(selected?.model ?? "");

  useEffect(() => {
    if (!selected) return;
    setTab(selected.condition === "used" ? "used" : "new");
    setBrand(selected.brand);
    setModel(selected.model);
  }, [selected]);

  const pool = useMemo(() => (listings ?? []).filter((l) => (tab === "used" ? l.condition === "used" : l.condition !== "used")), [listings, tab]);
  const brands = useMemo(() => [...new Set(pool.map((l) => l.brand))].sort(), [pool]);
  const models = useMemo(() => [...new Set(pool.filter((l) => l.brand === brand).map((l) => l.model))].sort(), [pool, brand]);
  const variants = useMemo(() => pool.filter((l) => l.brand === brand && l.model === model), [pool, brand, model]);
  const counts = {
    new: (listings ?? []).filter((l) => l.condition !== "used").length,
    used: (listings ?? []).filter((l) => l.condition === "used").length,
  };

  const pickFirst = (list: VehicleListing[]) => {
    if (list[0]) onSelect(list[0].id);
  };

  const missing = vehicle ? missingRequiredAngles(vehicle.angles, vehicle.condition) : [];

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold tracking-normal">Select vehicle</h2>
      <p className="text-xs text-muted-foreground">From your live inventory — details fill in automatically.</p>
      <div className="mt-3 grid grid-cols-2 rounded-lg border p-1 text-sm">
        {(["new", "used"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              const list = (listings ?? []).filter((l) => (t === "used" ? l.condition === "used" : l.condition !== "used"));
              setBrand(list[0]?.brand ?? "");
              setModel(list[0]?.model ?? "");
              pickFirst(list);
            }}
            className={cn("rounded-md py-1.5 font-medium", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {t === "new" ? "New cars" : "Used cars"} ({counts[t]})
          </button>
        ))}
      </div>

      {listings === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading inventory…</p>
      ) : pool.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          No {tab === "new" ? "new" : "used"} cars in your inventory yet.
          <Link to={inventoryPath} className="mt-2 block font-medium text-primary hover:underline">
            Add a vehicle
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Brand
            <select
              className={selectCls}
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                const list = pool.filter((l) => l.brand === e.target.value);
                setModel(list[0]?.model ?? "");
                pickFirst(list);
              }}
            >
              {!brand ? <option value="">Choose brand</option> : null}
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Model
            <select
              className={selectCls}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                pickFirst(pool.filter((l) => l.brand === brand && l.model === e.target.value));
              }}
            >
              {!model ? <option value="">Choose model</option> : null}
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Variant / stock
            <select className={selectCls} value={selectedId} onChange={(e) => onSelect(e.target.value)}>
              {!variants.some((v) => v.id === selectedId) ? <option value="">Choose variant</option> : null}
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.variant || "Standard", v.year, v.price > 0 ? formatLakh(v.price) : "", v.status !== "available" ? `(${v.status})` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {vehicle ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-3">
          <div className="flex gap-3">
            {vehicle.images[0] ? (
              <img src={vehicle.images[0]} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{`${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.trim()}</p>
              <p className="text-xs text-muted-foreground">
                {[vehicle.bodyType, vehicle.fuel, vehicle.transmission].filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm font-bold text-primary">{vehicle.priceOnRequest ? "Price on request" : formatLakh(vehicle.price)}</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {vehicle.specs.slice(0, 8).map((s) => (
              <div key={s.key} className="flex justify-between gap-2 border-b border-border/50 py-0.5">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="truncate font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            <Car className="mr-1 inline h-3 w-3" />
            {vehicle.images.length} photos · {vehicle.features.length} features · {vehicle.specs.length} specs
          </p>
          {missing.length ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Missing photos: {missing.map(photoAngleLabel).join(", ")} — add them for a complete poster.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            <Link to={vehicle.listingPath} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              View full details <ArrowRight className="inline h-3 w-3" />
            </Link>
            <Link to={inventoryPath} className="text-primary hover:underline">
              Edit in inventory
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
