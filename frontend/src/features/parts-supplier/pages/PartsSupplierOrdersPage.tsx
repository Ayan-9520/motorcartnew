import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchSellerPartOrders,
  orderLineLabel,
  updatePartOrderTracking,
  updatePartOrderStatus,
} from "@/features/parts/services/parts.service";
import type { PartOrder, PartOrderStatus } from "@/features/parts/types";
import { PART_ORDER_STATUS_LABELS } from "@/features/parts/lib/order-status";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartsSupplierShell } from "../components/PartsSupplierShell";
import { OrderTrackingTimeline } from "@/features/parts/components/OrderTrackingTimeline";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

const FILTERS: { id: "all" | PartOrderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

type OrdersPageProps = { initialFilter?: "all" | PartOrderStatus; title?: string };

export function PartsSupplierOrdersPage({ initialFilter = "all", title = "Live orders" }: OrdersPageProps = {}) {
  const [orders, setOrders] = useState<PartOrder[] | null>(null);
  const [filter, setFilter] = useState<"all" | PartOrderStatus>(initialFilter);
  const [query, setQuery] = useState("");
  useEffect(() => setFilter(initialFilter), [initialFilter]);
  const [track, setTrack] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => fetchSellerPartOrders().then(setOrders), []);
  useEffect(() => {
    setPageMeta({ title: "Order management" });
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length ?? 0 };
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const run = async (orderId: string, action: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusyId(orderId);
    const { error } = await action();
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(ok);
      void load();
    }
  };

  const ship = (orderId: string) => {
    const t = (track[orderId] ?? "").trim();
    const c = (carrier[orderId] ?? "").trim();
    if (!c || !t) {
      toast.error("Enter courier name and tracking number");
      return;
    }
    void run(orderId, () => updatePartOrderTracking(orderId, t, c), "Marked shipped — customer notified");
  };

  const cancel = (orderId: string) => {
    const reason = window.prompt("Reason for cancelling (shown to the customer)", "Out of stock");
    if (reason === null) return;
    void run(orderId, () => updatePartOrderStatus(orderId, "cancelled", reason || undefined), "Order cancelled — stock restored");
  };

  const q = query.trim().toLowerCase();
  const visible = (orders ?? []).filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!q) return true;
    const addr = o.shippingAddress as Record<string, string | undefined>;
    const hay = [o.invoiceNumber, o.id, addr.name, addr.phone, addr.city, ...o.items.map((i) => i.partName)].join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <PartsSupplierShell title={title} description="Confirm → pack → ship with tracking → delivered. Customers get a notification at every step.">
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search invoice, customer, phone or part"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`psp-pipeline-pill ${filter === f.id ? "ring-2 ring-primary" : ""}`}
          >
            {f.label}: <strong>{counts[f.id] ?? 0}</strong>
          </button>
        ))}
      </div>

      {orders === null ? (
        <p className="text-muted-foreground">Loading orders…</p>
      ) : visible.length === 0 ? (
        <div className="psp-panel text-center">
          <p className="font-semibold">{orders.length === 0 ? "No orders yet" : "No orders in this stage"}</p>
          <p className="mt-1 text-sm text-muted-foreground">New customer orders for your parts appear here instantly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((o) => {
            const addr = o.shippingAddress as Record<string, string | undefined>;
            const busy = busyId === o.id;
            return (
              <article key={o.id} className="psp-order-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/dashboard/parts/orders/${o.id}`} className="font-semibold text-primary hover:underline">
                      {o.invoiceNumber ?? o.id.slice(0, 8)}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {PART_ORDER_STATUS_LABELS[o.status]} · {formatCurrency(o.grandTotal)} · {o.paymentMethod === "cod" ? "COD" : o.paymentMethod === "whatsapp" ? "WhatsApp confirm" : o.paymentMethod}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {addr.name} · {addr.phone} · {addr.city}, {addr.state} {addr.pin}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs">{o.items.map((i) => `${i.qty}× ${orderLineLabel(i)}`).join(" · ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === "pending" && (
                      <Button size="sm" className="rounded-lg" disabled={busy} onClick={() => void run(o.id, () => updatePartOrderStatus(o.id, "confirmed"), "Order confirmed")}>
                        Confirm
                      </Button>
                    )}
                    {o.status === "confirmed" && (
                      <Button size="sm" className="rounded-lg" disabled={busy} onClick={() => void run(o.id, () => updatePartOrderStatus(o.id, "packed"), "Marked packed")}>
                        Mark packed
                      </Button>
                    )}
                    {o.status === "shipped" && (
                      <Button size="sm" className="rounded-lg" disabled={busy} onClick={() => void run(o.id, () => updatePartOrderStatus(o.id, "delivered"), "Marked delivered")}>
                        Mark delivered
                      </Button>
                    )}
                    {["pending", "confirmed", "packed"].includes(o.status) && (
                      <Button size="sm" variant="outline" className="rounded-lg text-destructive" disabled={busy} onClick={() => cancel(o.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
                <OrderTrackingTimeline status={o.status} trackingNumber={o.trackingNumber} carrier={o.carrier} />
                {o.status === "packed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      placeholder="Courier (e.g. Delhivery)"
                      className="max-w-[180px]"
                      value={carrier[o.id] ?? ""}
                      onChange={(e) => setCarrier((s) => ({ ...s, [o.id]: e.target.value }))}
                    />
                    <Input
                      placeholder="Tracking / AWB number"
                      className="max-w-[200px]"
                      value={track[o.id] ?? ""}
                      onChange={(e) => setTrack((s) => ({ ...s, [o.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={() => ship(o.id)}>
                      Mark shipped
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PartsSupplierShell>
  );
}
