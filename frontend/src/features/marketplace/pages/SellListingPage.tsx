import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useVehicleHubStore } from "@/store/vehicleHubStore";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  IndianRupee,
  MapPin,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { createVehicle, type VehicleFormData } from "@/services/vehicle.service";
import { setPageMeta } from "@/utils/seo";
import {
  hubCategoryLabel,
  hubToSellFormDefaults,
  parseHubCategorySlug,
  sellPageTitle,
} from "../lib/route-utils";

function estimateUsedPrice(year: number, kms: number, asking: number): number {
  const age = Math.max(0, new Date().getFullYear() - year);
  const dep = Math.max(0.35, 1 - age * 0.09);
  const kmFactor = Math.max(0.7, 1 - kms / 250_000);
  const base = asking > 0 ? asking : 800_000;
  return Math.round(base * dep * kmFactor);
}

export function SellListingPage() {
  const { category: catParam } = useParams<{ category: string }>();
  const hub = parseHubCategorySlug(catParam);
  const defaults = hub ? hubToSellFormDefaults(hub) : null;
  const setActiveHub = useVehicleHubStore((s) => s.setActiveHub);

  useEffect(() => {
    if (hub) setActiveHub(hub);
  }, [hub, setActiveHub]);

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    variant: "",
    year: new Date().getFullYear() - 3,
    kmsDriven: 25_000,
    price: 0,
    fuelType: "Petrol",
    transmission: "Manual",
    city: "",
    state: "Maharashtra",
    phone: "",
  });

  useEffect(() => {
    if (!hub || !defaults) return;
    setForm((f) => ({
      ...f,
      fuelType: defaults.fuelType ?? f.fuelType,
    }));
    setPageMeta({
      title: sellPageTitle(hub),
      description: `List your ${hubCategoryLabel(hub).toLowerCase()} for free — instant valuation & verified buyers on Motorcart.`,
    });
  }, [hub, defaults]);

  const estimated = useMemo(
    () => estimateUsedPrice(form.year, form.kmsDriven, form.price),
    [form.year, form.kmsDriven, form.price]
  );

  if (!hub || !defaults) {
    return <Navigate to="/sell" replace />;
  }

  const title = sellPageTitle(hub);
  const hubLabel = hubCategoryLabel(hub);

  const buildPayload = (): VehicleFormData => ({
    title: `${form.year} ${form.brand} ${form.model}`.trim(),
    brand: form.brand,
    model: form.model,
    variant: form.variant || undefined,
    year: form.year,
    price: form.price || estimated,
    fuelType: defaults.fuelType ?? form.fuelType,
    transmission: form.transmission,
    bodyType: defaults.bodyType,
    category: defaults.category,
    kmsDriven: form.kmsDriven,
    owners: defaults.owners,
    city: form.city,
    state: form.state,
    condition: "used",
    images: [],
    description: `Owner listing via Motorcart Sell — ${hubLabel}. Contact: ${form.phone}`,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim() || !form.city.trim()) {
      toast.error("Brand, model, and city are required");
      return;
    }
    if (!form.phone.trim() && !isAuthenticated) {
      toast.error("Please add a mobile number");
      return;
    }
    if (!isAuthenticated || !user) {
      toast("Sign in to publish your listing", { icon: "🔐" });
      navigate("/login", { state: { from: location } });
      return;
    }

    setSubmitting(true);
    const { error } = await createVehicle(buildPayload(), user.id);
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Could not submit listing");
      return;
    }

    setSubmitted(true);
    toast.success("Listing submitted successfully!");
  };

  if (submitted) {
    return (
      <div className="marketplace-listing-page min-h-screen">
        <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Listing submitted!</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your {hubLabel.toLowerCase()} listing is under review. Verified buyers will contact you
            shortly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard/dealer">Dealer dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/sell">Sell another vehicle</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-listing-page min-h-screen pb-14">
      <div className="container py-6 md:py-8">
        <nav className="marketplace-breadcrumb mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/sell">Sell</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{hubLabel}</span>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pre-owned vehicles only</p>
            <h1 className="marketplace-listing-title mt-1">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your details — we will share instant valuation and connect you with verified buyers.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Vehicle details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Brand *" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} placeholder="e.g. Hyundai" />
                  <Field label="Model *" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="e.g. Creta" />
                  <Field label="Variant" value={form.variant} onChange={(v) => setForm({ ...form, variant: v })} placeholder="e.g. SX(O)" />
                  <div>
                    <Label>Year</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      min={1995}
                      max={new Date().getFullYear()}
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>KMs driven</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      min={0}
                      value={form.kmsDriven}
                      onChange={(e) => setForm({ ...form, kmsDriven: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Fuel</Label>
                    <select
                      className="mc-input mt-1 w-full"
                      value={form.fuelType}
                      onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                      disabled={!!defaults.fuelType}
                    >
                      {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Transmission</Label>
                    <select
                      className="mc-input mt-1 w-full"
                      value={form.transmission}
                      onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                    >
                      {["Manual", "Automatic", "AMT", "CVT", "DCT"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Price & location</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Expected price (₹)</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      min={0}
                      value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      placeholder="Optional — AI suggests below"
                    />
                  </div>
                  <Field label="City *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="e.g. Mumbai" />
                  <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
                  <Field
                    label={isAuthenticated ? "Phone (optional)" : "Mobile *"}
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    placeholder="10-digit mobile"
                  />
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Photos (coming soon)</p>
                  <p className="text-xs text-muted-foreground">You can submit with listing details for now</p>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={submitting}>
                {submitting ? "Submitting…" : "Publish listing"}
              </Button>
            </form>
          </div>

          <aside className="w-full shrink-0 space-y-4 self-start lg:mt-24 lg:w-80 lg:sticky lg:top-24">
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Instant valuation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{formatCurrency(estimated)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI estimate based on year, kms &amp; market — final offer after inspection.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <IndianRupee className="h-3.5 w-3.5 text-primary" />
                    Zero commission for owners
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    RC &amp; inspection support
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    8,500+ verified buyers
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Motorcart sell is for{" "}
                <strong className="text-foreground">pre-owned vehicles</strong> only. New vehicles are
                listed by dealers through the OEM portal.
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
