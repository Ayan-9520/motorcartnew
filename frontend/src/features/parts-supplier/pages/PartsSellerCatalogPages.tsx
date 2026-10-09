import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Download, Eye, EyeOff, FileSpreadsheet, Pencil, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import {
  bulkInsertParts,
  deletePartListing,
  updatePartListing,
  updatePartStock,
  type BulkPartRowResult,
  type PartListingInput,
} from "@/features/parts/services/parts.service";
import { PartsSupplierUploadPage as ProductForm } from "@/features/parts/pages/PartsSupplierUploadPage";
import { PART_CATEGORIES, PART_ORIGIN_LABELS } from "@/features/parts/types";
import type { PartCategorySlug, PartOrigin, PartProduct } from "@/features/parts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { PartsSupplierShell } from "../components/PartsSupplierShell";
import { PsEnterpriseTable } from "../components/PsEnterpriseTable";
import { LOW_STOCK_AT, useRefreshSellerData, useSellerParts } from "../hooks/useSellerPanelData";

const CATEGORY_LABEL = Object.fromEntries(PART_CATEGORIES.map((c) => [c.slug, c.label])) as Record<PartCategorySlug, string>;
const selectCls = "h-10 rounded-md border bg-background px-3 text-sm";

function StatusBadge({ part }: { part: PartProduct }) {
  if (!part.isActive) return <span className="psp-badge">Hidden</span>;
  if (part.stock <= 0) return <span className="psp-badge psp-badge--danger">Out of stock</span>;
  if (part.stock <= LOW_STOCK_AT) return <span className="psp-badge psp-badge--warning">Low stock</span>;
  return <span className="psp-badge psp-badge--success">Live</span>;
}

