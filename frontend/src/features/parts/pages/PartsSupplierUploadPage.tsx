import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { HubCategorySlug } from "@/features/marketplace/types";
import { insertPart, updatePartListing } from "../services/parts.service";
import { PART_CATEGORIES, PART_ORIGIN_LABELS } from "../types";
import type { PartCategorySlug, PartOrigin, PartProduct } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const HUBS: { id: HubCategorySlug; label: string }[] = [
  { id: "cars", label: "Cars" },
  { id: "bikes", label: "Bikes" },
  { id: "trucks", label: "Trucks" },
  { id: "buses", label: "Buses" },
  { id: "ev", label: "EV" },
  { id: "auto", label: "Auto" },
];

const selectCls = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm";

const initial = {
  name: "",
  brand: "",
  sku: "",
  hsn: "",
  price: "",
  mrp: "",
  wholesale: "",
  bulkMin: "1",
  stock: "10",
  gst: "18",
  image: "",
  compat: "",
  description: "",
};

function formFromPart(p: PartProduct): typeof initial {
  const uploaded = p.images.find((u) => /^(https:\/\/|\/uploads\/)/.test(u)) ?? "";
  return {
    name: p.name,
    brand: p.brand ?? "",
    sku: p.sku ?? "",
    hsn: p.hsnCode ?? "",
    price: String(p.price),
    mrp: p.mrp != null ? String(p.mrp) : "",
    wholesale: p.wholesalePrice != null ? String(p.wholesalePrice) : "",
    bulkMin: String(p.bulkMinQty ?? 1),
    stock: String(p.stock),
    gst: String(p.gstRate ?? 18),
    image: uploaded,
    compat: p.compatibility.join(", "),
    description: p.description ?? "",
  };
}

type UploadFormProps = {
  /** When set, the form edits this listing instead of creating a new one. */
  existing?: PartProduct;
  onSaved?: (part: PartProduct) => void;
};

