import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Megaphone, MessageSquare, Package, Shield, Store, ArrowLeftRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { createDealerLead } from "../services/new-car-dealer.service";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

const ACCESSORY_CATALOG = [
  { name: "Floor mats (OEM)", price: 4500 },
  { name: "Seat covers premium", price: 8900 },
  { name: "Dash cam + wiring", price: 6500 },
  { name: "Ceramic coating", price: 18000 },
  { name: "Extended warranty 2yr", price: 12000 },
  { name: "RSA kit (1 year)", price: 3500 },
];

function LeadList({
  title,
  description,
  filter,
}: {
  title: string;
  description: string;
  filter: (stage: string) => boolean;
}) {
  const { data, refresh } = useNewCarDealerOS();
  const leads = (data?.leads ?? []).filter((l) => filter(l.stage));

  return (
    <NewCarDealerShell title={title} description={description}>
      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No records yet — move leads in CRM or wait for customer enquiries.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="ncd-list-row">
              <div>
                <Link to={`/dashboard/new-car/leads/${l.id}`} className="font-medium hover:text-primary">
                  {l.customerName}
                </Link>
                <p className="text-sm text-muted-foreground">{l.preferredModel ?? "Model TBD"} · {l.phone}</p>
              </div>
              <Badge variant="outline">{l.source}</Badge>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => void refresh()}>
        Refresh
      </Button>
    </NewCarDealerShell>
  );
}

export function NewCarInsurancePage() {
  useEffect(() => setPageMeta({ title: "Insurance hub" }), []);
  return (
    <NewCarDealerShell
      title="Insurance hub"
      description="Compare policies, renewals and claims — integrated with Motorcart insurance marketplace."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ncd-panel">
          <Shield className="mb-2 h-5 w-5 text-primary" />
          <p className="font-semibold">New policy quotes</p>
          <p className="mt-1 text-sm text-muted-foreground">Share quote links with booking customers.</p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/insurance">Open insurance marketplace</Link>
          </Button>
        </div>
        <div className="ncd-panel">
          <p className="font-semibold">Renewals & claims</p>
          <p className="mt-1 text-sm text-muted-foreground">Track renewal dates from delivered customers.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/insurance/renew">Renewals</Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/insurance/claims">Claims</Link>
            </Button>
          </div>
        </div>
      </div>
    </NewCarDealerShell>
  );
}

export function NewCarTestDrivesPage() {
  useEffect(() => setPageMeta({ title: "Test drives" }), []);
  return (
    <LeadList
      title="Test drive calendar"
      description="Leads in test-drive stage — schedule slots and assign vehicles."
      filter={(s) => s === "test_drive"}
    />
  );
}