function PartCell({ part }: { part: PartProduct }) {
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <img src={part.images[0]} alt="" className="h-10 w-10 shrink-0 rounded-md border object-cover" loading="lazy" />
      <div className="min-w-0">
        <p className="truncate font-medium">{part.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {part.sku ? `SKU ${part.sku}` : "No SKU"} · {CATEGORY_LABEL[part.categorySlug] ?? part.categorySlug}
        </p>
      </div>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="psp-panel text-center">
      <p className="font-semibold">No products yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Add your first part or upload your full catalogue from Excel.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild className="rounded-xl">
          <Link to="/dashboard/parts/upload">Add product</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/dashboard/parts/bulk-upload">Bulk upload</Link>
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* All products                                                         */
/* ------------------------------------------------------------------ */

type ProductTab = "all" | "live" | "hidden" | "out";

export function PsProductsPage() {
  const { data: parts, isLoading } = useSellerParts();
  const refresh = useRefreshSellerData();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const tab = (params.get("status") as ProductTab | null) ?? "all";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";

  useEffect(() => setPageMeta({ title: "All products" }), []);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => parts ?? [], [parts]);
  const brands = useMemo(() => [...new Set(list.map((p) => p.brand).filter((b): b is string => !!b))].sort(), [list]);
  const counts = {
    all: list.length,
    live: list.filter((p) => p.isActive && p.stock > 0).length,
    hidden: list.filter((p) => !p.isActive).length,
    out: list.filter((p) => p.stock <= 0).length,
  };
  const needle = q.trim().toLowerCase();
  const rows = list.filter((p) => {
    if (tab === "live" && !(p.isActive && p.stock > 0)) return false;
    if (tab === "hidden" && p.isActive) return false;
    if (tab === "out" && p.stock > 0) return false;
    if (category && p.categorySlug !== category) return false;
    if (brand && (p.brand ?? "") !== brand) return false;
    if (needle && ![p.name, p.sku, p.brand, p.hsnCode].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });

  const toggleVisibility = async (p: PartProduct) => {
    setBusyId(p.id);
    const { error } = await updatePartListing(p.id, { isActive: !p.isActive });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(p.isActive ? "Hidden from the store" : "Visible in the store again");
    refresh();
  };

  const remove = async (p: PartProduct) => {
    if (!window.confirm(`Delete "${p.name}"? Customers will no longer see it.`)) return;
    setBusyId(p.id);
    const { error, archived } = await deletePartListing(p.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(archived ? "Deleted — kept only in past orders & invoices" : "Product deleted");
    refresh();
  };

  return (
    <PartsSupplierShell
      title="All products"
      description="Edit, hide or delete your listings. Hidden products stay in your panel but are not shown to buyers."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/dashboard/parts/bulk-upload">
              <Upload className="mr-1 h-4 w-4" /> Bulk upload
            </Link>
          </Button>
          <Button className="rounded-xl" asChild>
            <Link to="/dashboard/parts/upload">Add product</Link>
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["live", "Live"],
            ["hidden", "Hidden"],
            ["out", "Out of stock"],
          ] as [ProductTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setParam("status", id === "all" ? "" : id)}
            className={cn("psp-pipeline-pill", tab === id && "ring-2 ring-primary")}
          >
            {label}: <strong>{counts[id]}</strong>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name, SKU, brand, HSN" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={selectCls} value={category} onChange={(e) => setParam("category", e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {PART_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <select className={selectCls} value={brand} onChange={(e) => setParam("brand", e.target.value)} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading products…</p>
      ) : list.length === 0 ? (
        <EmptyCatalog />
      ) : (
        <PsEnterpriseTable
          rows={rows}
          rowKey={(p) => p.id}
          empty="No products match these filters"
          columns={[
            { key: "part", header: "Product", cell: (p) => <PartCell part={p} /> },
            { key: "brand", header: "Brand", cell: (p) => p.brand ?? "—" },
            {
              key: "price",
              header: "Price",
              cell: (p) => (
                <div>
                  <p className="font-medium">{formatCurrency(p.price)}</p>
                  {p.mrp && p.mrp > p.price ? <p className="text-xs text-muted-foreground line-through">{formatCurrency(p.mrp)}</p> : null}
                </div>
              ),
            },
            { key: "stock", header: "Stock", cell: (p) => p.stock },
            { key: "status", header: "Status", cell: (p) => <StatusBadge part={p} /> },
            {
              key: "actions",
              header: "",
              cell: (p) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" className="rounded-lg" asChild>
                    <Link to={`/dashboard/parts/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={busyId === p.id}
                    onClick={() => void toggleVisibility(p)}
                    aria-label={p.isActive ? `Hide ${p.name}` : `Show ${p.name}`}
                    title={p.isActive ? "Hide from store" : "Show in store"}
                  >
                    {p.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-destructive"
                    disabled={busyId === p.id}
                    onClick={() => void remove(p)}
                    aria-label={`Delete ${p.name}`}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Edit product                                                         */
/* ------------------------------------------------------------------ */

export function PsEditProductPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const refresh = useRefreshSellerData();
  const { data: parts, isLoading } = useSellerParts();
  const part = parts?.find((p) => p.id === id);

  useEffect(() => setPageMeta({ title: "Edit product" }), []);

  return (
    <PartsSupplierShell
      title="Edit product"
      description={part?.name}
      crumbs={[{ label: "All products", href: "/dashboard/parts/catalog" }, { label: "Edit" }]}
      actions={
        part ? (
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={`/parts/${part.categorySlug}/${part.slug}`} target="_blank" rel="noreferrer">
              View in store
            </Link>
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading product…</p>
      ) : !part ? (
        <div className="psp-panel text-center">
          <p className="font-semibold">Product not found</p>
          <Button asChild variant="link">
            <Link to="/dashboard/parts/catalog">Back to all products</Link>
          </Button>
        </div>
      ) : (
        <ProductForm
          key={part.id}
          existing={part}
          onSaved={() => {
            refresh();
            navigate("/dashboard/parts/catalog");
          }}
        />
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Stock (all / low / out)                                              */
/* ------------------------------------------------------------------ */

type StockView = "all" | "low" | "out";

const STOCK_COPY: Record<StockView, { title: string; desc: string; empty: string }> = {
  all: { title: "Stock & SKUs", desc: "Update quantities as you receive or sell stock offline.", empty: "No products yet" },
  low: {
    title: "Low stock",
    desc: `Products with ${LOW_STOCK_AT} or fewer units left — restock before they sell out.`,
    empty: "No low-stock products 🎉",
  },
  out: { title: "Out of stock", desc: "Buyers can't order these until you add stock.", empty: "Nothing is out of stock" },
};

export function PsStockPage({ view = "all" }: { view?: StockView }) {
  const { data: parts, isLoading } = useSellerParts();
  const refresh = useRefreshSellerData();
  const [q, setQ] = useState("");
  const copy = STOCK_COPY[view];

  useEffect(() => setPageMeta({ title: copy.title }), [copy.title]);

  const needle = q.trim().toLowerCase();
  const rows = (parts ?? [])
    .filter((p) => (view === "low" ? p.stock > 0 && p.stock <= LOW_STOCK_AT : view === "out" ? p.stock <= 0 : true))
    .filter((p) => !needle || [p.name, p.sku, p.brand].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => a.stock - b.stock);

  const save = async (p: PartProduct, stock: number) => {
    if (!(stock >= 0)) return toast.error("Stock must be 0 or more");
    const { error } = await updatePartStock(p.id, Math.floor(stock));
    if (error) return toast.error(error.message);
    toast.success(`Stock for ${p.name} set to ${Math.floor(stock)}`);
    refresh();
  };

  return (
    <PartsSupplierShell title={copy.title} description={copy.desc}>
      <Input className="mb-4 max-w-xs" placeholder="Search name, SKU, brand" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? (
        <p className="text-muted-foreground">Loading stock…</p>
      ) : (parts ?? []).length === 0 ? (
        <EmptyCatalog />
      ) : (
        <PsEnterpriseTable
          rows={rows}
          rowKey={(p) => `${p.id}-${p.stock}`}
          empty={copy.empty}
          columns={[
            { key: "part", header: "Product", cell: (p) => <PartCell part={p} /> },
            { key: "price", header: "Price", cell: (p) => formatCurrency(p.price) },
            { key: "value", header: "Stock value", cell: (p) => formatCurrency(p.price * Math.max(0, p.stock)) },
            { key: "status", header: "Status", cell: (p) => <StatusBadge part={p} /> },
            { key: "stock", header: "Units in stock", cell: (p) => <StockEditor part={p} onSave={save} /> },
          ]}
        />
      )}
    </PartsSupplierShell>
  );
}

function StockEditor({ part, onSave }: { part: PartProduct; onSave: (p: PartProduct, stock: number) => Promise<unknown> }) {
  const [value, setValue] = useState(String(part.stock));
  const [busy, setBusy] = useState(false);
  const dirty = Number(value) !== part.stock;
  const submit = async () => {
    setBusy(true);
    await onSave(part, Number(value));
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        className="w-24"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && void submit()}
        aria-label={`Stock for ${part.name}`}
      />
      <Button size="sm" variant={dirty ? "default" : "outline"} className="rounded-lg" disabled={!dirty || busy} onClick={() => void submit()}>
        Save
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                              */
/* ------------------------------------------------------------------ */

export function PsPricingPage() {
  const { data: parts, isLoading } = useSellerParts();
  const refresh = useRefreshSellerData();
  const [q, setQ] = useState("");

  useEffect(() => setPageMeta({ title: "Pricing" }), []);

  const needle = q.trim().toLowerCase();
  const rows = (parts ?? []).filter((p) => !needle || [p.name, p.sku, p.brand].join(" ").toLowerCase().includes(needle));

  return (
    <PartsSupplierShell
      title="Pricing"
      description="Selling price (GST inclusive), MRP, bulk price for workshops & garages, and GST rate — changes go live immediately."
    >
      <Input className="mb-4 max-w-xs" placeholder="Search name, SKU, brand" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? (
        <p className="text-muted-foreground">Loading prices…</p>
      ) : (parts ?? []).length === 0 ? (
        <EmptyCatalog />
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <PriceRow key={`${p.id}-${p.price}-${p.mrp}-${p.wholesalePrice}-${p.bulkMinQty}-${p.gstRate}`} part={p} onSaved={refresh} />
          ))}
          {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No products match</p> : null}
        </div>
      )}
    </PartsSupplierShell>
  );
}

function PriceRow({ part, onSaved }: { part: PartProduct; onSaved: () => void }) {
  const [f, setF] = useState({
    price: String(part.price),
    mrp: part.mrp != null ? String(part.mrp) : "",
    wholesale: part.wholesalePrice != null ? String(part.wholesalePrice) : "",
    bulkMin: String(part.bulkMinQty),
    gst: String(part.gstRate),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const price = Number(f.price);
  const mrp = f.mrp ? Number(f.mrp) : null;
  const wholesale = f.wholesale ? Number(f.wholesale) : null;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const save = async () => {
    if (!(price > 0)) return toast.error("Enter a selling price");
    if (mrp != null && mrp < price) return toast.error("MRP can't be lower than the selling price");
    if (wholesale != null && wholesale >= price) return toast.error("Bulk price should be lower than the selling price");
    setBusy(true);
    const { error } = await updatePartListing(part.id, {
      price,
      mrp,
      wholesalePrice: wholesale,
      bulkMinQty: Math.max(1, Math.floor(Number(f.bulkMin) || 1)),
      gstRate: Number(f.gst),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Prices updated for ${part.name}`);
    onSaved();
  };

  return (
    <div className="psp-panel flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <PartCell part={part} />
      </div>
      <label className="text-xs text-muted-foreground">
        Selling ₹
        <Input type="number" min={1} className="mt-1 w-28" value={f.price} onChange={set("price")} />
      </label>
      <label className="text-xs text-muted-foreground">
        MRP ₹
        <Input type="number" min={1} className="mt-1 w-28" value={f.mrp} onChange={set("mrp")} />
      </label>
      <label className="text-xs text-muted-foreground">
        Bulk ₹/unit
        <Input type="number" min={1} className="mt-1 w-28" value={f.wholesale} onChange={set("wholesale")} />
      </label>
      <label className="text-xs text-muted-foreground">
        Bulk from qty
        <Input type="number" min={1} className="mt-1 w-24" value={f.bulkMin} onChange={set("bulkMin")} />
      </label>
      <label className="text-xs text-muted-foreground">
        GST
        <select className={cn(selectCls, "mt-1 block w-24")} value={f.gst} onChange={set("gst")}>
          {["0", "5", "12", "18", "28"].map((g) => (
            <option key={g} value={g}>
              {g}%
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col items-end gap-1">
        {discount > 0 ? <span className="text-xs font-medium text-primary">{discount}% off MRP</span> : null}
        <Button size="sm" className="rounded-lg" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categories & brands                                                  */
/* ------------------------------------------------------------------ */

type Group = { key: string; label: string; total: number; live: number; units: number; value: number; href: string };

function groupParts(parts: PartProduct[], keyOf: (p: PartProduct) => string, labelOf: (k: string) => string, param: string): Group[] {
  const map = new Map<string, Group>();
  for (const p of parts) {
    const k = keyOf(p);
    const g = map.get(k) ?? { key: k, label: labelOf(k), total: 0, live: 0, units: 0, value: 0, href: `/dashboard/parts/catalog?${param}=${encodeURIComponent(k)}` };
    g.total += 1;
    if (p.isActive && p.stock > 0) g.live += 1;
    g.units += Math.max(0, p.stock);
    g.value += p.price * Math.max(0, p.stock);
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

const groupColumns = [
  { key: "label", header: "Name", cell: (g: Group) => <Link to={g.href} className="font-medium text-primary hover:underline">{g.label}</Link> },
  { key: "total", header: "Products", cell: (g: Group) => g.total },
  { key: "live", header: "Live", cell: (g: Group) => g.live },
  { key: "units", header: "Units in stock", cell: (g: Group) => g.units },
  { key: "value", header: "Stock value", cell: (g: Group) => formatCurrency(g.value) },
];

export function PsCategoriesPage() {
  const { data: parts, isLoading } = useSellerParts();
  useEffect(() => setPageMeta({ title: "Categories" }), []);
  const rows = groupParts(parts ?? [], (p) => p.categorySlug, (k) => CATEGORY_LABEL[k as PartCategorySlug] ?? k, "category");
  return (
    <PartsSupplierShell title="Categories" description="How your catalogue is spread across store categories. Click a category to manage its products.">
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (parts ?? []).length === 0 ? <EmptyCatalog /> : (
        <PsEnterpriseTable rows={rows} rowKey={(g) => g.key} columns={groupColumns} />
      )}
    </PartsSupplierShell>
  );
}

export function PsBrandsPage() {
  const { data: parts, isLoading } = useSellerParts();
  useEffect(() => setPageMeta({ title: "Brands" }), []);
  const rows = groupParts(parts ?? [], (p) => p.brand ?? "", (k) => k || "Unbranded", "brand");
  return (
    <PartsSupplierShell title="Brands" description="Brands you sell. Click a brand to manage its products.">
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (parts ?? []).length === 0 ? <EmptyCatalog /> : (
        <PsEnterpriseTable rows={rows} rowKey={(g) => g.key || "unbranded"} columns={groupColumns} />
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Excel bulk upload                                                    */
/* ------------------------------------------------------------------ */

const TEMPLATE_HEADERS = [
  "name",
  "category",
  "brand",
  "sku",
  "hsn_code",
  "price",
  "mrp",
  "wholesale_price",
  "bulk_min_qty",
  "stock",
  "gst_rate",
  "part_origin",
  "vehicle_types",
  "compatibility",
  "image_url",
  "description",
] as const;

const TEMPLATE_SAMPLE: Record<(typeof TEMPLATE_HEADERS)[number], string | number> = {
  name: "Bosch Oil Filter F002H23887",
  category: "engine-parts",
  brand: "Bosch",
  sku: "F002H23887",
  hsn_code: "8421",
  price: 349,
  mrp: 420,
  wholesale_price: 299,
  bulk_min_qty: 10,
  stock: 50,
  gst_rate: 18,
  part_origin: "aftermarket",
  vehicle_types: "cars",
  compatibility: "Maruti Swift, Maruti Dzire, Maruti Baleno",
  image_url: "",
  description: "Spin-on oil filter, change every 10,000 km.",
};

const HUBS = new Set(["cars", "bikes", "trucks", "buses", "ev", "auto"]);
const ORIGIN_ALIASES: Record<string, PartOrigin> = {
  oem: "oem",
  genuine: "oem",
  "oem genuine": "oem",
  aftermarket: "aftermarket",
  "after market": "aftermarket",
  "genuine accessory": "genuine_accessory",
  genuine_accessory: "genuine_accessory",
  accessory: "genuine_accessory",
};

function normKey(k: string) {
  return k.toLowerCase().replace(/\*/g, "").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function resolveCategory(v: string): PartCategorySlug | null {
  const s = v.trim().toLowerCase();
  const hit = PART_CATEGORIES.find((c) => c.slug === s || c.label.toLowerCase() === s || c.slug.replace(/-/g, " ") === s);
  return hit?.slug ?? null;
}

type ParsedRow = { line: number; input: Partial<PartListingInput>; errors: string[] };

function parseSheetRow(raw: Record<string, unknown>, line: number): ParsedRow {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) r[normKey(k)] = v == null ? "" : String(v).trim();
  const errors: string[] = [];
  const name = r.name || r.product_name || r.part_name || "";
  if (name.length < 3) errors.push("name missing");
  const category = resolveCategory(r.category || "");
  if (!category) errors.push("unknown category");
  const price = Number(r.price || r.selling_price);
  if (!(price >= 1)) errors.push("price missing");
  const stock = r.stock === "" || r.stock == null ? NaN : Number(r.stock);
  if (!(stock >= 0)) errors.push("stock missing");
  const mrp = r.mrp ? Number(r.mrp) : undefined;
  if (mrp != null && !(mrp >= price)) errors.push("MRP below price");
  const wholesale = r.wholesale_price || r.bulk_price ? Number(r.wholesale_price || r.bulk_price) : undefined;
  if (wholesale != null && !(wholesale > 0 && wholesale < price)) errors.push("bulk price must be below price");
  const gst = r.gst_rate ? Number(String(r.gst_rate).replace("%", "")) : 18;
  if (![0, 5, 12, 18, 28].includes(gst)) errors.push("GST must be 0/5/12/18/28");
  const originKey = (r.part_origin || r.part_type || "aftermarket").toLowerCase();
  const partOrigin = ORIGIN_ALIASES[originKey];
  if (!partOrigin) errors.push("part_origin must be OEM / aftermarket / genuine accessory");
  const image = r.image_url || r.image || "";
  if (image && !/^(https:\/\/|\/uploads\/)/.test(image)) errors.push("image_url must start with https://");
  const hubs = (r.vehicle_types || "").split(/[,;/]/).map((h) => h.trim().toLowerCase()).filter((h) => HUBS.has(h));
  return {
    line,
    errors,
    input: {
      name,
      category: category ?? undefined,
      brand: r.brand || undefined,
      sku: r.sku || r.part_number || undefined,
      hsnCode: r.hsn_code || r.hsn || undefined,
      price,
      mrp,
      wholesalePrice: wholesale,
      bulkMinQty: r.bulk_min_qty ? Math.max(1, Math.floor(Number(r.bulk_min_qty) || 1)) : undefined,
      stock: Math.floor(stock),
      gstRate: gst,
      partOrigin,
      vehicleHubs: hubs.length ? (hubs as PartListingInput["vehicleHubs"]) : undefined,
      compatibility: (r.compatibility || "").split(",").map((s) => s.trim()).filter(Boolean),
      images: image ? [image] : undefined,
      description: r.description || undefined,
    },
  };
}

export function PsBulkUploadPage() {
  const refresh = useRefreshSellerData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkPartRowResult[] | null>(null);

  useEffect(() => setPageMeta({ title: "Bulk upload" }), []);

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet([TEMPLATE_SAMPLE], { header: [...TEMPLATE_HEADERS] });
    const help = XLSX.utils.aoa_to_sheet([
      ["Column", "Required", "Allowed values"],
      ["name", "Yes", "Product name (min 3 letters)"],
      ["category", "Yes", PART_CATEGORIES.map((c) => c.slug).join(", ")],
      ["price", "Yes", "Selling price in ₹, GST inclusive"],
      ["stock", "Yes", "Units available (0 or more)"],
      ["mrp", "No", "Must be ≥ price"],
      ["wholesale_price / bulk_min_qty", "No", "Bulk price per unit (below price) from this quantity"],
      ["gst_rate", "No", "0, 5, 12, 18 (default) or 28"],
      ["part_origin", "No", "oem, aftermarket (default), genuine accessory"],
      ["vehicle_types", "No", "cars, bikes, trucks, buses, ev, auto (comma separated; blank = all)"],
      ["compatibility", "No", "Compatible models, comma separated"],
      ["image_url", "No", "https:// link to the product photo"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Parts");
    XLSX.utils.book_append_sheet(wb, help, "Instructions");
    XLSX.writeFile(wb, "motorcart-parts-upload-template.xlsx");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setResults(null);
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed = json
        .map((raw, i) => {
          const rowNum = (raw as { __rowNum__?: number }).__rowNum__;
          return { raw, line: typeof rowNum === "number" ? rowNum + 1 : i + 2 };
        })
        .filter(({ raw }) => Object.values(raw).some((v) => String(v ?? "").trim() !== ""))
        .map(({ raw, line }) => parseSheetRow(raw, line));
      if (!parsed.length) toast.error("No product rows found in the first sheet");
      if (parsed.length > 500) toast.error("Upload at most 500 products per file");
      setRows(parsed.slice(0, 500));
    } catch {
      toast.error("Could not read this file — use the .xlsx template");
      setRows([]);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const valid = rows.filter((r) => r.errors.length === 0);

  const upload = async () => {
    if (!valid.length) return;
    setBusy(true);
    const res = await bulkInsertParts(valid.map((r) => r.input));
    setBusy(false);
    if (res.error) return toast.error(res.error);
    const mapped = res.results.map((r) => ({ ...r, row: valid[r.row - 1]?.line ?? r.row }));
    setResults(mapped);
    if (res.created) toast.success(`${res.created} product${res.created === 1 ? "" : "s"} published`);
    if (res.failed) toast.error(`${res.failed} row${res.failed === 1 ? "" : "s"} failed — see below`);
    refresh();
  };

  return (
    <PartsSupplierShell
      title="Bulk upload"
      description="Upload your full catalogue from Excel — up to 500 products per file. Products go live as soon as they are imported."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="psp-panel">
          <h3 className="psp-panel__title flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> 1. Download the template
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">One row per product. The second sheet explains every column.</p>
          <Button variant="outline" className="mt-3 rounded-xl" onClick={() => void downloadTemplate()}>
            <Download className="mr-1 h-4 w-4" /> Download Excel template
          </Button>
        </section>
        <section className="psp-panel">
          <h3 className="psp-panel__title flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> 2. Upload your filled sheet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">.xlsx, .xls or .csv — we check every row before publishing.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button className="mt-3 rounded-xl" onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          {fileName ? <p className="mt-2 text-xs text-muted-foreground">{fileName}</p> : null}
        </section>
      </div>

      {rows.length > 0 && !results ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <strong>{valid.length}</strong> ready · <strong className="text-destructive">{rows.length - valid.length}</strong> with errors
            </p>
            <Button className="rounded-xl" disabled={busy || !valid.length} onClick={() => void upload()}>
              {busy ? "Publishing…" : `Publish ${valid.length} product${valid.length === 1 ? "" : "s"}`}
            </Button>
          </div>
          <PsEnterpriseTable
            rows={rows}
            rowKey={(r) => String(r.line)}
            columns={[
              { key: "line", header: "Row", cell: (r) => r.line },
              { key: "name", header: "Product", cell: (r) => r.input.name || "—" },
              { key: "cat", header: "Category", cell: (r) => (r.input.category ? CATEGORY_LABEL[r.input.category] : "—") },
              { key: "price", header: "Price", cell: (r) => (r.input.price && r.input.price > 0 ? formatCurrency(r.input.price) : "—") },
              { key: "stock", header: "Stock", cell: (r) => (Number.isFinite(r.input.stock) ? r.input.stock : "—") },
              {
                key: "check",
                header: "Check",
                cell: (r) =>
                  r.errors.length ? (
                    <span className="text-xs text-destructive">{r.errors.join(", ")}</span>
                  ) : (
                    <span className="psp-badge psp-badge--success">OK</span>
                  ),
              },
            ]}
          />
        </section>
      ) : null}

      {results ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              Published <strong>{results.filter((r) => r.ok).length}</strong> · failed{" "}
              <strong className="text-destructive">{results.filter((r) => !r.ok).length}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => { setRows([]); setResults(null); setFileName(""); }}>
                Upload another file
              </Button>
              <Button className="rounded-xl" asChild>
                <Link to="/dashboard/parts/catalog">View products</Link>
              </Button>
            </div>
          </div>
          <PsEnterpriseTable
            rows={results}
            rowKey={(r) => `${r.row}-${r.id ?? "x"}`}
            columns={[
              { key: "row", header: "Row", cell: (r) => r.row },
              { key: "name", header: "Product", cell: (r) => r.name ?? "—" },
              {
                key: "result",
                header: "Result",
                cell: (r) =>
                  r.ok ? (
                    <span className="psp-badge psp-badge--success">Published</span>
                  ) : (
                    <span className="text-xs text-destructive">{r.error}</span>
                  ),
              },
            ]}
          />
        </section>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        Allowed origins: {Object.values(PART_ORIGIN_LABELS).join(", ")}. Duplicate names get a unique store link automatically.
      </p>
    </PartsSupplierShell>
  );
}
