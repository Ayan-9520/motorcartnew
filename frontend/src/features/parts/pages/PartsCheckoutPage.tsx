import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Lock, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { usePartsCartStore } from "@/store/partsCartStore";
import { useAuth } from "@/hooks/useAuth";
import { submitPartOrder } from "../services/parts.service";
import { unitPriceForQty } from "../lib/part-utils";
import { INDIA_STATES_AND_UTS } from "../lib/india-states";
import toast from "react-hot-toast";

const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^[1-9]\d{5}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type PayMethod = "cod" | "whatsapp";

export function PartsCheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { lines, clear, itemCount, removeLine } = usePartsCartStore();
  const [pay, setPay] = useState<PayMethod>("cod");
  const [form, setForm] = useState({
    name: user?.fullName ?? "",
    phone: (user?.phone ?? "").replace(/\D/g, "").slice(-10),
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pin: "",
    gstin: "",
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const errors = useMemo(() => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (form.name.trim().length < 2) e.name = "Enter the receiver's full name";
    if (!PHONE_RE.test(form.phone.replace(/\D/g, "").slice(-10))) e.phone = "Enter a valid 10-digit mobile number";
    if (form.line1.trim().length < 5) e.line1 = "Enter house / street address";
    if (!form.city.trim()) e.city = "Enter city";
    if (!form.state) e.state = "Choose state";
    if (!PIN_RE.test(form.pin.trim())) e.pin = "Enter a valid 6-digit PIN code";
    if (form.gstin.trim() && !GSTIN_RE.test(form.gstin.trim().toUpperCase())) e.gstin = "GSTIN format looks wrong";
    return e;
  }, [form]);

  const total = lines.reduce((s, l) => s + unitPriceForQty(l, l.qty) * l.qty, 0);
  const gst = lines.reduce((s, l) => {
    const t = unitPriceForQty(l, l.qty) * l.qty;
    return s + (t - t / (1 + l.gstRate / 100));
  }, 0);

  const placeOrder = async () => {
    setTouched(true);
    setServerError(null);
    if (!isAuthenticated || !user) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }
    if (Object.keys(errors).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setBusy(true);
    const result = await submitPartOrder({
      items: lines.map((l) => ({ part_id: l.partId, qty: l.qty })),
      payment_method: pay,
      shipping: {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, "").slice(-10),
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        landmark: form.landmark.trim(),
        city: form.city.trim(),
        state: form.state,
        pin: form.pin.trim(),
      },
      gstin: form.gstin.trim().toUpperCase() || undefined,
    });
    setBusy(false);
    if (result.ok) {
      clear();
      toast.success(`Order ${result.order.invoiceNumber ?? ""} placed`);
      navigate(`/orders/${result.order.id}`, { state: { justPlaced: true } });
    } else {
      setServerError(result.error);
      toast.error(result.error);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="font-semibold">Nothing to checkout</p>
        <p className="mt-1 text-sm text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-4" asChild><Link to="/parts">Browse parts</Link></Button>
      </div>
    );
  }

  const fieldError = (k: keyof typeof form) =>
    touched && errors[k] ? <p className="mt-1 text-xs text-destructive">{errors[k]}</p> : null;
  const inputCls = (k: keyof typeof form) => cn("mt-1", touched && errors[k] && "border-destructive");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold md:text-3xl">Checkout</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Prices and stock are re-checked by our server when you place the order.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="co-name">Full name</Label>
                <Input id="co-name" autoComplete="name" className={inputCls("name")} value={form.name} onChange={set("name")} />
                {fieldError("name")}
              </div>
              <div>
                <Label htmlFor="co-phone">Mobile number</Label>
                <Input id="co-phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={14} placeholder="10-digit mobile" className={inputCls("phone")} value={form.phone} onChange={set("phone")} />
                {fieldError("phone")}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="co-line1">House / flat, street</Label>
                <Input id="co-line1" autoComplete="address-line1" className={inputCls("line1")} value={form.line1} onChange={set("line1")} />
                {fieldError("line1")}
              </div>
              <div>
                <Label htmlFor="co-line2">Area / locality (optional)</Label>
                <Input id="co-line2" autoComplete="address-line2" className="mt-1" value={form.line2} onChange={set("line2")} />
              </div>
              <div>
                <Label htmlFor="co-landmark">Landmark (optional)</Label>
                <Input id="co-landmark" className="mt-1" value={form.landmark} onChange={set("landmark")} />
              </div>
              <div>
                <Label htmlFor="co-city">City</Label>
                <Input id="co-city" autoComplete="address-level2" className={inputCls("city")} value={form.city} onChange={set("city")} />
                {fieldError("city")}
              </div>
              <div>
                <Label htmlFor="co-state">State</Label>
                <select
                  id="co-state"
                  className={cn("mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm", touched && errors.state && "border-destructive")}
                  value={form.state}
                  onChange={set("state")}
                >
                  <option value="">Select state</option>
                  {INDIA_STATES_AND_UTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {fieldError("state")}
              </div>
              <div>
                <Label htmlFor="co-pin">PIN code</Label>
                <Input id="co-pin" inputMode="numeric" autoComplete="postal-code" maxLength={6} className={inputCls("pin")} value={form.pin} onChange={set("pin")} />
                {fieldError("pin")}
              </div>
              <div>
                <Label htmlFor="co-gstin">GSTIN for business invoice (optional)</Label>
                <Input id="co-gstin" maxLength={15} placeholder="22AAAAA0000A1Z5" className={cn(inputCls("gstin"), "uppercase")} value={form.gstin} onChange={set("gstin")} />
                {fieldError("gstin")}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Payment</h2>
            {([
              { id: "cod", icon: Wallet, title: "Cash on Delivery", body: "Pay in cash or UPI to the courier when the parts arrive." },
              { id: "whatsapp", icon: MessageCircle, title: "Confirm on WhatsApp first", body: "Our parts desk messages you to confirm fitment and payment before dispatch." },
            ] as const).map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  pay === o.id ? "border-primary bg-primary/5" : "hover:border-primary/40"
                )}
              >
                <input type="radio" name="pay" className="mt-1" checked={pay === o.id} onChange={() => setPay(o.id)} />
                <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">{o.title}</span>
                  <span className="block text-sm text-muted-foreground">{o.body}</span>
                </span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">Online card / UPI prepayment is not live yet.</p>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary · {itemCount()} pcs</h2>
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.partId} className="flex gap-3 text-sm">
                <img src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.qty} × {formatCurrency(unitPriceForQty(l, l.qty))}</p>
                </div>
                <span className="font-medium">{formatCurrency(unitPriceForQty(l, l.qty) * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable value</span><span>{formatCurrency(total - gst)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(gst)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-primary">Free</span></div>
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
          </div>
          {serverError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
              {/no longer available/i.test(serverError) && (
                <Button variant="link" size="sm" className="h-auto p-0 pl-1 text-destructive underline" asChild>
                  <Link to="/cart">Review cart</Link>
                </Button>
              )}
            </div>
          )}
          <Button className="h-12 w-full" disabled={busy} onClick={placeOrder}>
            {busy ? "Placing order…" : pay === "cod" ? "Place COD order" : "Place order & confirm on WhatsApp"}
          </Button>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> GST invoice generated instantly</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Cancel free until the order is packed</li>
          </ul>
          <Button variant="ghost" size="sm" className="w-full" asChild><Link to="/cart">Edit cart</Link></Button>
          {lines.some((l) => l.stock === 0) && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => lines.filter((l) => l.stock === 0).forEach((l) => removeLine(l.partId))}>
              Remove out-of-stock items
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
