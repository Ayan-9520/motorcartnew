import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/features/service-booking/components/BookingCalendar";
import { useWorkshopDesk } from "@/features/service-booking/hooks/useWorkshopDesk";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { ShDataTable } from "../components/ShDataTable";
import { ServicePartnerShell } from "../components/ServicePartnerShell";
import { useServicePartnerOS } from "../hooks/useServicePartnerOS";
import { setPageMeta } from "@/utils/seo";

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function ShAiPage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "AI insights" }), []);
  return (
    <ServicePartnerShell title="AI workshop insights" description="Demand · delays · stock · productivity">
      <ul className="space-y-3">
        {(data?.insights ?? []).map((i) => (
          <li key={i.id} className="sh-ai-card">
            <p className="font-semibold">{i.title}</p>
            <p className="text-sm text-muted-foreground">{i.summary}</p>
            {i.actionUrl ? <Link to={i.actionUrl} className="mt-1 text-xs text-primary hover:underline">Open</Link> : null}
          </li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}

export function ShNotificationsPage() {
  useEffect(() => setPageMeta({ title: "Notifications" }), []);
  const items = [
    { title: "Estimate approved — JOB-2405-882", time: "5m ago" },
    { title: "Pickup driver en route", time: "22m ago" },
    { title: "Low stock: brake pads", time: "1h ago" },
  ];
  return (
    <ServicePartnerShell title="Notifications" description="Orders · pickups · stock · KYC">
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.title} className="sh-glass-card flex justify-between text-sm">
            <span>{n.title}</span>
            <span className="text-muted-foreground">{n.time}</span>
          </li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}

export function ShCalendarPage() {
  const { user } = useAuth();
  const desk = useWorkshopDesk(user?.id, user?.role === "admin" || user?.role === "super_admin");
  useEffect(() => setPageMeta({ title: "Workshop calendar" }), []);
  return (
    <ServicePartnerShell title="Workshop calendar" description="Bookings · pickups · deliveries · holidays">
      {desk.centerId ? (
        <BookingCalendar bookings={desk.bookings} days={14} />
      ) : (
        <p className="text-muted-foreground">Connect service center for live calendar.</p>
      )}
    </ServicePartnerShell>
  );
}

export function ShCrmPage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "Customer CRM" }), []);
  return (
    <ServicePartnerShell title="Customer CRM" description="History · loyalty · insurance · PUC">
      <ShDataTable
        rows={data?.customers ?? []}
        rowKey={(c) => c.id}
        columns={[
          { key: "n", header: "Customer", cell: (c) => c.name },
          { key: "p", header: "Phone", cell: (c) => c.phone },
          { key: "v", header: "Vehicles", cell: (c) => c.vehicles },
          { key: "vis", header: "Visits", cell: (c) => c.visits },
          { key: "loy", header: "Points", cell: (c) => c.loyaltyPoints },
          { key: "last", header: "Last visit", cell: (c) => c.lastVisit },
        ]}
      />
    </ServicePartnerShell>
  );
}

export function ShCrmRepeatPage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "Repeat customers" }), []);
  const sorted = [...(data?.customers ?? [])].sort((a, b) => b.visits - a.visits);
  return (
    <ServicePartnerShell title="Repeat customers" description="LTV · retention · churn risk">
      <ShDataTable
        rows={sorted}
        rowKey={(c) => c.id}
        columns={[
          { key: "n", header: "Customer", cell: (c) => c.name },
          { key: "vis", header: "Visits", cell: (c) => c.visits },
          { key: "loy", header: "Loyalty", cell: (c) => c.loyaltyPoints },
        ]}
      />
    </ServicePartnerShell>
  );
}

