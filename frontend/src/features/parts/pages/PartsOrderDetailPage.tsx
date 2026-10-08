import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, FileText, MapPin, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { PartOrder } from "../types";
import { cancelPartOrder, fetchPartOrderById, orderLineLabel } from "../services/parts.service";
import { OrderTrackingTimeline } from "../components/OrderTrackingTimeline";
import { PART_ORDER_STATUS_LABELS, partOrderStatusTone } from "../lib/order-status";

export function PartsOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true;
  const { user } = useAuth();
  const [order, setOrder] = useState<PartOrder | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      setOrder(await fetchPartOrderById(user.id, id));
    } catch {
      setOrder((o) => o ?? null);
    }
  }, [user, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "cancelled") return;
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [order, load]);

  const cancel = async () => {
    if (!order) return;
    if (!window.confirm("Cancel this order? Items go back to stock and no COD amount will be collected.")) return;
    setCancelling(true);
    const { order: updated, error } = await cancelPartOrder(order.id, "Cancelled by customer");
    setCancelling(false);
    if (error) toast.error(error);
    else if (updated) {
      setOrder(updated);
      toast.success("Order cancelled");
    }
  };

  if (order === undefined) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="font-semibold">Order not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may belong to another account.</p>
        <Button variant="link" asChild><Link to="/orders">All orders</Link></Button>
      </div>
    );
  }

  const addr = order.shippingAddress as Record<string, string | undefined>;
  const canCancel = order.status === "pending" || order.status === "confirmed";
  const timeline = [...(order.timeline ?? [])].reverse();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" size="sm" asChild><Link to="/orders">← All orders</Link></Button>

      {justPlaced && order.status === "pending" && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">Order placed successfully</p>
            <p className="text-muted-foreground">
              {order.paymentMethod === "whatsapp"
                ? `Our parts desk will WhatsApp you on ${addr.phone ?? "your number"} to confirm before dispatch.`
                : `Pay ${formatCurrency(order.grandTotal)} in cash or UPI when it arrives. We'll notify you at each step.`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order {order.invoiceNumber ?? order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "whatsapp" ? "WhatsApp confirmation" : order.paymentMethod}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={partOrderStatusTone(order.status)}>{PART_ORDER_STATUS_LABELS[order.status]}</Badge>
          <Button variant="ghost" size="icon" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <OrderTrackingTimeline status={order.status} trackingNumber={order.trackingNumber} carrier={order.carrier} />
        {timeline.length > 0 && (
          <ol className="mt-5 space-y-2 border-t pt-4 text-sm">
            {timeline.map((t, i) => (
              <li key={`${t.status}-${t.at}-${i}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  <strong>{PART_ORDER_STATUS_LABELS[t.status] ?? t.status}</strong>
                  {t.note ? <span className="text-muted-foreground"> — {t.note}</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Items</h2>
          <ul className="mt-3 divide-y">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  {i.slug && i.categorySlug ? (
                    <Link to={`/parts/${i.categorySlug}/${i.slug}`} className="font-medium hover:text-primary">{orderLineLabel(i)}</Link>
                  ) : (
                    <span className="font-medium">{orderLineLabel(i)}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">{i.qty} × {formatCurrency(i.unitPrice)} · GST {i.gstRate}%</span>
                </span>
                <span className="font-medium">{formatCurrency(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable value</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(order.gstTotal)}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatCurrency(order.grandTotal)}</span></div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 text-sm">
            <h2 className="flex items-center gap-1.5 text-lg font-semibold"><MapPin className="h-4 w-4 text-primary" /> Deliver to</h2>
            <p className="mt-2 leading-relaxed">
              <strong>{addr.name}</strong><br />
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
              {addr.landmark ? <>{addr.landmark}<br /></> : null}
              {addr.city}, {addr.state} {addr.pin}<br />
              Ph: {addr.phone}
            </p>
            {order.gstin && <p className="mt-2 text-xs text-muted-foreground">GSTIN {order.gstin}</p>}
          </section>
          <Button className="w-full gap-2" asChild>
            <Link to={`/orders/${order.id}/invoice`}><FileText className="h-4 w-4" /> GST invoice</Link>
          </Button>
          {canCancel && (
            <Button variant="outline" className="w-full gap-2 text-destructive" disabled={cancelling} onClick={cancel}>
              <XCircle className="h-4 w-4" /> {cancelling ? "Cancelling…" : "Cancel order"}
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
