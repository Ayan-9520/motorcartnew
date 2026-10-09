import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, CheckCheck, Download, PackagePlus, ShieldCheck, Star, Upload, Warehouse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchSellerPartReviews } from "@/features/parts/services/parts.service";
import { PART_ORDER_STATUS_LABELS } from "@/features/parts/lib/order-status";
import type { PartOrder, PartOrderStatus } from "@/features/parts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { PartsSupplierShell } from "../components/PartsSupplierShell";
import { PsEnterpriseTable } from "../components/PsEnterpriseTable";
import { PsMetricGrid } from "../components/PsMetricGrid";
import type { PsMetric } from "../types";
import {
  LOW_STOCK_AT,
  downloadCsv,
  myLines,
  myOrderMoney,
  orderBuyer,
  round2,
  useMySellerIds,
  useSellerOrders,
  useSellerParts,
} from "../hooks/useSellerPanelData";

const DAY = 86_400_000;

const STAGE_LINKS: { status: PartOrderStatus; label: string; to: string }[] = [
  { status: "pending", label: "New", to: "/dashboard/parts/orders/new" },
  { status: "confirmed", label: "To pack", to: "/dashboard/parts/orders/processing" },
  { status: "packed", label: "To ship", to: "/dashboard/parts/orders/packed" },
  { status: "shipped", label: "In transit", to: "/dashboard/parts/orders/dispatched" },
  { status: "delivered", label: "Delivered", to: "/dashboard/parts/orders/delivered" },
  { status: "cancelled", label: "Cancelled", to: "/dashboard/parts/orders/cancelled" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusPill({ status }: { status: PartOrderStatus }) {
  const tone =
    status === "delivered" ? "psp-badge--success" : status === "cancelled" ? "psp-badge--danger" : status === "pending" ? "psp-badge--warning" : "";
  return <span className={cn("psp-badge", tone)}>{PART_ORDER_STATUS_LABELS[status]}</span>;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export function PsDashboardPage() {
  const { user } = useAuth();
  const mine = useMySellerIds();
  const { data: parts, isLoading: partsLoading } = useSellerParts();
  const { data: orders, isLoading: ordersLoading } = useSellerOrders();

  useEffect(() => setPageMeta({ title: "Seller dashboard" }), []);

  const loading = partsLoading || ordersLoading;
  const p = parts ?? [];
  const o = orders ?? [];
  const now = Date.now();
  const last30 = o.filter((x) => now - new Date(x.createdAt).getTime() <= 30 * DAY && x.status !== "cancelled");
  const sales30 = last30.reduce((t, x) => t + myOrderMoney(x, mine).total, 0);
  const count = (s: PartOrderStatus) => o.filter((x) => x.status === s).length;
  const today = o.filter((x) => new Date(x.createdAt).toDateString() === new Date().toDateString()).length;
  const low = p.filter((x) => x.stock > 0 && x.stock <= LOW_STOCK_AT);
  const out = p.filter((x) => x.stock <= 0);
  const rated = p.filter((x) => x.reviewCount > 0);
  const avgRating = rated.length ? rated.reduce((t, x) => t + x.rating * x.reviewCount, 0) / rated.reduce((t, x) => t + x.reviewCount, 0) : 0;

  const metrics: PsMetric[] = [
    { key: "new", label: "New orders", value: count("pending"), sublabel: "Confirm within 24h", href: "/dashboard/parts/orders/new", variant: count("pending") ? "warning" : "default" },
    { key: "pack", label: "To pack", value: count("confirmed"), href: "/dashboard/parts/orders/processing" },
    { key: "ship", label: "To ship", value: count("packed"), href: "/dashboard/parts/orders/packed" },
    { key: "sales", label: "Sales · 30 days", value: formatCurrency(sales30), sublabel: `${last30.length} orders`, href: "/dashboard/parts/finance/revenue", variant: "premium" },
    { key: "today", label: "Orders today", value: today, href: "/dashboard/parts/orders" },
    { key: "live", label: "Live products", value: p.filter((x) => x.isActive && x.stock > 0).length, sublabel: `${p.length} total`, href: "/dashboard/parts/catalog", variant: "success" },
    { key: "low", label: "Low stock", value: low.length, sublabel: `≤ ${LOW_STOCK_AT} units`, href: "/dashboard/parts/low-stock", variant: low.length ? "warning" : "default" },
    { key: "out", label: "Out of stock", value: out.length, href: "/dashboard/parts/out-of-stock", variant: out.length ? "warning" : "default" },
    { key: "rating", label: "Avg rating", value: avgRating ? avgRating.toFixed(1) : "—", sublabel: `${rated.reduce((t, x) => t + x.reviewCount, 0)} reviews`, href: "/dashboard/parts/reviews" },
  ];

  return (
    <PartsSupplierShell
      title={`Welcome${user?.companyName || user?.fullName ? `, ${user?.companyName || user?.fullName}` : ""}`}
      description="Your parts store at a glance — orders that need action, sales and stock."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/dashboard/parts/bulk-upload">
              <Upload className="mr-1 h-4 w-4" /> Bulk upload
            </Link>
          </Button>
          <Button className="rounded-xl" asChild>
            <Link to="/dashboard/parts/upload">
              <PackagePlus className="mr-1 h-4 w-4" /> Add product
            </Link>
          </Button>
        </div>
      }
    >
      {!loading && p.length === 0 ? (
        <div className="psp-panel mb-6">
          <p className="font-semibold">Start selling in 3 steps</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Add products one by one or upload your catalogue from Excel.</li>
            <li>Set stock and prices — products go live in the MotorCart parts store instantly.</li>
            <li>Confirm, pack and ship orders from the Orders menu; buyers are notified at every step.</li>
          </ol>
        </div>
      ) : null}

      <PsMetricGrid metrics={metrics} loading={loading} />

      <div className="mt-6 flex flex-wrap gap-2">
        {STAGE_LINKS.map((s) => (
          <Link key={s.status} to={s.to} className="psp-pipeline-pill">
            {s.label}: <strong>{count(s.status)}</strong>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="psp-panel">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="psp-panel__title">Recent orders</h3>
            <Link to="/dashboard/parts/orders" className="text-sm text-primary hover:underline">
              All orders
            </Link>
          </div>
          {o.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet. They appear here the moment a buyer checks out.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {o.slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link to={`/dashboard/parts/orders/${x.id}`} className="font-medium text-primary hover:underline">
                      {x.invoiceNumber ?? x.id.slice(0, 8)}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {orderBuyer(x).name} · {fmtDate(x.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span>{formatCurrency(myOrderMoney(x, mine).total)}</span>
                    <StatusPill status={x.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="psp-panel">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="psp-panel__title flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" /> Restock soon
            </h3>
            <Link to="/dashboard/parts/inventory" className="text-sm text-primary hover:underline">
              Update stock
            </Link>
          </div>
          {[...out, ...low].length === 0 ? (
            <p className="text-sm text-muted-foreground">All products have healthy stock.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {[...out, ...low].slice(0, 6).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/dashboard/parts/products/${x.id}/edit`} className="truncate hover:underline">
                    {x.name}
                  </Link>
                  <span className={cn("psp-badge shrink-0", x.stock <= 0 ? "psp-badge--danger" : "psp-badge--warning")}>
                    {x.stock <= 0 ? "Out of stock" : `${x.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Revenue & collections                                                */
/* ------------------------------------------------------------------ */

const RANGES = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "365", label: "1 year", days: 365 },
  { id: "all", label: "All time", days: 0 },
] as const;

function inRange(o: PartOrder, days: number) {
  return !days || Date.now() - new Date(o.createdAt).getTime() <= days * DAY;
}

export function PsRevenuePage() {
  const mine = useMySellerIds();
  const { data: orders, isLoading } = useSellerOrders();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");

  useEffect(() => setPageMeta({ title: "Revenue & collections" }), []);

  const days = RANGES.find((r) => r.id === range)?.days ?? 0;
  const list = (orders ?? []).filter((o) => inRange(o, days));
  const sum = (filter: (o: PartOrder) => boolean) => list.filter(filter).reduce((t, o) => t + myOrderMoney(o, mine).total, 0);
  const active = list.filter((o) => o.status !== "cancelled");
  const gross = sum((o) => o.status !== "cancelled");
  const gst = active.reduce((t, o) => t + myOrderMoney(o, mine).gst, 0);
  const units = active.reduce((t, o) => t + myOrderMoney(o, mine).units, 0);

  const metrics: PsMetric[] = [
    { key: "gross", label: "Gross sales", value: formatCurrency(gross), sublabel: `${active.length} orders`, variant: "premium" },
    { key: "delivered", label: "Delivered (collected)", value: formatCurrency(sum((o) => o.status === "delivered")), variant: "success" },
    { key: "transit", label: "In transit", value: formatCurrency(sum((o) => o.status === "shipped")), sublabel: "COD with courier" },
    { key: "pending", label: "Awaiting dispatch", value: formatCurrency(sum((o) => ["pending", "confirmed", "packed"].includes(o.status))) },
    { key: "cancelled", label: "Cancelled", value: formatCurrency(sum((o) => o.status === "cancelled")), variant: "warning" },
    { key: "gst", label: "GST collected", value: formatCurrency(gst) },
    { key: "units", label: "Units sold", value: units },
    { key: "aov", label: "Avg order value", value: formatCurrency(active.length ? gross / active.length : 0) },
  ];

  const months = useMemo(() => {
    const map = new Map<string, { key: string; label: string; orders: number; units: number; taxable: number; gst: number; total: number; cancelled: number }>();
    for (const o of list) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = map.get(key) ?? { key, label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), orders: 0, units: 0, taxable: 0, gst: 0, total: 0, cancelled: 0 };
      const money = myOrderMoney(o, mine);
      if (o.status === "cancelled") m.cancelled += money.total;
      else {
        m.orders += 1;
        m.units += money.units;
        m.taxable += money.taxable;
        m.gst += money.gst;
        m.total += money.total;
      }
      map.set(key, m);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [list, mine]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; units: number; total: number }>();
    for (const o of active) {
      for (const l of myLines(o, mine)) {
        const row = map.get(l.partId) ?? { id: l.partId, name: l.partName ?? `Part ${l.partId.slice(0, 8)}`, units: 0, total: 0 };
        row.units += l.qty;
        row.total += l.lineTotal;
        map.set(l.partId, row);
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [active, mine]);

  const exportCsv = () =>
    downloadCsv(
      `parts-sales-${range}.csv`,
      ["Date", "Invoice", "Status", "Payment", "Customer", "City", "Units", "Taxable", "GST", "Total"],
      list.map((o) => {
        const m = myOrderMoney(o, mine);
        const b = orderBuyer(o);
        return [fmtDate(o.createdAt), o.invoiceNumber ?? o.id, o.status, o.paymentMethod, b.name, b.city, m.units, round2(m.taxable), round2(m.gst), round2(m.total)];
      })
    );

  return (
    <PartsSupplierShell
      title="Revenue & collections"
      description="Sales from your own products only. COD is collected by your courier and remitted to you; WhatsApp-confirmed orders are paid to you directly."
      actions={
        <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={!list.length}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button key={r.id} type="button" onClick={() => setRange(r.id)} className={cn("psp-pipeline-pill", range === r.id && "ring-2 ring-primary")}>
            {r.label}
          </button>
        ))}
      </div>
      <PsMetricGrid metrics={metrics} loading={isLoading} />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section>
          <h3 className="mb-2 font-semibold">Monthly summary</h3>
          <PsEnterpriseTable
            rows={months}
            rowKey={(m) => m.key}
            empty="No sales in this period"
            columns={[
              { key: "m", header: "Month", cell: (m) => m.label },
              { key: "o", header: "Orders", cell: (m) => m.orders },
              { key: "u", header: "Units", cell: (m) => m.units },
              { key: "t", header: "Taxable", cell: (m) => formatCurrency(m.taxable) },
              { key: "g", header: "GST", cell: (m) => formatCurrency(m.gst) },
              { key: "s", header: "Sales", cell: (m) => <strong>{formatCurrency(m.total)}</strong> },
              { key: "c", header: "Cancelled", cell: (m) => (m.cancelled ? formatCurrency(m.cancelled) : "—") },
            ]}
          />
        </section>
        <section>
          <h3 className="mb-2 font-semibold">Top products</h3>
          <PsEnterpriseTable
            rows={topProducts}
            rowKey={(r) => r.id}
            empty="No products sold in this period"
            columns={[
              { key: "n", header: "Product", cell: (r) => r.name },
              { key: "u", header: "Units", cell: (r) => r.units },
              { key: "t", header: "Sales", cell: (r) => formatCurrency(r.total) },
            ]}
          />
        </section>
      </div>
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* GST invoices                                                         */
/* ------------------------------------------------------------------ */

export function PsInvoicesPage() {
  const mine = useMySellerIds();
  const { data: orders, isLoading } = useSellerOrders();
  const [month, setMonth] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => setPageMeta({ title: "GST invoices" }), []);

  const issued = (orders ?? []).filter((o) => o.status !== "cancelled");
  const monthKey = (iso: string) => iso.slice(0, 7);
  const monthOptions = [...new Set(issued.map((o) => monthKey(o.createdAt)))].sort().reverse();
  const needle = q.trim().toLowerCase();
  const rows = issued.filter(
    (o) =>
      (!month || monthKey(o.createdAt) === month) &&
      (!needle || [o.invoiceNumber, orderBuyer(o).name, o.gstin].join(" ").toLowerCase().includes(needle))
  );
  const totals = rows.reduce(
    (t, o) => {
      const m = myOrderMoney(o, mine);
      return { taxable: t.taxable + m.taxable, gst: t.gst + m.gst, total: t.total + m.total };
    },
    { taxable: 0, gst: 0, total: 0 }
  );

  const exportCsv = () =>
    downloadCsv(
      `gst-invoices${month ? `-${month}` : ""}.csv`,
      ["Invoice", "Date", "Buyer", "Buyer GSTIN", "Place of supply", "Item", "HSN", "Qty", "GST %", "Taxable", "GST", "Total"],
      rows.flatMap((o) => {
        const b = orderBuyer(o);
        return myLines(o, mine).map((l) => [
          o.invoiceNumber ?? o.id,
          fmtDate(o.createdAt),
          b.name,
          o.gstin ?? "",
          b.state,
          l.partName ?? l.partId,
          l.hsnCode ?? "",
          l.qty,
          l.gstRate,
          round2(l.lineSubtotal),
          round2(l.lineGst),
          round2(l.lineTotal),
        ]);
      })
    );

  return (
    <PartsSupplierShell
      title="GST invoices"
      description="A tax invoice is generated for every order. Export line-wise data with HSN and GST rate for your GSTR-1 filing."
      actions={
        <Button variant="outline" className="rounded-xl" onClick={exportCsv} disabled={!rows.length}>
          <Download className="mr-1 h-4 w-4" /> Export for GST
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search invoice, buyer, GSTIN" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          <option value="">All months</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {rows.length} invoices · taxable {formatCurrency(totals.taxable)} · GST {formatCurrency(totals.gst)} · total{" "}
        <strong className="text-foreground">{formatCurrency(totals.total)}</strong>
      </p>
      {isLoading ? (
        <p className="text-muted-foreground">Loading invoices…</p>
      ) : (
        <PsEnterpriseTable
          rows={rows}
          rowKey={(o) => o.id}
          empty="No invoices yet — they are created automatically when buyers order"
          columns={[
            { key: "no", header: "Invoice", cell: (o) => <span className="font-mono text-xs">{o.invoiceNumber ?? o.id.slice(0, 8)}</span> },
            { key: "date", header: "Date", cell: (o) => fmtDate(o.createdAt) },
            { key: "buyer", header: "Buyer", cell: (o) => orderBuyer(o).name },
            { key: "gstin", header: "GSTIN", cell: (o) => o.gstin ?? <span className="text-muted-foreground">B2C</span> },
            { key: "taxable", header: "Taxable", cell: (o) => formatCurrency(myOrderMoney(o, mine).taxable) },
            { key: "gst", header: "GST", cell: (o) => formatCurrency(myOrderMoney(o, mine).gst) },
            { key: "total", header: "Total", cell: (o) => <strong>{formatCurrency(myOrderMoney(o, mine).total)}</strong> },
            { key: "status", header: "Status", cell: (o) => <StatusPill status={o.status} /> },
            {
              key: "view",
              header: "",
              cell: (o) => (
                <Button size="sm" variant="outline" className="rounded-lg" asChild>
                  <Link to={`/orders/${o.id}/invoice`} target="_blank" rel="noreferrer">
                    View / print
                  </Link>
                </Button>
              ),
            },
          ]}
        />
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Customers                                                            */
/* ------------------------------------------------------------------ */

type CustomerRow = {
  key: string;
  name: string;
  phone: string;
  city: string;
  gstin: string | null;
  orders: number;
  units: number;
  total: number;
  last: string;
};

export function PsCustomersPage() {
  const mine = useMySellerIds();
  const { data: orders, isLoading } = useSellerOrders();
  const [q, setQ] = useState("");

  useEffect(() => setPageMeta({ title: "Customers" }), []);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of orders ?? []) {
      const b = orderBuyer(o);
      const key = o.userId || b.phone;
      const row = map.get(key) ?? { key, name: b.name, phone: b.phone, city: [b.city, b.state].filter(Boolean).join(", "), gstin: null, orders: 0, units: 0, total: 0, last: o.createdAt };
      if (o.status !== "cancelled") {
        const m = myOrderMoney(o, mine);
        row.orders += 1;
        row.units += m.units;
        row.total += m.total;
      }
      if (o.gstin) row.gstin = o.gstin;
      if (o.createdAt > row.last) row.last = o.createdAt;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [orders, mine]);

  const needle = q.trim().toLowerCase();
  const rows = customers.filter((c) => !needle || [c.name, c.phone, c.city, c.gstin].join(" ").toLowerCase().includes(needle));
  const repeat = customers.filter((c) => c.orders > 1).length;
  const b2b = customers.filter((c) => c.gstin).length;

  return (
    <PartsSupplierShell
      title="Customers"
      description="Everyone who has ordered your parts. Garages and workshops that share a GSTIN are marked B2B."
      actions={
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv("parts-customers.csv", ["Name", "Phone", "City", "GSTIN", "Orders", "Units", "Total", "Last order"], rows.map((c) => [c.name, c.phone, c.city, c.gstin ?? "", c.orders, c.units, round2(c.total), fmtDate(c.last)]))
          }
        >
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        {customers.length} customers · {repeat} repeat buyers · {b2b} B2B (GST)
      </p>
      <Input className="mb-4 max-w-xs" placeholder="Search name, phone, city, GSTIN" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? (
        <p className="text-muted-foreground">Loading customers…</p>
      ) : (
        <PsEnterpriseTable
          rows={rows}
          rowKey={(c) => c.key}
          empty="No customers yet"
          columns={[
            {
              key: "name",
              header: "Customer",
              cell: (c) => (
                <div>
                  <p className="font-medium">
                    {c.name} {c.gstin ? <span className="psp-badge ml-1">B2B</span> : null} {c.orders > 1 ? <span className="psp-badge psp-badge--success ml-1">Repeat</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.gstin ?? c.city}</p>
                </div>
              ),
            },
            { key: "phone", header: "Phone", cell: (c) => (c.phone ? <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a> : "—") },
            { key: "city", header: "City", cell: (c) => c.city || "—" },
            { key: "orders", header: "Orders", cell: (c) => c.orders },
            { key: "total", header: "Total spent", cell: (c) => formatCurrency(c.total) },
            { key: "last", header: "Last order", cell: (c) => fmtDate(c.last) },
          ]}
        />
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

export function PsReviewsPage() {
  const { data: parts } = useSellerParts();
  const { data: reviews, isLoading } = useQuery({ queryKey: ["parts-seller", "reviews"], queryFn: fetchSellerPartReviews, staleTime: 60_000 });
  const [stars, setStars] = useState(0);

  useEffect(() => setPageMeta({ title: "Ratings & reviews" }), []);

  const list = reviews ?? [];
  const avg = list.length ? list.reduce((t, r) => t + r.rating, 0) / list.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: list.filter((r) => r.rating === s).length }));
  const rows = stars ? list.filter((r) => r.rating === stars) : list;
  const partById = new Map((parts ?? []).map((p) => [p.id, p]));

  return (
    <PartsSupplierShell title="Ratings & reviews" description="What buyers say about your parts. Ratings show on your product pages.">
      <div className="mb-6 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="psp-panel text-center">
          <p className="text-4xl font-bold">{avg ? avg.toFixed(1) : "—"}</p>
          <Stars value={avg} />
          <p className="mt-1 text-xs text-muted-foreground">{list.length} reviews</p>
        </div>
        <div className="psp-panel space-y-1.5">
          {dist.map(({ s, n }) => (
            <button key={s} type="button" onClick={() => setStars(stars === s ? 0 : s)} className={cn("flex w-full items-center gap-2 rounded px-1 text-sm", stars === s && "bg-primary/10")}>
              <span className="w-8 text-left">{s}★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full bg-amber-400" style={{ width: `${list.length ? (n / list.length) * 100 : 0}%` }} />
              </span>
              <span className="w-8 text-right text-muted-foreground">{n}</span>
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <div className="psp-panel text-center text-sm text-muted-foreground">
          {list.length ? "No reviews with this rating" : "No reviews yet. Buyers can review a part after delivery."}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const part = partById.get(r.partId);
            return (
              <li key={r.id} className="psp-panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    {r.title ? <span className="font-medium">{r.title}</span> : null}
                    {r.verifiedPurchase ? <span className="psp-badge psp-badge--success">Verified purchase</span> : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                </div>
                {r.content ? <p className="mt-2 text-sm">{r.content}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  on{" "}
                  {part ? (
                    <Link to={`/parts/${part.categorySlug}/${part.slug}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                      {r.partName}
                    </Link>
                  ) : (
                    r.partName
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                        */
/* ------------------------------------------------------------------ */

export function PsNotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();
  const [tab, setTab] = useState<"parts" | "all" | "unread">("parts");

  useEffect(() => setPageMeta({ title: "Notifications" }), []);

  const isParts = (n: (typeof notifications)[number]) => {
    const link = n.link || (typeof n.metadata?.link === "string" ? n.metadata.link : "");
    return n.type === "parts" || /\/(dashboard\/)?parts|^\/orders\//.test(link ?? "");
  };
  const rows = notifications.filter((n) => (tab === "parts" ? isParts(n) : tab === "unread" ? !n.is_read : true));

  return (
    <PartsSupplierShell
      title="Notifications"
      description="New orders, cancellations and account updates."
      actions={
        <Button variant="outline" className="rounded-xl" disabled={!unreadCount} onClick={() => void markAllRead()}>
          <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["parts", "Parts store"],
            ["unread", `Unread (${unreadCount})`],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("psp-pipeline-pill", tab === id && "ring-2 ring-primary")}>
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="psp-panel text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 h-6 w-6 opacity-50" />
          You're all caught up.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const link = n.link || (typeof n.metadata?.link === "string" ? (n.metadata.link as string) : "");
            return (
              <li key={n.id} className={cn("psp-panel flex items-start justify-between gap-3", !n.is_read && "border-primary/40")}>
                <div className="min-w-0">
                  <p className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</p>
                  {n.message ? <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {link ? (
                    <Button size="sm" variant="outline" className="rounded-lg" asChild>
                      <Link to={link} onClick={() => !n.is_read && void markRead(n.id)}>
                        Open
                      </Link>
                    </Button>
                  ) : null}
                  {!n.is_read ? (
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => void markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PartsSupplierShell>
  );
}

/* ------------------------------------------------------------------ */
/* Business profile & KYC                                               */
/* ------------------------------------------------------------------ */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

const APPROVAL_LABEL: Record<string, { label: string; tone: string }> = {
  approved: { label: "Approved", tone: "psp-badge--success" },
  pending: { label: "Awaiting approval", tone: "psp-badge--warning" },
  rejected: { label: "Rejected", tone: "psp-badge--danger" },
};

export function PsProfilePage() {
  const { user } = useAuth();
  const { data: parts } = useSellerParts();
  const { data: orders } = useSellerOrders();

  useEffect(() => setPageMeta({ title: "Business profile & KYC" }), []);

  const approval = APPROVAL_LABEL[user?.approvalStatus ?? ""] ?? { label: user?.approvalStatus ? user.approvalStatus.replace(/_/g, " ") : "Approved", tone: "psp-badge--success" };
  const kyc = user?.kycStatus ?? "not_started";
  const kycTone = kyc === "verified" ? "psp-badge--success" : kyc === "rejected" ? "psp-badge--danger" : "psp-badge--warning";
  const delivered = (orders ?? []).filter((o) => o.status === "delivered").length;
  const cancelled = (orders ?? []).filter((o) => o.status === "cancelled").length;
  const totalOrders = (orders ?? []).length;

  return (
    <PartsSupplierShell title="Business profile & KYC" description="Your seller identity as buyers see it on invoices and product pages.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="psp-glass-card">
          <h3 className="psp-panel__title flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Business details
          </h3>
          <dl className="mt-3">
            <Row label="Business name" value={user?.companyName} />
            <Row label="Owner / contact" value={user?.fullName} />
            <Row label="Email" value={user?.email} />
            <Row label="Phone" value={user?.phone} />
            <Row label="City" value={[user?.city, user?.state].filter(Boolean).join(", ")} />
            <Row label="Account type" value={(user?.dealerType ?? user?.role ?? "").replace(/_/g, " ")} />
            <Row label="Seller since" value={user?.createdAt ? fmtDate(user.createdAt) : ""} />
          </dl>
          <Button variant="outline" className="mt-3 rounded-xl" asChild>
            <Link to="/profile">Edit business details</Link>
          </Button>
        </section>

        <section className="psp-glass-card">
          <h3 className="psp-panel__title flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verification
          </h3>
          <dl className="mt-3">
            <Row label="MotorCart approval" value={<span className={cn("psp-badge", approval.tone)}>{approval.label}</span>} />
            <Row label="KYC" value={<span className={cn("psp-badge capitalize", kycTone)}>{kyc.replace(/_/g, " ")}</span>} />
            <Row label="Account status" value={<span className="capitalize">{user?.accountStatus ?? "active"}</span>} />
            <Row label="Verified seller badge" value={user?.isVerified ? "Yes" : "Not yet"} />
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload GST certificate, PAN and address proof to get the verified badge and higher buyer trust.
          </p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/profile/kyc">Upload KYC documents</Link>
          </Button>
        </section>

        <section className="psp-glass-card lg:col-span-2">
          <h3 className="psp-panel__title">Store performance</h3>
          <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
            <Row label="Products listed" value={String((parts ?? []).length)} />
            <Row label="Live products" value={String((parts ?? []).filter((p) => p.isActive && p.stock > 0).length)} />
            <Row label="Orders received" value={String(totalOrders)} />
            <Row label="Delivered" value={String(delivered)} />
            <Row label="Cancellation rate" value={totalOrders ? `${Math.round((cancelled / totalOrders) * 100)}%` : "—"} />
            <Row label="Order policy" value="Buyer can cancel until shipped · COD & WhatsApp confirm" />
          </dl>
        </section>
      </div>
    </PartsSupplierShell>
  );
}
