import { useEffect, useMemo } from "react";
import { BarChart3, Eye, Flame, Percent, TrendingUp } from "lucide-react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { StatCard } from "../components/StatCard";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { summarizeAnalytics, getLeadFunnel } from "../lib/dealer-analytics";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "#16a34a", "#f59e0b", "#94a3b8"];

export function DealerAnalyticsPage() {
  const { stats, listingPerformance, leads, vehicles } = useDealerCRM();

  const analytics = useMemo(
    () => summarizeAnalytics(stats, listingPerformance, leads, vehicles),
    [stats, listingPerformance, leads, vehicles]
  );

  const funnel = useMemo(() => getLeadFunnel(leads), [leads]);

  useEffect(() => {
    setPageMeta({ title: "Dealer Analytics" });
  }, []);

  const statusPie = [
    { name: "Available", value: stats.activeListings },
    { name: "Sold", value: stats.soldListings },
    { name: "Featured", value: stats.featuredListings },
  ].filter((d) => d.value > 0);

  return (
    <DealerConsoleShell
      title="Analytics"
      description="Lead conversion and sold listings from your CRM. Listing view tracking is not live yet."
      crumbs={[{ label: "Analytics" }]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total views" value={analytics.totalViews.toLocaleString()} icon={Eye} />
        <StatCard label="Enquiries" value={analytics.totalEnquiries} icon={BarChart3} />
        <StatCard label="Conversion" value={`${analytics.conversionPct}%`} icon={Percent} trend="up" />
        <StatCard label="Sold listings value" value={formatCurrency(stats.revenueMtd)} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dealer-os-card">
          <h2 className="font-semibold mb-4">Lead conversion funnel</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="label" fontSize={11} width={72} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dealer-os-card">
          <h2 className="font-semibold mb-4">Inventory breakdown</h2>
          <div className="h-56">
            {statusPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Add inventory to see breakdown</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dealer-os-card">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-primary" /> Hot inventory
          </h2>
          <table className="dealer-os-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Views</th>
                <th>Enquiries</th>
                <th>WA</th>
              </tr>
            </thead>
            <tbody>
              {analytics.hotInventory.map((p) => (
                <tr key={p.vehicleId}>
                  <td className="font-medium max-w-[180px] truncate">{p.title}</td>
                  <td>{p.views.toLocaleString()}</td>
                  <td>{p.enquiries}</td>
                  <td>{p.whatsappClicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dealer-os-card">
          <h2 className="font-semibold mb-4">Monthly sales (₹ Lakhs)</h2>
          <p className="text-sm text-muted-foreground -mt-2 mb-4">
            Month-by-month sales dates are not recorded yet. Use sold listings value above.
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyRevenue}>
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
        <h2 className="font-semibold mb-3">Vehicle views by listing</h2>
        <table className="dealer-os-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Views</th>
              <th>Enquiries</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {listingPerformance.map((p) => (
              <tr key={p.vehicleId}>
                <td className="font-medium max-w-xs truncate">{p.title}</td>
                <td>{p.views.toLocaleString()}</td>
                <td>{p.enquiries}</td>
                <td className="capitalize">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DealerConsoleShell>
  );
}
