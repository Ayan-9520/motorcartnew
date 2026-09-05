import type { LeadWithMeta, ListingPerformance } from "../types";
import type { CRMStats } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildListingPerformance(
  vehicles: { id: string; title: string; status: string; price: number }[],
  leads: LeadWithMeta[] = []
): ListingPerformance[] {
  return vehicles.map((v) => {
    const enquiries = leads.filter(
      (l) => l.vehicleInterest === v.title || (l as LeadWithMeta & { vehicleId?: string }).vehicleId === v.id
    ).length;
    return {
      vehicleId: v.id,
      title: v.title,
      views: 0,
      enquiries,
      whatsappClicks: 0,
      status: v.status,
    };
  });
}

export function getHotInventory(performance: ListingPerformance[], limit = 5): ListingPerformance[] {
  return [...performance]
    .sort((a, b) => b.views + b.enquiries * 8 - (a.views + a.enquiries * 8))
    .slice(0, limit);
}

export type LeadFunnelStage = {
  id: string;
  label: string;
  count: number;
  color: string;
};

export function getLeadFunnel(leads: LeadWithMeta[]): LeadFunnelStage[] {
  const newCount = leads.filter((l) => l.status === "new").length;
  const followUp = leads.filter((l) => l.status === "contacted" || l.status === "qualified").length;
  const closed = leads.filter((l) => l.status === "converted").length;
  const lost = leads.filter((l) => l.status === "lost").length;

  return [
    { id: "new", label: "New leads", count: newCount, color: "hsl(var(--primary))" },
    { id: "followup", label: "Follow-up", count: followUp, color: "#f59e0b" },
    { id: "closed", label: "Closed", count: closed, color: "#16a34a" },
    { id: "lost", label: "Lost", count: lost, color: "#94a3b8" },
  ];
}

export function buildMonthlyLeadSeries(leads: { createdAt: string }[]): { month: string; leads: number }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const count = leads.filter((l) => {
      const c = new Date(l.createdAt);
      return `${c.getFullYear()}-${c.getMonth()}` === key;
    }).length;
    return { month: MONTHS[d.getMonth()], leads: count };
  });
}

/** Monthly sale dates are not stored. Do not fabricate a trend from sold totals. */
export function buildMonthlyRevenueSeries(
  _vehicles: { status: string; price: number; title?: string }[] = []
): { month: string; revenue: number }[] {
  return Array.from({ length: 6 }, (_, i) => ({
    month: MONTHS[(new Date().getMonth() - (5 - i) + 12) % 12],
    revenue: 0,
  }));
}

export type DealerNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "lead" | "auction" | "inventory" | "system";
  href?: string;
};

export function buildDealerNotifications(
  leads: LeadWithMeta[],
  activeAuctions: number,
  newLeads: number
): DealerNotification[] {
  const items: DealerNotification[] = [];

  leads
    .filter((l) => l.status === "new")
    .slice(0, 3)
    .forEach((l) => {
      items.push({
        id: `lead-${l.id}`,
        title: `New lead: ${l.name}`,
        body: l.vehicleInterest ?? "General enquiry · respond within 15 min",
        time: new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
        type: "lead",
        href: "/dashboard/dealer/leads",
      });
    });

  if (activeAuctions > 0) {
    items.push({
      id: "auction-live",
      title: `${activeAuctions} live auction${activeAuctions > 1 ? "s" : ""}`,
      body: "Review lots and place bids from the auction desk.",
      time: "Now",
      type: "auction",
      href: "/dashboard/dealer/auctions",
    });
  }

  if (newLeads > 0) {
    items.push({
      id: "leads-summary",
      title: `${newLeads} leads need follow-up`,
      body: "Pipeline conversion improves with same-day WhatsApp replies.",
      time: "Today",
      type: "system",
      href: "/dashboard/dealer/whatsapp",
    });
  }

  return items.slice(0, 8);
}

export function summarizeAnalytics(
  stats: CRMStats,
  performance: ListingPerformance[],
  leads: LeadWithMeta[],
  vehicles: { status: string; price: number }[] = []
) {
  return {
    hotInventory: getHotInventory(performance),
    funnel: getLeadFunnel(leads),
    monthlyLeads: buildMonthlyLeadSeries(leads),
    monthlyRevenue: buildMonthlyRevenueSeries(
      vehicles.length
        ? vehicles
        : performance.map((p) => ({ status: p.status, price: 0, title: p.title }))
    ),
    totalViews: performance.reduce((s, p) => s + p.views, 0),
    totalEnquiries: performance.reduce((s, p) => s + p.enquiries, 0),
    conversionPct: stats.conversionRate,
  };
}
