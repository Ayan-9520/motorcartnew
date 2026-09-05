import { getPlatformAdminOverview } from "@/services/platform-admin.service";
import { prisma } from "@/lib/prisma";

/** Point-in-time operational metrics. No invented monthly series. */
export async function getPlatformAnalytics() {
  const overview = await getPlatformAdminOverview();
  const [won, lost, savedSearches, sellRequests] = await Promise.all([
    prisma.opportunity.count({ where: { status: "WON" } }),
    prisma.opportunity.count({ where: { status: "LOST" } }),
    prisma.savedSearch.count(),
    prisma.vehicleSaleRequest.count(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    note: "Counts from PostgreSQL at request time. No interpolated history.",
    leadFunnel: {
      leads: overview.leads,
      opportunities: overview.opportunities,
      quotations: overview.quotations,
      testDrives: overview.testDrives,
      won,
      lost,
      source: "leads, opportunities.status, quotations, test_drive_bookings",
    },
    customer: {
      savedSearches,
      quotations: overview.quotations,
      testDrives: overview.testDrives,
      sellRequests,
      source: "saved_searches, quotations, test_drive_bookings, vehicle_sale_requests",
    },
    dealer: {
      inventory: overview.listingsLive,
      leads: overview.leads,
      quotations: overview.quotations,
      testDrives: overview.testDrives,
      wonOpportunities: won,
      source: "vehicles, leads, quotations, test_drive_bookings, opportunities",
    },
    commercial: {
      recordedInvoiceTotal: overview.recordedInvoiceTotal,
      confirmedPaymentTotal: overview.confirmedPaymentTotal,
      openPayoutRequests: overview.openPayoutRequests,
      rewardLiabilityPoints: overview.rewardLiabilityPoints,
      source: "commercial_invoices, commercial_payments status=PAID, partner_payout_requests, reward_accounts",
    },
    community: {
      posts: overview.communityPosts,
      source: "social_posts",
    },
    partner: {
      financeApplicationsPending: overview.pendingFinance,
      insuranceQuotes: overview.insuranceApplications,
      partOrders: overview.partOrders,
      serviceBookings: overview.serviceBookings,
      jobs: overview.jobs,
      source: "finance_applications, insurance_quotes, part_orders, service_bookings, job_postings",
    },
    ops: overview.ops,
  };
}
