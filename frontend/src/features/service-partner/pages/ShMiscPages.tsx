import { useEffect } from "react";
import { ServicePartnerShell } from "../components/ServicePartnerShell";
import { ShAnalyticsRevenuePage } from "./ShEnterprisePages";
import { setPageMeta } from "@/utils/seo";

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function ShCrmVehiclesPage() {
  useEffect(() => setPageMeta({ title: "Vehicle history" }), []);
  return (
    <ServicePartnerShell title="Vehicle history" description="RC · VIN · service timeline">
      <EmptyHint>No vehicle history yet. Records appear when customers book service with vehicle details.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShCrmLoyaltyPage() {
  useEffect(() => setPageMeta({ title: "Loyalty" }), []);
  return (
    <ServicePartnerShell title="Loyalty members" description="Points · tiers · rewards">
      <EmptyHint>No loyalty members yet. Points accumulate from completed jobs linked to CRM customers.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShCrmReviewsPage() {
  useEffect(() => setPageMeta({ title: "Reviews" }), []);
  return (
    <ServicePartnerShell title="Feedback & reviews" description="CSAT · Google · Motorcart">
      <EmptyHint>No reviews yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export const ShFinanceRevenuePage = ShAnalyticsRevenuePage;

export function ShFinancePaymentsPage() {
  useEffect(() => setPageMeta({ title: "Payments" }), []);
  return (
    <ServicePartnerShell title="Payments" description="UPI · card · COD · settlements">
      <EmptyHint>No settlements recorded yet. Collected amounts appear from completed paid bookings.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShFinanceExpensesPage() {
  useEffect(() => setPageMeta({ title: "Expenses" }), []);
  return (
    <ServicePartnerShell title="Expenses" description="Parts · utilities · payroll">
      <EmptyHint>Expense tracking is not configured for this workshop yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShFinanceProfitPage() {
  useEffect(() => setPageMeta({ title: "Profit" }), []);
  return (
    <ServicePartnerShell title="Profit analytics" description="Margin by service · branch">
      <EmptyHint>Profit analytics need completed jobs with parts and labour amounts.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShPartsLowStockPage() {
  useEffect(() => setPageMeta({ title: "Low stock" }), []);
  return (
    <ServicePartnerShell title="Low stock alerts" description="Auto reorder suggestions">
      <EmptyHint>No low-stock alerts. Connect workshop parts inventory to enable this desk.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShPartsVendorsPage() {
  useEffect(() => setPageMeta({ title: "Vendors" }), []);
  return (
    <ServicePartnerShell title="Vendors" description="Local OEM · Bosch · Exide distributors">
      <EmptyHint>No vendors saved yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShPartsPoPage() {
  useEffect(() => setPageMeta({ title: "PO" }), []);
  return (
    <ServicePartnerShell title="Purchase orders" description="Inbound parts procurement">
      <EmptyHint>No purchase orders yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShPartsBillingPage() {
  useEffect(() => setPageMeta({ title: "Parts billing" }), []);
  return (
    <ServicePartnerShell title="Parts billing" description="Issue parts to job cards">
      <EmptyHint>Link parts consumption to job cards for margin tracking when inventory is connected.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShDriversPage() {
  useEffect(() => setPageMeta({ title: "Drivers" }), []);
  return (
    <ServicePartnerShell title="Driver management" description="Pickup fleet roster">
      <EmptyHint>No drivers on roster yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShRoutesPage() {
  useEffect(() => setPageMeta({ title: "Routes" }), []);
  return (
    <ServicePartnerShell title="Route tracking" description="Optimized pickup loops">
      <EmptyHint>Live map integration — configure API in settings.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShRsaPage() {
  useEffect(() => setPageMeta({ title: "RSA" }), []);
  return (
    <ServicePartnerShell title="Roadside assistance" description="Emergency dispatch SLA">
      <EmptyHint>No open RSA jobs.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShMarketingSmsPage() {
  useEffect(() => setPageMeta({ title: "SMS" }), []);
  return (
    <ServicePartnerShell title="SMS reminders" description="DLT templates · service due">
      <EmptyHint>SMS provider not configured. Campaigns stay disabled until a provider is connected.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShMarketingRemindersPage() {
  useEffect(() => setPageMeta({ title: "Reminders" }), []);
  return (
    <ServicePartnerShell title="Service reminders" description="Insurance · PUC · periodic">
      <EmptyHint>No reminders scheduled yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShMarketingOffersPage() {
  useEffect(() => setPageMeta({ title: "Offers" }), []);
  return (
    <ServicePartnerShell title="Offers & coupons" description="Festive · loyalty · first visit">
      <EmptyHint>No active offers yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsTechniciansPage() {
  useEffect(() => setPageMeta({ title: "Technician analytics" }), []);
  return (
    <ServicePartnerShell title="Technician productivity" description="Jobs · CSAT · revenue per tech">
      <EmptyHint>Productivity metrics appear once technicians complete jobs.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsWorkshopPage() {
  useEffect(() => setPageMeta({ title: "Workshop analytics" }), []);
  return (
    <ServicePartnerShell title="Workshop analytics" description="Bay utilization · TAT">
      <EmptyHint>Bay utilization and TAT need completed workshop jobs.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsRetentionPage() {
  useEffect(() => setPageMeta({ title: "Retention" }), []);
  return (
    <ServicePartnerShell title="Customer retention" description="Repeat % · churn">
      <EmptyHint>Retention metrics need repeat customers on file.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShAnalyticsBranchesPage() {
  useEffect(() => setPageMeta({ title: "Branches" }), []);
  return (
    <ServicePartnerShell title="Branch performance" description="Multi-branch centralized view">
      <EmptyHint>No branch performance data yet.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShGstSettingsPage() {
  useEffect(() => setPageMeta({ title: "GST" }), []);
  return (
    <ServicePartnerShell title="GST details" description="GSTIN · HSN · e-invoice">
      <EmptyHint>Add GSTIN on your workshop profile when available.</EmptyHint>
    </ServicePartnerShell>
  );
}

export function ShHoursPage() {
  useEffect(() => setPageMeta({ title: "Hours" }), []);
  return (
    <ServicePartnerShell title="Working hours" description="Mon–Sat · holidays">
      <EmptyHint>Set working hours from workshop settings when your center profile is connected.</EmptyHint>
    </ServicePartnerShell>
  );
}