export function ShProfilePage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "Workshop profile" }), []);
  const p = data?.profile;
  return (
    <ServicePartnerShell title="Workshop profile" description="Logo · GST · hours · branches · reviews">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="sh-glass-card">
          <h3 className="sh-panel__title">Business</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{p?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">City</dt><dd>{p?.city}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Rating</dt><dd>{p?.rating}★</dd></div>
          </dl>
          <Button variant="link" className="mt-2 h-auto p-0 text-primary" asChild>
            <Link to="/dashboard/service/kyc">KYC verification</Link>
          </Button>
        </section>
        <section className="sh-glass-card">
          <h3 className="sh-panel__title">Service categories</h3>
          <p className="mt-2 text-sm text-muted-foreground">Periodic · AC · body · detailing · EV · RSA</p>
        </section>
        <section className="sh-glass-card lg:col-span-2">
          <h3 className="sh-panel__title">Pickup radius & insurance tie-ups</h3>
          <p className="text-sm text-muted-foreground">Configure pickup radius and insurer partners from workshop settings when available.</p>
        </section>
      </div>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsHubPage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "Analytics" }), []);
  const completed = data?.metrics.find((m) => m.key === "completed")?.value ?? 0;
  const active = data?.profile.activeJobs ?? 0;
  return (
    <ServicePartnerShell title="Analytics center" description="Revenue · technicians · retention · branches">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="sh-glass-card">
          <p className="text-sm text-muted-foreground">Active jobs</p>
          <p className="mt-2 text-4xl font-bold text-primary">{active}</p>
        </section>
        <section className="sh-glass-card">
          <p className="text-sm text-muted-foreground">Completed jobs</p>
          <p className="mt-2 text-4xl font-bold text-primary">{completed}</p>
        </section>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Revenue today {formatCurrency(data?.revenueToday ?? 0)} · Month {formatCurrency(data?.revenueMonth ?? 0)}
      </p>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsRevenuePage() {
  const { data } = useServicePartnerOS();
  useEffect(() => setPageMeta({ title: "Revenue analytics" }), []);
  return (
    <ServicePartnerShell title="Revenue analytics" description="Daily · monthly · AOV · branch">
      <EmptyHint>
        Revenue today: {formatCurrency(data?.revenueToday ?? 0)}. Detailed daily charts need more completed paid bookings.
      </EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShFinanceInvoicesPage() {
  useEffect(() => setPageMeta({ title: "GST invoices" }), []);
  return (
    <ServicePartnerShell title="GST invoices" description="GSTR-ready · e-invoice · WhatsApp share">
      <EmptyHint>No GST invoices issued yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShWhatsAppPage() {
  useEffect(() => setPageMeta({ title: "WhatsApp" }), []);
  const flows = ["Booking confirmation", "Pickup updates", "Inspection report", "Estimate approval", "Invoice PDF", "Service reminder", "Feedback request"];
  return (
    <ServicePartnerShell title="WhatsApp automation" description="Templates · triggers · catalogue">
      <ul className="grid gap-2 sm:grid-cols-2">
        {flows.map((f) => (
          <li key={f} className="sh-glass-card text-sm font-medium">{f}</li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}

export function ShPickupPage() {
  useEffect(() => setPageMeta({ title: "Pickup & drop" }), []);
  return (
    <ServicePartnerShell title="Pickup & drop" description="Driver · OTP · live tracking · POD">
      <EmptyHint>No pickup requests yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShPartsInventoryPage() {
  useEffect(() => setPageMeta({ title: "Parts inventory" }), []);
  return (
    <ServicePartnerShell title="Spare parts inventory" description="Issue to jobs · valuation · vendors">
      <EmptyHint>No spare parts inventory linked yet. Stock rows appear when workshop parts are connected.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShInsuranceClaimsPage() {
  useEffect(() => setPageMeta({ title: "Insurance claims" }), []);
  return (
    <ServicePartnerShell title="Insurance claims" description="Survey · approval · accidental workflow">
      <EmptyHint>No insurance claims on file.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShServicesCatalogPage({ title, slug }: { title: string; slug: string }) {
  useEffect(() => setPageMeta({ title }), [title]);
  return (
    <ServicePartnerShell title={title} description={`Service package · ${slug}`}>
      <EmptyHint>No service packages published yet for this category.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShLiveOpsPage() {
  useEffect(() => setPageMeta({ title: "Live operations" }), []);
  const { data } = useServicePartnerOS();
  const active = data?.profile.activeJobs ?? 0;
  return (
    <ServicePartnerShell title="Live operations" description="Bays · pickups · in-progress jobs">
      <p className="text-sm text-muted-foreground">
        {active > 0
          ? `${active} active job${active === 1 ? "" : "s"} on the workshop board.`
          : "No vehicles on the floor right now."}
      </p>
      <Button className="mt-4 rounded-xl bg-green-600 hover:bg-green-500" asChild>
        <Link to="/dashboard/service/workshop/kanban">Open workflow board</Link>
      </Button>
    </ServicePartnerShell>
  );
}

export function ShSettingsPage() {
  useEffect(() => setPageMeta({ title: "Settings" }), []);
  return (
    <ServicePartnerShell title="Integrations & settings" description="API · bays · notifications">
      <ul className="sh-feature-list">
        {["WhatsApp Business API", "Payment gateway", "Google Maps", "Insurance survey API"].map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}

export function ShKycPage() {
  useEffect(() => setPageMeta({ title: "KYC" }), []);
  const steps = ["GST certificate", "Workshop license", "Fire NOC", "Bank proof", "Owner ID"];
  return (
    <ServicePartnerShell title="KYC verification" description="Verified workshop badge">
      <ul className="space-y-2 max-w-md">
        {steps.map((s, i) => (
          <li key={s} className="sh-glass-card flex justify-between text-sm">
            <span>{s}</span>
            <span className="text-primary">{i < 3 ? "Verified" : "Pending"}</span>
          </li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}

export function ShTeamPage() {
  useEffect(() => setPageMeta({ title: "Team" }), []);
  const team = [
    { name: "Owner", role: "owner" },
    { name: "Rajesh M.", role: "branch manager" },
    { name: "Suresh P.", role: "service advisor" },
    { name: "Ravi K.", role: "technician" },
    { name: "Neha G.", role: "pickup driver" },
  ];
  return (
    <ServicePartnerShell title="Team & roles" description="Owner to support executive">
      <ul className="space-y-2">
        {team.map((t) => (
          <li key={t.name} className="sh-glass-card flex justify-between text-sm">
            <span className="font-medium">{t.name}</span>
            <span className="text-muted-foreground">{t.role}</span>
          </li>
        ))}
      </ul>
    </ServicePartnerShell>
  );
}