export function NewCarRtoPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "RTO & documents" }), []);
  const delivered = (data?.deliveries ?? []);

  return (
    <NewCarDealerShell title="RTO & documents" description="RC, temp registration, HSRP and handover dossier.">
      {delivered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Delivered customers appear here for RC tracking.</p>
      ) : (
        <ul className="space-y-3">
          {delivered.map((d) => (
            <li key={d.id} className="ncd-list-row">
              <div>
                <p className="font-medium">{d.customerName}</p>
                <p className="text-sm text-muted-foreground">{d.vehicleLabel}</p>
              </div>
              <div className="text-right text-sm">
                <p>RC: {d.rcStatus}</p>
                <p className="text-muted-foreground">PDI {d.pdiComplete ? "complete" : "pending"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-6 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
        {["RC application", "Temp registration", "HSRP", "FASTag", "Insurance copy", "PUC"].map((step) => (
          <li key={step} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
            <FileText className="h-4 w-4 shrink-0" /> {step}
          </li>
        ))}
      </ul>
    </NewCarDealerShell>
  );
}

export function NewCarCustomersPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Customer 360" }), []);
  const customers = (data?.leads ?? []).filter((l) => l.stage === "delivered");

  return (
    <NewCarDealerShell title="Customer 360" description="Delivered buyers — service, insurance and referral history.">
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Mark leads as Delivered in CRM to build your customer base.</p>
      ) : (
        <ul className="space-y-3">
          {customers.map((c) => (
            <li key={c.id} className="ncd-list-row">
              <div>
                <Link to={`/dashboard/new-car/leads/${c.id}`} className="font-medium hover:text-primary">
                  {c.customerName}
                </Link>
                <p className="text-sm text-muted-foreground">{c.preferredModel ?? "—"} · {c.phone}</p>
              </div>
              <Badge variant="secondary">Delivered</Badge>
            </li>
          ))}
        </ul>
      )}
    </NewCarDealerShell>
  );
}

export function NewCarWhatsAppPage() {
  useEffect(() => setPageMeta({ title: "WhatsApp CRM" }), []);
  return (
    <NewCarDealerShell
      title="WhatsApp desk"
      description="Reply to enquiries and share brochures from your dealer WhatsApp workspace."
    >
      <p className="text-sm text-muted-foreground">
        Use the shared Dealer OS WhatsApp desk for templates, quick replies and lead follow-ups.
      </p>
      <Button className="mt-4 rounded-xl" asChild>
        <Link to="/dashboard/dealer/whatsapp">
          <MessageSquare className="mr-1 h-4 w-4" /> Open WhatsApp desk
        </Link>
      </Button>
    </NewCarDealerShell>
  );
}

export function NewCarAnalyticsPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Analytics" }), []);
  const leads = data?.leads ?? [];
  const inventory = data?.inventory ?? [];
  const financeLeads = leads.filter((l) => l.financeInterest).length;
  const insuranceLeads = leads.filter((l) => l.insuranceInterest).length;
  const financePct = leads.length ? Math.round((financeLeads / leads.length) * 100) : 0;
  const insurancePct = leads.length ? Math.round((insuranceLeads / leads.length) * 100) : 0;
  const topModel = inventory[0] ? `${inventory[0].brand} ${inventory[0].model}` : "—";
  const slowStock = inventory.find((i) => i.stockHealth === "slow_moving");

  return (
    <NewCarDealerShell title="Analytics center" description="Real metrics from your stock and CRM pipeline.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ncd-panel">
          <p className="text-sm text-muted-foreground">In stock</p>
          <p className="text-3xl font-bold">{inventory.length}</p>
        </div>
        <div className="ncd-panel">
          <p className="text-sm text-muted-foreground">Open leads</p>
          <p className="text-3xl font-bold">{leads.length}</p>
        </div>
        <div className="ncd-panel">
          <p className="text-sm text-muted-foreground">Finance interest</p>
          <p className="text-3xl font-bold">{financePct}%</p>
        </div>
        <div className="ncd-panel">
          <p className="text-sm text-muted-foreground">Insurance interest</p>
          <p className="text-3xl font-bold">{insurancePct}%</p>
        </div>
        <div className="ncd-panel sm:col-span-2">
          <p className="text-sm text-muted-foreground">Latest stock model</p>
          <p className="text-xl font-bold">{topModel}</p>
        </div>
        <div className="ncd-panel sm:col-span-2">
          <p className="text-sm text-muted-foreground">Watch list</p>
          <p className="text-xl font-bold">{slowStock ? `${slowStock.brand} ${slowStock.model}` : "None flagged"}</p>
        </div>
      </div>
    </NewCarDealerShell>
  );
}

export function NewCarMarketingPage() {
  useEffect(() => setPageMeta({ title: "Marketing" }), []);
  return (
    <NewCarDealerShell title="Marketing center" description="Campaigns, creatives and lead capture forms.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ncd-panel">
          <Megaphone className="mb-2 h-5 w-5" />
          <p className="font-semibold">Growth CRM</p>
          <p className="text-sm text-muted-foreground">Design posters, WhatsApp creatives and social schedules.</p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/dashboard/growth">Open Growth workspace</Link>
          </Button>
        </div>
        <div className="ncd-panel">
          <p className="font-semibold">Public showroom link</p>
          <p className="text-sm text-muted-foreground">Share on Instagram, WhatsApp status and Google Business.</p>
          <Button variant="outline" className="mt-3 rounded-xl" asChild>
            <Link to="/buy/cars/new">Copy public listing</Link>
          </Button>
        </div>
      </div>
    </NewCarDealerShell>
  );
}

