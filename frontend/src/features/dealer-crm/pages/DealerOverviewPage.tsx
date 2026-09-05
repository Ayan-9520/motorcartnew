import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Calendar,
  Car,
  FileText,
  Gavel,
  IndianRupee,
  Percent,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "../components/StatCard";
import { LeadTable } from "../components/LeadTable";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { DealerNotificationsPanel } from "../components/DealerNotificationsPanel";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { useDealer } from "../hooks/useDealer";
import {
  buildAnalyticsFromData,
  fetchDealerAuctionEntries,
  fetchDealerEnterprise,
  fetchDealerFinanceStats,
} from "../services/dealer-enterprise.service";
import { buildDealerNotifications, summarizeAnalytics } from "../lib/dealer-analytics";
import { planFromTier } from "../data/subscription-plans";
import { DEALER_TYPE_LABELS, type DealerType } from "../types";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const QUICK_LINKS = [
  { label: "Inventory", href: "/dashboard/dealer/inventory", icon: Car },
  { label: "Lead CRM", href: "/dashboard/dealer/leads", icon: Users },
  { label: "Quotations", href: "/dashboard/dealer/quotations", icon: FileText },
  { label: "Test drives", href: "/dashboard/dealer/test-drives", icon: Calendar },
  { label: "Auctions", href: "/dashboard/dealer/auctions", icon: Gavel },
  { label: "Analytics", href: "/dashboard/dealer/analytics", icon: BarChart3 },
];

export function DealerOverviewPage() {
  const { dealer: crmDealer, stats, leads, listingPerformance, loading, refetch, vehicles } = useDealerCRM();
  const { dealer } = useDealer();
  const [tier, setTier] = useState("free");
  const [auctionCount, setAuctionCount] = useState(0);
  const [chartLeads, setChartLeads] = useState<{ month: string; leads: number }[]>([]);
  const [chartRevenue, setChartRevenue] = useState<{ month: string; revenue: number }[]>([]);

  const analytics = useMemo(
    () => summarizeAnalytics(stats, listingPerformance, leads, vehicles),
    [stats, listingPerformance, leads, vehicles]
  );

  const notifications = useMemo(
    () => buildDealerNotifications(leads, auctionCount, stats.newLeads),
    [leads, auctionCount, stats.newLeads]
  );

  useEffect(() => {
    setPageMeta({ title: "Dealer OS" });
    if (!dealer) return;
    void (async () => {
      const ent = await fetchDealerEnterprise(dealer.id);
      if (ent) setTier(ent.subscriptionTier);
      const finance = await fetchDealerFinanceStats(dealer.id);
      const auctions = await fetchDealerAuctionEntries(dealer.id);
      setAuctionCount(auctions.length);
      const built = buildAnalyticsFromData(
        leads.map((l) => ({ status: l.status, created_at: l.createdAt })),
        [],
        finance,
        auctions.length
      );
      setChartLeads(built.monthlyLeads);
      setChartRevenue(built.monthlyRevenue);
    })();
  }, [dealer, leads, listingPerformance]);

  if (loading && !crmDealer) {
    return <p className="text-muted-foreground">Loading dealer OS…</p>;
  }

  const typeLabel = crmDealer?.dealerType
    ? DEALER_TYPE_LABELS[crmDealer.dealerType as DealerType] ?? crmDealer.dealerType
    : "Dealer";
  const plan = planFromTier(tier);

  return (
    <DealerConsoleShell
      title={crmDealer?.name ?? "Dealer OS"}
      description={`${typeLabel} · ${crmDealer?.city}, ${crmDealer?.state} · ${plan.name} plan`}
      crumbs={[{ label: "Overview" }]}
      actions={
        <Button size="sm" asChild>
          <Link to="/dashboard/dealer/leads">Open CRM</Link>
        </Button>
      }
    >
      <div className="dealer-os-quick-grid">
        {QUICK_LINKS.map((q) => (
          <Link key={q.href} to={q.href} className="dealer-os-quick-link">
            <q.icon className="h-5 w-5 text-primary" />
            <span>{q.label}</span>
            <ArrowRight className="h-4 w-4 ml-auto opacity-40" />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sold listings value" value={formatCurrency(stats.revenueMtd)} icon={IndianRupee} />
        <StatCard label="Leads" value={stats.totalLeads} icon={Users} change={`${stats.newLeads} new`} />
        <StatCard label="Vehicles live" value={stats.activeListings} icon={Car} change={`${stats.totalListings} total`} />
        <StatCard label="Conversion" value={`${stats.conversionRate}%`} icon={Percent} trend="up" />
        <StatCard label="Active auctions" value={auctionCount} icon={Gavel} />
        <StatCard
          label="Notifications"
          value={notifications.length}
          icon={Bell}
          change={`${stats.whatsappChats} WA clicks`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <StatCard label="Follow-up pipeline" value={stats.followUpLeads} icon={TrendingUp} change={`${stats.lostLeads} lost`} />
          <StatCard label="Sold units" value={stats.soldListings} icon={Car} change={`${stats.featuredListings} featured`} />
        </div>
        <DealerNotificationsPanel items={notifications} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dealer-os-card">
          <h2 className="font-semibold text-lg mb-4">Lead pipeline (6 mo)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartLeads.length ? chartLeads : analytics.monthlyLeads}>
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="dealer-os-card">
          <h2 className="font-semibold text-lg mb-4">Monthly sales (₹ Lakhs)</h2>
          <p className="text-sm text-muted-foreground -mt-2 mb-4">
            Month-by-month sales dates are not recorded yet.
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRevenue.length ? chartRevenue : analytics.monthlyRevenue}>
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dealer-os-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent leads</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/dealer/leads">View CRM</Link>
          </Button>
        </div>
        <LeadTable leads={leads.slice(0, 6)} onStatusChange={() => refetch()} />
      </div>

      <div className="dealer-os-card">
        <h2 className="font-semibold mb-3">Hot inventory</h2>
        <table className="dealer-os-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Views</th>
              <th>Enquiries</th>
              <th>WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {analytics.hotInventory.slice(0, 5).map((p) => (
              <tr key={p.vehicleId}>
                <td className="font-medium max-w-[200px] truncate">{p.title}</td>
                <td>{p.views.toLocaleString()}</td>
                <td>{p.enquiries}</td>
                <td>{p.whatsappClicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DealerConsoleShell>
  );
}
