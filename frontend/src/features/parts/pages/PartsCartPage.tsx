import { Link } from "react-router-dom";
import { ShoppingBag, Trash2, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { usePartsCartStore } from "@/store/partsCartStore";
import { PartsWhatsAppButton } from "../components/PartsWhatsAppButton";
import { hasBulkTier, unitPriceForQty } from "../lib/part-utils";

export function PartsCartPage() {
  const { lines, removeLine, setQty, clear, itemCount } = usePartsCartStore();

  const total = lines.reduce((s, l) => s + unitPriceForQty(l, l.qty) * l.qty, 0);
  const gst = lines.reduce((s, l) => {
    const lineTotal = unitPriceForQty(l, l.qty) * l.qty;
    return s + (lineTotal - lineTotal / (1 + l.gstRate / 100));
  }, 0);

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">Your cart</h1>
        {lines.length > 0 && <p className="text-sm text-muted-foreground">{itemCount()} item{itemCount() === 1 ? "" : "s"}</p>}
      </div>

      {lines.length === 0 ? (
        <div className="rounded-3xl border bg-card px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Browse filters, batteries, tyres and more from verified brands.</p>
          <Button className="mt-5" asChild><Link to="/parts">Shop parts</Link></Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-4">
            {lines.map((l) => {
              const unit = unitPriceForQty(l, l.qty);
              const bulk = hasBulkTier(l);
              return (
                <li key={l.partId} className="flex gap-4 rounded-2xl border bg-card p-4">
                  <img src={l.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/parts/${l.categorySlug}/${l.slug}`} className="line-clamp-2 font-medium hover:text-primary">{l.name}</Link>
                    <p className="text-sm text-muted-foreground">{formatCurrency(unit)} / unit · GST {l.gstRate}% incl.</p>
                    {bulk && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                        <Zap className="h-3 w-3" />
                        {l.qty >= l.bulkMinQty ? "Bulk price applied" : `Add ${l.bulkMinQty - l.qty} more for ${formatCurrency(l.wholesalePrice!)} each`}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={l.qty <= 1} onClick={() => setQty(l.partId, l.qty - 1)} aria-label="Decrease">−</Button>
                      <span className="w-8 text-center text-sm">{l.qty}</span>
                      <Button size="sm" variant="outline" disabled={l.stock != null && l.qty >= l.stock} onClick={() => setQty(l.partId, l.qty + 1)} aria-label="Increase">+</Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(unit * l.qty)}</p>
                    <Button variant="ghost" size="icon" className="mt-2 text-destructive" onClick={() => removeLine(l.partId)} aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable value</span><span>{formatCurrency(total - gst)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(gst)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-primary">Free</span></div>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Pay cash on delivery · final price confirmed at checkout</p>
            <Button className="h-11 w-full" asChild><Link to="/checkout">Proceed to checkout</Link></Button>
            <PartsWhatsAppButton lines={lines} />
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clear}>Clear cart</Button>
          </aside>
        </div>
      )}
    </div>
  );
}