export function NewCarExchangePage() {
  const { dealer, refresh } = useNewCarDealerOS();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setPageMeta({ title: "Exchange" }), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer?.id || phone.replace(/\D/g, "").length < 10) {
      toast.error("Valid phone required");
      return;
    }
    setLoading(true);
    const { error } = await createDealerLead(dealer.id, {
      customerName: name || "Exchange enquiry",
      phone,
      source: "exchange",
      tradeIn,
      stage: "new",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not save");
      return;
    }
    toast.success("Exchange lead added to CRM");
    setName("");
    setPhone("");
    setTradeIn("");
    void refresh();
  };

  return (
    <NewCarDealerShell title="Exchange cars" description="Capture trade-in enquiries — valuation via inspection queue.">
      <form onSubmit={onSubmit} className="ncd-panel max-w-lg space-y-3">
        <div>
          <Label htmlFor="ex-name">Customer name</Label>
          <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ex-phone">Mobile</Label>
          <Input id="ex-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ex-car">Current car (year, model, km)</Label>
          <Input id="ex-car" value={tradeIn} onChange={(e) => setTradeIn(e.target.value)} placeholder="2019 Swift VDI 45k km" />
        </div>
        <Button type="submit" className="rounded-xl" disabled={loading || !dealer?.id}>
          <ArrowLeftRight className="mr-1 h-4 w-4" /> Add exchange lead
        </Button>
      </form>
    </NewCarDealerShell>
  );
}

export function NewCarAiPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "AI assistant" }), []);
  return (
    <NewCarDealerShell title="AI business assistant" description="Demand signals and stock actions from your live data.">
      <ul className="space-y-3">
        {(data?.insights ?? []).map((i) => (
          <li key={i.id} className="ncd-ai-card">
            <p className="font-semibold">{i.title}</p>
            <p className="text-sm text-muted-foreground">{i.summary}</p>
            {i.actionUrl ? (
              <Button size="sm" variant="link" className="mt-1 h-auto p-0" asChild>
                <Link to={i.actionUrl}>{i.actionLabel ?? "Open"}</Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </NewCarDealerShell>
  );
}

export function NewCarStorefrontPage() {
  const { data, dealer } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Showroom website" }), []);

  return (
    <NewCarDealerShell title="Showroom website" description="Your public presence on Motorcart marketplace.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ncd-panel">
          <Store className="mb-2 h-5 w-5" />
          <p className="font-semibold">{data?.showroom.name ?? dealer?.name ?? "Your showroom"}</p>
          <p className="text-sm text-muted-foreground">{inventoryCount(data)} models live on marketplace</p>
          <Button className="mt-3 rounded-xl" asChild>
            <Link to="/buy/cars/new">View public new cars page</Link>
          </Button>
        </div>
        <div className="ncd-panel">
          <p className="font-semibold">Storefront settings</p>
          <p className="text-sm text-muted-foreground">Logo, tagline, contact and team.</p>
          <Button variant="outline" className="mt-3 rounded-xl" asChild>
            <Link to="/dashboard/dealer/storefront">Edit storefront</Link>
          </Button>
        </div>
      </div>
    </NewCarDealerShell>
  );
}

function inventoryCount(data: ReturnType<typeof useNewCarDealerOS>["data"]) {
  return data?.inventory.length ?? 0;
}

export function NewCarAccessoriesPage() {
  useEffect(() => setPageMeta({ title: "Accessories" }), []);
  return (
    <NewCarDealerShell title="Accessories & add-ons" description="Attach at booking — improves margin per delivery.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {ACCESSORY_CATALOG.map((a) => (
          <li key={a.name} className="ncd-list-row">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{a.name}</span>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(a.price)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Add accessory lines to booking notes in Lead CRM. Paid fitment partners can be enabled later.
      </p>
    </NewCarDealerShell>
  );
}