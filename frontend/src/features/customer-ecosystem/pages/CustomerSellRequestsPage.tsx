import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { vehicleDetailPath } from "@/lib/vehicle-utils";
import { fetchDealerVehicles, updateVehicle } from "@/services/vehicle.service";
import type { VehicleListing } from "@/types/vehicle";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import {
  fetchListingEnquiries,
  fetchSellRequests,
  mutateSaleOffer,
  mutateSellRequest,
  type ListingEnquiry,
} from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

const LISTING_STATUS_LABEL: Record<string, string> = {
  available: "Live",
  draft: "Paused",
  reserved: "Reserved",
  sold: "Sold",
};

function MyListings() {
  const { user } = useAuth();
  const [items, setItems] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<ListingEnquiry[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [list, leads] = await Promise.all([fetchDealerVehicles(user.id), fetchListingEnquiries()]);
    setItems(list.filter((v) => v.condition !== "new"));
    setEnquiries(leads);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function change(v: VehicleListing, patch: { status?: string; price?: number }, done: string) {
    setBusyId(v.id);
    const { error } = await updateVehicle(v.id, patch);
    setBusyId(null);
    if (error) {
      toast.error(error.message ?? "Could not update listing");
      return;
    }
    toast.success(done);
    await load();
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">My listings</h2>
        <Button size="sm" variant="outline" asChild>
          <Link to="/sell">List another vehicle</Link>
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="cos-empty">
          No listings yet. <Link to="/sell" className="text-primary underline">List your vehicle</Link>
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((v) => {
          const status = v.status ?? "available";
          const busy = busyId === v.id;
          const priceInput = prices[v.id] ?? String(v.price || "");
          const buyers = enquiries.filter((e) => e.vehicleId === v.id);
          return (
            <li key={v.id} className="rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={vehicleDetailPath(v)} className="font-medium hover:text-primary">
                    {v.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {v.kmsDriven.toLocaleString("en-IN")} km · {v.city} · {formatCurrency(v.price)}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {LISTING_STATUS_LABEL[status] ?? status}
                </span>
              </div>
              {status !== "sold" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="h-9 w-36"
                    value={priceInput}
                    onChange={(e) => setPrices((p) => ({ ...p, [v.id]: e.target.value }))}
                    aria-label="Price"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !(Number(priceInput) > 0) || Number(priceInput) === v.price}
                    onClick={() => void change(v, { price: Number(priceInput) }, "Price updated")}
                  >
                    Save price
                  </Button>
                  {status === "available" ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void change(v, { status: "draft" }, "Listing paused")}>
                      Pause
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void change(v, { status: "available" }, "Listing is live")}>
                      Make live
                    </Button>
                  )}
                  <Button size="sm" disabled={busy} onClick={() => void change(v, { status: "sold" }, "Marked as sold")}>
                    Mark sold
                  </Button>
                </div>
              ) : null}
              {buyers.length > 0 ? (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Buyer enquiries ({buyers.length})
                  </p>
                  <ul className="mt-1 space-y-1">
                    {buyers.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          {b.name} · {new Date(b.createdAt).toLocaleDateString("en-IN")}
                          {b.notes ? ` · ${b.notes}` : ""}
                        </span>
                        <a href={`tel:${b.phone}`} className="font-medium text-primary hover:underline">
                          {b.phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CustomerSellRequestsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ brand: "", model: "", year: 2020, kmsDriven: 20000, city: "Pune", state: "MH" });

  async function refresh() {
    setRows(await fetchSellRequests());
  }

  useEffect(() => {
    setPageMeta({ title: "Sell my vehicle" });
    void refresh();
  }, []);

  return (
    <CustomerEcosystemPage
      title="Sell my vehicle"
      description="Create a sell request, receive partner valuations and dealer purchase offers. MotorCart does not auto-pick the highest offer. Settlement is not automatic."
    >
      <MyListings />
      <h2 className="mb-3 text-base font-semibold">Dealer offers</h2>
      <form
        className="mb-6 grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void mutateSellRequest(form).then(refresh);
        }}
      >
        <Input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Button type="submit">Save draft</Button>
      </form>
      <ul className="space-y-4">
        {rows.length === 0 ? <p className="cos-empty">No sell requests yet.</p> : null}
        {rows.map((r) => {
          const offers = (r.offers as Array<Record<string, unknown>> | undefined) ?? [];
          const vals = (r.valuations as Array<Record<string, unknown>> | undefined) ?? [];
          return (
            <li key={String(r.id)} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">
                {String(r.brand)} {String(r.model)} · {String(r.status)}
              </p>
              <div className="mt-2 flex gap-2">
                {r.status === "DRAFT" ? (
                  <Button size="sm" onClick={() => void mutateSellRequest({ action: "submit", id: r.id }).then(refresh)}>
                    Submit for offers
                  </Button>
                ) : null}
                {r.status !== "CANCELLED" ? (
                  <Button size="sm" variant="outline" onClick={() => void mutateSellRequest({ action: "cancel", id: r.id }).then(refresh)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 text-xs uppercase text-muted-foreground">Valuations (indicative, not a purchase offer)</p>
              {vals.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
              {vals.map((v) => (
                <p key={String(v.id)}>
                  ₹{String(v.amountMin)}–₹{String(v.amountMax)} · {String(v.status)}
                </p>
              ))}
              <p className="mt-3 text-xs uppercase text-muted-foreground">Dealer offers</p>
              {offers.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
              {offers.map((o) => (
                <div key={String(o.id)} className="mt-1 flex items-center justify-between gap-2">
                  <span>
                    ₹{String(o.amount)} · {String(o.status)} · {o.validUntil ? String(o.validUntil) : "no expiry"}
                  </span>
                  {o.status === "ACTIVE" ? (
                    <Button size="sm" onClick={() => void mutateSaleOffer({ action: "accept", id: o.id }).then(refresh)}>
                      Accept
                    </Button>
                  ) : null}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </CustomerEcosystemPage>
  );
}
