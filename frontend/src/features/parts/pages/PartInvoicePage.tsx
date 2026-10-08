import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { fetchPartOrderById, orderLineLabel } from "../services/parts.service";
import type { PartOrder } from "../types";

const PARTS_DESK_SELLER_ID = "motorcart-parts-desk";

export function PartInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<PartOrder | null | undefined>(undefined);

  useEffect(() => {
    if (!user || !id) return;
    fetchPartOrderById(user.id, id).then(setOrder).catch(() => setOrder(null));
  }, [user, id]);

  if (order === undefined) {
    return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p>Invoice not found</p>
        <Button variant="link" asChild><Link to="/orders">Orders</Link></Button>
      </div>
    );
  }

  const addr = order.shippingAddress as Record<string, string | undefined>;
  const deskOrder = (order.sellerIds ?? []).includes(PARTS_DESK_SELLER_ID) || order.items.some((i) => i.sellerId === PARTS_DESK_SELLER_ID);
  const cancelled = order.status === "cancelled";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 print:max-w-none print:py-0">
      <div className="mb-6 flex justify-between print:hidden">
        <Button variant="outline" asChild><Link to={`/orders/${order.id}`}>← Order</Link></Button>
        <Button type="button" onClick={() => window.print()}>Print / Save PDF</Button>
      </div>

      <article className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-card print:border-0 print:shadow-none">
        {cancelled && (
          <p className="pointer-events-none absolute inset-0 flex rotate-[-18deg] items-center justify-center text-7xl font-black uppercase tracking-widest text-destructive/15">
            Cancelled
          </p>
        )}
        <header className="flex flex-wrap justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{SITE_NAME}</h1>
            <p className="text-sm text-muted-foreground">Tax Invoice — Auto Parts</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Sold by: {deskOrder ? "Motorcart Parts Desk" : "Motorcart marketplace seller"}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold">{order.invoiceNumber ?? order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
            <p className="text-muted-foreground">{SITE_URL.replace(/^https?:\/\//, "")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "whatsapp" ? "Confirmed on WhatsApp" : order.paymentMethod}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-primary">Bill / ship to</h2>
            <p className="mt-2 leading-relaxed">
              {addr.name ?? "Customer"}<br />
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
              {addr.city}, {addr.state} {addr.pin}<br />
              Ph: {addr.phone}
            </p>
            {order.gstin && <p className="mt-1 font-mono text-xs">GSTIN: {order.gstin}</p>}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Place of supply</h2>
            <p className="mt-2 text-muted-foreground">{addr.state ?? "—"}</p>
            <p className="mt-2 text-xs text-muted-foreground">All prices are inclusive of GST. Taxable value and GST are shown per line.</p>
          </div>
        </section>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-3">Item</th>
                <th className="p-3">HSN</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="p-3">{orderLineLabel(line)}</td>
                  <td className="p-3 font-mono text-xs">{line.hsnCode ?? "—"}</td>
                  <td className="p-3 text-right">{line.qty}</td>
                  <td className="p-3 text-right">{formatCurrency(line.unitPrice)}</td>
                  <td className="p-3 text-right">{formatCurrency(line.lineSubtotal)}</td>
                  <td className="p-3 text-right">{formatCurrency(line.lineGst)} <span className="text-xs text-muted-foreground">({line.gstRate}%)</span></td>
                  <td className="p-3 text-right font-medium">{formatCurrency(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-8 flex justify-end border-t pt-6 text-sm">
          <div className="w-64 space-y-1">
            <div className="flex justify-between"><span>Taxable value</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Total GST</span><span>{formatCurrency(order.gstTotal)}</span></div>
            <div className="flex justify-between text-lg font-bold text-primary"><span>Grand total</span><span>{formatCurrency(order.grandTotal)}</span></div>
          </div>
        </footer>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This is a computer-generated invoice. For support, contact parts@motorcart.in
        </p>
      </article>
    </div>
  );
}