export function PartsSupplierUploadPage({ existing, onSaved }: UploadFormProps = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [form, setForm] = useState(() => (existing ? formFromPart(existing) : initial));
  const [category, setCategory] = useState<PartCategorySlug>(existing?.categorySlug ?? "engine-parts");
  const [origin, setOrigin] = useState<PartOrigin>(existing?.partOrigin ?? "aftermarket");
  const [hubs, setHubs] = useState<HubCategorySlug[]>(existing ? existing.vehicleHubs ?? [] : ["cars"]);
  const [asDesk, setAsDesk] = useState(isAdmin && !existing);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<PartProduct | null>(null);

  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleHub = (h: HubCategorySlug) =>
    setHubs((list) => (list.includes(h) ? list.filter((x) => x !== h) : [...list, h]));

  const submit = async () => {
    if (!user) {
      toast.error("Log in as a parts seller");
      return;
    }
    const price = Number(form.price);
    const mrp = form.mrp ? Number(form.mrp) : undefined;
    const wholesale = form.wholesale ? Number(form.wholesale) : undefined;
    if (form.name.trim().length < 3) return toast.error("Enter the product name");
    if (!(price > 0)) return toast.error("Enter a selling price");
    if (mrp != null && mrp < price) return toast.error("MRP can't be lower than the selling price");
    if (wholesale != null && wholesale >= price) return toast.error("Wholesale price should be lower than the selling price");
    if (form.image && !/^(https:\/\/|\/uploads\/)/.test(form.image.trim())) return toast.error("Image URL must start with https://");

    if (existing) {
      const original = formFromPart(existing);
      const patch: Record<string, unknown> = {
        name: form.name.trim(),
        category,
        brand: form.brand.trim(),
        sku: form.sku.trim(),
        hsnCode: form.hsn.trim(),
        price,
        mrp: mrp ?? null,
        wholesalePrice: wholesale ?? null,
        bulkMinQty: Math.max(1, Math.floor(Number(form.bulkMin) || 1)),
        stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
        gstRate: Number(form.gst),
        partOrigin: origin,
        compatibility: form.compat.split(",").map((s) => s.trim()).filter(Boolean),
        description: form.description.trim(),
      };
      if (form.image.trim() !== original.image) patch.images = form.image.trim() ? [form.image.trim()] : [];
      if (JSON.stringify([...hubs].sort()) !== JSON.stringify([...(existing.vehicleHubs ?? [])].sort())) patch.vehicleHubs = hubs;
      setBusy(true);
      const { error, part } = await updatePartListing(existing.id, patch);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Product updated");
      if (part) onSaved?.(part);
      return;
    }

    setBusy(true);
    const { error, part } = await insertPart({
      name: form.name.trim(),
      category,
      brand: form.brand.trim() || undefined,
      sku: form.sku.trim() || undefined,
      hsnCode: form.hsn.trim() || undefined,
      price,
      mrp,
      wholesalePrice: wholesale,
      bulkMinQty: Math.max(1, Math.floor(Number(form.bulkMin) || 1)),
      stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
      gstRate: Number(form.gst),
      partOrigin: origin,
      vehicleHubs: hubs,
      images: form.image.trim() ? [form.image.trim()] : [],
      compatibility: form.compat.split(",").map((s) => s.trim()).filter(Boolean),
      description: form.description.trim() || undefined,
      asPartsDesk: isAdmin && asDesk,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product is live in the parts store");
    setCreated(part ?? null);
    setForm(initial);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {created && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
          <strong>{created.name}</strong> is live.{" "}
          <Link className="text-primary underline" to={`/parts/${created.categorySlug}/${created.slug}`}>View in store</Link>
        </div>
      )}
      <div className="space-y-5 rounded-xl border bg-card p-6">
        <div>
          <Label htmlFor="pu-name">Product name</Label>
          <Input id="pu-name" className="mt-1" value={form.name} onChange={set("name")} placeholder="e.g. Bosch Oil Filter F002H23887" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pu-cat">Category</Label>
            <select id="pu-cat" className={selectCls} value={category} onChange={(e) => setCategory(e.target.value as PartCategorySlug)}>
              {PART_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pu-origin">Part type</Label>
            <select id="pu-origin" className={selectCls} value={origin} onChange={(e) => setOrigin(e.target.value as PartOrigin)}>
              {(Object.keys(PART_ORIGIN_LABELS) as PartOrigin[]).map((o) => <option key={o} value={o}>{PART_ORIGIN_LABELS[o]}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pu-brand">Brand</Label>
            <Input id="pu-brand" className="mt-1" value={form.brand} onChange={set("brand")} />
          </div>
          <div>
            <Label htmlFor="pu-sku">SKU / part number</Label>
            <Input id="pu-sku" className="mt-1" value={form.sku} onChange={set("sku")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="pu-price">Selling price (₹, GST incl.)</Label>
            <Input id="pu-price" type="number" min={1} className="mt-1" value={form.price} onChange={set("price")} />
          </div>
          <div>
            <Label htmlFor="pu-mrp">MRP (₹)</Label>
            <Input id="pu-mrp" type="number" min={1} className="mt-1" value={form.mrp} onChange={set("mrp")} />
          </div>
          <div>
            <Label htmlFor="pu-gst">GST rate</Label>
            <select id="pu-gst" className={selectCls} value={form.gst} onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value }))}>
              {["0", "5", "12", "18", "28"].map((g) => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="pu-wholesale">Bulk price (₹/unit)</Label>
            <Input id="pu-wholesale" type="number" min={1} className="mt-1" value={form.wholesale} onChange={set("wholesale")} />
          </div>
          <div>
            <Label htmlFor="pu-bulk">Bulk from qty</Label>
            <Input id="pu-bulk" type="number" min={1} className="mt-1" value={form.bulkMin} onChange={set("bulkMin")} />
          </div>
          <div>
            <Label htmlFor="pu-stock">Stock qty</Label>
            <Input id="pu-stock" type="number" min={0} className="mt-1" value={form.stock} onChange={set("stock")} />
          </div>
        </div>

        <div>
          <Label>Vehicle types</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {HUBS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => toggleHub(h.id)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", hubs.includes(h.id) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pu-hsn">HSN code</Label>
            <Input id="pu-hsn" className="mt-1" maxLength={10} value={form.hsn} onChange={set("hsn")} placeholder="8708" />
          </div>
          <div>
            <Label htmlFor="pu-image">Image URL (optional)</Label>
            <Input id="pu-image" className="mt-1" value={form.image} onChange={set("image")} placeholder="https://…" />
          </div>
        </div>
        <div>
          <Label htmlFor="pu-compat">Compatible vehicles (comma separated)</Label>
          <Input id="pu-compat" className="mt-1" value={form.compat} onChange={set("compat")} placeholder="Maruti Swift, Hyundai i20, Tata Nexon" />
        </div>
        <div>
          <Label htmlFor="pu-desc">Description</Label>
          <Textarea id="pu-desc" className="mt-1" rows={3} maxLength={2000} value={form.description} onChange={set("description")} />
        </div>
        {isAdmin && !existing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={asDesk} onChange={(e) => setAsDesk(e.target.checked)} />
            List under <strong>Motorcart Parts Desk</strong> (platform-fulfilled)
          </label>
        )}
        <Button className="w-full" onClick={submit} disabled={busy || !form.name.trim()}>
          {existing ? (busy ? "Saving…" : "Save changes") : busy ? "Publishing…" : "Publish product"}
        </Button>
      </div>
    </div>
  );
}
