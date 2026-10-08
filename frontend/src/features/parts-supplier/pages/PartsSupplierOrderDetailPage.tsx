import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PartsSupplierShell } from "../components/PartsSupplierShell";
import { fetchPartsSupplierOrderDetail } from "../services/parts-supplier.service";
import type { PsSupplierOrderDetail } from "../types";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

export function PartsSupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PsSupplierOrderDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    void fetchPartsSupplierOrderDetail(id).then(setOrder);
    setPageMeta({ title: "Order detail" });
  }, [id]);

  if (!order) {
    return (
      <PartsSupplierShell title="Order" crumbs={[{ label: "Orders", href: "/dashboard/parts/orders" }]}>
        <p className="text-muted-foreground">{order === undefined ? "Loading…" : "Order not found or not assigned to you."}</p>
      </PartsSupplierShell>
    );
  }

  return (
    <PartsSupplierShell
      title={order.orderNo}
      description={`${order.customerName} · ${order.customerType}`}
      crumbs={[
        { label: "Orders", href: "/dashboard/parts/orders" },
        { label: order.orderNo },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="psp-panel">
          <h3 className="psp-panel__title">Customer & GST</h3>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd>{order.phone}</dd>
            </div>
            {order.gstin ? (
              <div className="flex justify-between">
                <dt className="text-slate-500">GSTIN</dt>
                <dd>{order.gstin}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-slate-500">Payment</dt>
              <dd>{order.paymentMode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ship to</dt>
              <dd>{order.warehouse}</dd>
            </div>
          </dl>
        </div>
        <div className="psp-panel">
          <h3 className="psp-panel__title">Dispatch timeline</h3>
          <ul className="mt-2 space-y-2">
            {order.timeline.map((t) => (
              <li key={t.label} className={t.done ? "text-emerald-400" : "text-slate-500"}>
                {t.label} — {t.at}
              </li>
            ))}
          </ul>
          {order.trackingNumber ? (
            <p className="mt-3 text-sm">
              {order.carrier}: <strong>{order.trackingNumber}</strong>
            </p>
          ) : null}
        </div>
      </div>
      <div className="psp-panel mt-4">
        <h3 className="psp-panel__title">Line items</h3>
        <table className="psp-table mt-2 w-full text-sm">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.sku}>
                <td className="font-mono text-xs">{it.sku}</td>
                <td>{it.name}</td>
                <td>{it.qty}</td>
                <td>{formatCurrency(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right font-semibold">Grand total: {formatCurrency(order.grandTotal)}</p>
      </div>
      <Link to={`/orders/${order.id}/invoice`} className="mt-4 inline-block text-sm text-amber-400 hover:underline">
        View GST invoice →
      </Link>
    </PartsSupplierShell>
  );
}
