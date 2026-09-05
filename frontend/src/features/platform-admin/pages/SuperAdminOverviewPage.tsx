import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Car,
  FileText,
  Gavel,
  LayoutTemplate,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPageMeta } from "@/utils/seo";
import { fetchPlatformOverview } from "../services/platform-admin.service";
import type { PlatformOverview } from "../types";
import { AdminErpShell } from "../components/AdminErpShell";
import { SuperAdminStatGrid } from "../components/SuperAdminStatGrid";

const ERP_MODULES = [
  {
    to: "/dashboard/super-admin/business-approvals",
    label: "Business approvals",
    icon: Store,
    desc: "Approve dealer, DSA, parts & service signups",
  },
  {
    to: "/dashboard/super-admin/finance-approvals",
    label: "Fintech / loans",
    icon: Store,
    desc: "Loan pipeline: process → approve → disburse",
  },
  {
    to: "/dashboard/super-admin/operations",
    label: "How it works",
    icon: Store,
    desc: "Full flow map — where data comes & goes",
  },
  { to: "/dashboard/super-admin/users", label: "User management", icon: Users, desc: "All users, roles & suspension" },
  { to: "/dashboard/super-admin/dealers", label: "Dealer verification", icon: Store, desc: "Dealer docs & storefront" },
  { to: "/dashboard/super-admin/vehicles", label: "Vehicle moderation", icon: Car, desc: "Listings & policy review" },
  { to: "/dashboard/super-admin/auctions", label: "Auction approvals", icon: Gavel, desc: "Go-live & featured lots" },
  { to: "/dashboard/super-admin/fraud", label: "Fraud detection", icon: AlertTriangle, desc: "Risk desk & blocks" },
  { to: "/dashboard/super-admin/featured", label: "Featured inventory", icon: Sparkles, desc: "Homepage curation" },
  { to: "/dashboard/super-admin/cms", label: "CMS", icon: LayoutTemplate, desc: "Pages & legal content" },
  { to: "/dashboard/super-admin/reports", label: "Reports", icon: FileText, desc: "Operational reports from live records" },
  { to: "/dashboard/super-admin/analytics", label: "Revenue analytics", icon: BarChart3, desc: "Recorded invoices & payments only" },
  { to: "/dashboard/super-admin/notifications", label: "Push notifications", icon: Bell, desc: "Campaigns & broadcasts" },
  { to: "/dashboard/super-admin/transactions", label: "All transactions", icon: ArrowLeftRight, desc: "Unified payment ledger" },
];

export function SuperAdminOverviewPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Admin ERP — Motorcart" });
    void fetchPlatformOverview().then(setOverview);
  }, []);

  const o = overview;

  return (
    <AdminErpShell
      title="Command center"
      description="Control all users, listings, approvals, reports, and transactions across Motorcart."
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link to="/">View site</Link>
        </Button>
      }
    >
      {o ? (
        <SuperAdminStatGrid
          stats={[
            { label: "Total users", value: o.totalUsers.toLocaleString("en-IN"), icon: Users },
            { label: "Active users", value: o.activeUsers.toLocaleString("en-IN") },
            { label: "Pending business", value: o.pendingBusiness },
            { label: "Pending loans", value: o.pendingFinance },
            { label: "Disbursed", value: o.loanDisbursedTotal, format: "currency" },
            { label: "Pending KYC", value: o.pendingKyc },
            { label: "Dealer queue", value: o.pendingDealers },
            { label: "Live listings", value: o.listingsLive.toLocaleString("en-IN") },
            { label: "Organizations", value: (o.organizations ?? 0).toLocaleString("en-IN") },
            { label: "Leads", value: (o.leads ?? 0).toLocaleString("en-IN") },
            { label: "Quotations", value: (o.quotations ?? 0).toLocaleString("en-IN") },
            { label: "Test drives", value: (o.testDrives ?? 0).toLocaleString("en-IN") },
            { label: "Community posts", value: (o.communityPosts ?? 0).toLocaleString("en-IN") },
            { label: "Jobs", value: (o.jobs ?? 0).toLocaleString("en-IN") },
            { label: "Recorded invoices", value: o.recordedInvoiceTotal ?? 0, format: "currency" },
            { label: "Reward points liability", value: (o.rewardLiabilityPoints ?? 0).toLocaleString("en-IN") },
            { label: "Open tickets", value: o.openTickets },
            { label: "Open payouts", value: o.openPayoutRequests ?? 0 },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground animate-pulse">Loading metrics…</p>
      )}

      {o?.ops ? (
        <section className="sa-section">
          <h2 className="sa-section__title">Operational queues</h2>
          <SuperAdminStatGrid
            stats={[
              { label: "Unrouted leads", value: o.ops.unroutedLeads },
              { label: "Pending test drives", value: o.ops.pendingTestDriveRequests },
              { label: "Expiring quotations", value: o.ops.expiringQuotations },
              { label: "Open reports", value: o.ops.openReports },
              { label: "Payout mismatches", value: o.ops.payoutMismatches },
              { label: "Failed messages", value: o.ops.failedCommunications },
              { label: "Pending job apps", value: o.ops.pendingJobApplications },
              { label: "Zero new-car stock rows", value: o.ops.zeroStockNewCars },
            ]}
          />
        </section>
      ) : null}

      <section className="sa-section">
        <h2 className="sa-section__title">Admin ERP modules</h2>
        <div className="erp-module-grid">
          {ERP_MODULES.map(({ to, label, icon: Icon, desc }) => (
            <Link key={to} to={to} className="erp-module-card">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AdminErpShell>
  );
}
