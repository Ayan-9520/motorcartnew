import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyPartOrders, orderLineLabel } from "../services/parts.service";
import type { PartOrder } from "../types";
import { PART_ORDER_STATUS_LABELS, partOrderStatusTone } from "../lib/order-status";

export function PartsOrdersListPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PartOrder[] | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchMyPartOrders(user.id).then(setOrders);
  }, [user]);

  if (!user) {
    return <p className="p-8 text-center text-muted-foreground"><Link className="text-primary underline" to="/login">Log in</Link> to track orders.</p>;
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">My parts orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track delivery, download GST invoices and cancel before packing.</p>
      </div>

      {orders === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border bg-card px-6 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Parts you order will show up here with live tracking.</p>
          <Button className="mt-5" asChild><Link to="/parts">Shop parts</Link></Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{o.invoiceNumber ?? o.id.slice(0, 8)}</p>
                    <Badge className={partOrderStatusTone(o.status)}>{PART_ORDER_STATUS_LABELS[o.status]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {o.items.map(orderLineLabel).join(", ") || `${o.items.length} item(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <p className="font-semibold">{formatCurrency(o.grandTotal)}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
