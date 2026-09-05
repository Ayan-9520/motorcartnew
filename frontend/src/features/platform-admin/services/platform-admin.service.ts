import { supabase } from "@/shared/api/client";
import {
  approveBusinessAccountApi,
  fetchAdminFlowsApi,
  fetchAdminOverviewApi,
  fetchAdminUsersApi,
  fetchFinanceApplicationsApi,
  fetchPendingBusinessAccountsApi,
  fetchPendingDealersApi,
  isAdminBusinessRole,
  patchAdminUserApi,
  rejectBusinessAccountApi,
  reviewKycApi,
  updateFinanceStatusApi,
} from "@/integrations/api/admin";
import { apiErrorMessage } from "@/lib/api/axios";
import type { AppRole, FinanceStatus, KycStatus, UserStatus } from "@/types/database";
import {
  MOCK_ANALYTICS,
  MOCK_AUCTIONS,
  MOCK_BANNERS,
  MOCK_CMS,
  MOCK_DEALERS,
  MOCK_FRAUD,
  MOCK_KYC,
  MOCK_NOTIFICATIONS,
  MOCK_OVERVIEW,
  MOCK_PLANS,
  MOCK_REPORTS,
  MOCK_REVENUE,
  MOCK_TICKETS,
  MOCK_TRANSACTIONS,
  MOCK_USERS,
  MOCK_VEHICLES,
} from "../data/mock-platform-data";
import type {
  AdminAuctionRow,
  AdminDealerRow,
  AdminFinanceApplicationRow,
  AdminFlowRow,
  AdminUserRow,
  AdminVehicleRow,
  CmsPageRow,
  FraudAlertRow,
  KycQueueRow,
  PlatformAnalytics,
  PlatformBanner,
  PlatformNotificationRow,
  PendingBusinessAccountRow,
  PlatformOverview,
  PlatformReportRow,
  PlatformFraudStatus,
  PlatformTicketStatus,
  PlatformTransactionRow,
  RevenueAnalytics,
  SubscriptionPlanRow,
  SupportTicketRow,
} from "../types";
import { adminDemoFallback } from "@/config/real-data";

const USE_DEMO_FALLBACK = adminDemoFallback;

function useMock<T>(data: T, error: unknown): T {
  if (error) console.warn("[platform-admin] API error", error);
  if (USE_DEMO_FALLBACK) return data;
  return (Array.isArray(data) ? [] : data) as T;
}

export async function fetchPendingBusinessAccounts(): Promise<PendingBusinessAccountRow[]> {
  try {
    const accounts = await fetchPendingBusinessAccountsApi();
    if (accounts.length) {
      return accounts.map((a) => ({
        id: a.id,
        email: a.email,
        phone: a.phone,
        fullName: a.fullName,
        role: a.role,
        status: a.status as UserStatus,
        approvalStatus: a.approvalStatus,
        companyName: a.companyName,
        city: a.city,
        state: a.state,
        kycStatus: a.kycStatus as KycStatus,
        createdAt: a.createdAt,
        dealerId: a.dealerId,
        dealerName: a.dealerName,
        dealerVerificationStatus: a.dealerVerificationStatus,
      }));
    }
  } catch (e) {
    console.warn("[platform-admin] pending business API fallback", e);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, phone, full_name, role, status, company_name, city, state, kyc_status, created_at, approval_status")
    .eq("status", "pending_verification")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data?.length) return [];

  return data.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    fullName: u.full_name,
    role: u.role as AppRole,
    status: (u.status ?? "pending_verification") as UserStatus,
    approvalStatus: (u as { approval_status?: string }).approval_status ?? "pending",
    companyName: u.company_name,
    city: u.city,
    state: u.state,
    kycStatus: u.kyc_status as KycStatus,
    createdAt: u.created_at,
    dealerId: null,
    dealerName: u.company_name,
    dealerVerificationStatus: null,
  }));
}

export async function approveBusinessAccount(userId: string): Promise<{ error: string | null }> {
  try {
    await approveBusinessAccountApi(userId);
    return { error: null };
  } catch (e) {
    return { error: apiErrorMessage(e) ?? "Approve failed" };
  }
}

export async function rejectBusinessAccount(
  userId: string,
  reason?: string
): Promise<{ error: string | null }> {
  try {
    await rejectBusinessAccountApi(userId, reason);
    return { error: null };
  } catch (e) {
    return { error: apiErrorMessage(e) ?? "Reject failed" };
  }
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const EMPTY: PlatformOverview = {
    totalUsers: 0,
    activeUsers: 0,
    pendingKyc: 0,
    pendingDealers: 0,
    pendingBusiness: 0,
    pendingFinance: 0,
    approvedFinance: 0,
    loanDisbursedTotal: 0,
    openTickets: 0,
    fraudOpen: 0,
    mrrEstimate: 0,
    listingsLive: 0,
  };
  const adminOverview = await fetchAdminOverviewApi();
  if (!adminOverview) return EMPTY;
  return {
    totalUsers: adminOverview.totalUsers,
    activeUsers: adminOverview.activeUsers,
    pendingKyc: adminOverview.pendingKyc,
    pendingDealers: adminOverview.pendingDealers,
    pendingBusiness: adminOverview.pendingBusiness,
    pendingFinance: adminOverview.pendingFinance,
    approvedFinance: adminOverview.approvedFinance,
    loanDisbursedTotal: adminOverview.loanDisbursedTotal,
    openTickets: adminOverview.openTickets ?? 0,
    fraudOpen: adminOverview.fraudOpen ?? 0,
    mrrEstimate: 0,
    listingsLive: adminOverview.listingsLive,
    organizations: adminOverview.organizations,
    dealers: adminOverview.dealers,
    leads: adminOverview.leads,
    opportunities: adminOverview.opportunities,
    quotations: adminOverview.quotations,
    testDrives: adminOverview.testDrives,
    communityPosts: adminOverview.communityPosts,
    jobs: adminOverview.jobs,
    serviceBookings: adminOverview.serviceBookings,
    partOrders: adminOverview.partOrders,
    insuranceApplications: adminOverview.insuranceApplications,
    openPayoutRequests: adminOverview.openPayoutRequests,
    recordedInvoiceTotal: adminOverview.recordedInvoiceTotal,
    rewardLiabilityPoints: adminOverview.rewardLiabilityPoints,
    ops: adminOverview.ops,
  };
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  try {
    const users = await fetchAdminUsersApi();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      kycStatus: u.kycStatus,
      city: u.city,
      createdAt: u.createdAt,
    }));
  } catch (e) {
    console.warn("[platform-admin] users API", e);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, status, kyc_status, city, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return useMock(MOCK_USERS, error);
  if (!data?.length) return [];

  return data.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role as AppRole,
    status: (u.status ?? "active") as UserStatus,
    kycStatus: u.kyc_status as KycStatus,
    city: u.city,
    createdAt: u.created_at,
  }));
}

export async function fetchAdminFlows(): Promise<AdminFlowRow[]> {
  try {
    return await fetchAdminFlowsApi();
  } catch {
    return [];
  }
}

export async function fetchFinanceApplications(
  status?: FinanceStatus
): Promise<AdminFinanceApplicationRow[]> {
  try {
    const apps = await fetchFinanceApplicationsApi(status);
    return apps.map((a) => ({
      id: a.id,
      userId: a.userId,
      applicantName: a.applicantName,
      applicantEmail: a.applicantEmail,
      bankId: a.bankId,
      amount: a.amount,
      tenure: a.tenure,
      status: a.status,
      createdAt: a.createdAt,
    }));
  } catch (e) {
    console.warn("[platform-admin] finance API", e);
    return [];
  }
}

export async function updateFinanceApplicationStatus(
  id: string,
  status: FinanceStatus,
  note?: string
): Promise<{ error: string | null }> {
  try {
    await updateFinanceStatusApi(id, status, note);
    return { error: null };
  } catch (e) {
    return { error: apiErrorMessage(e) ?? "Update failed" };
  }
}

export async function reviewKycUser(
  userId: string,
  action: "verified" | "rejected"
): Promise<{ error: string | null }> {
  try {
    await reviewKycApi(userId, action);
    return { error: null };
  } catch (e) {
    return { error: apiErrorMessage(e) ?? "KYC update failed" };
  }
}

export { isAdminBusinessRole };

export async function updateAdminUser(
  id: string,
  patch: Partial<{ status: UserStatus; role: AppRole; kyc_status: KycStatus }>
): Promise<{ error: string | null }> {
  try {
    await patchAdminUserApi(id, patch);
    return { error: null };
  } catch (e) {
    const msg = apiErrorMessage(e);
    if (msg) return { error: msg };
  }
  const { error } = await supabase.from("users").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchPendingDealers(): Promise<AdminDealerRow[]> {
  try {
    const dealers = await fetchPendingDealersApi();
    return dealers.map((d) => ({
      id: d.id,
      name: d.name,
      city: d.city,
      ownerId: d.ownerId,
      verificationStatus: String(d.verificationStatus ?? "pending"),
      subscriptionTier: d.subscriptionTier ?? "free",
      isVerified: d.isVerified,
      createdAt: d.createdAt,
    }));
  } catch (e) {
    console.warn("[platform-admin] dealers API", e);
  }

  const { data, error } = await supabase
    .from("dealers")
    .select("id, name, city, owner_id, verification_status, subscription_tier, is_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return useMock(MOCK_DEALERS, error);
  if (!data?.length) return [];

  return data.map((d) => ({
    id: d.id,
    name: d.name,
    city: d.city,
    ownerId: d.owner_id,
    verificationStatus: String(d.verification_status ?? "pending"),
    subscriptionTier: d.subscription_tier ?? "free",
    isVerified: d.is_verified,
    createdAt: d.created_at,
  }));
}

export async function setDealerVerification(
  dealerId: string,
  status: "verified" | "rejected",
  ownerId?: string | null
): Promise<{ error: string | null }> {
  if (status === "verified" && ownerId) {
    return approveBusinessAccount(ownerId);
  }

  const patch =
    status === "verified"
      ? { verification_status: "verified", is_verified: true }
      : { verification_status: "rejected", is_verified: false };
  const { error } = await supabase.from("dealers").update(patch).eq("id", dealerId);

  if (status === "rejected" && ownerId && !error) {
    return rejectBusinessAccount(ownerId);
  }

  return { error: error?.message ?? null };
}

export async function fetchKycQueue(): Promise<KycQueueRow[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, kyc_status, role, updated_at")
    .in("kyc_status", ["submitted", "pending"])
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return useMock(MOCK_KYC, error);
  if (!data?.length) return [];

  return data.map((u) => ({
    userId: u.id,
    fullName: u.full_name,
    email: u.email,
    kycStatus: u.kyc_status as KycStatus,
    submittedAt: u.updated_at,
    role: u.role as AppRole,
  }));
}

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  return fetchRevenueAnalytics();
}

export async function fetchRevenueAnalytics(): Promise<RevenueAnalytics> {
  try {
    const { data: disbursed } = await supabase
      .from("finance_applications")
      .select("amount")
      .eq("status", "disbursed")
      .limit(500);
    const loanTotal = (disbursed ?? []).reduce(
      (s, r) => s + Number((r as { amount?: number }).amount ?? 0),
      0
    );
    if (loanTotal > 0) {
      return {
        ...MOCK_REVENUE,
        loanDisbursed: loanTotal,
        gmvTotal: loanTotal + MOCK_REVENUE.subscriptionRevenue + MOCK_REVENUE.auctionFees,
      };
    }
  } catch {
    /* mock */
  }
  return MOCK_REVENUE;
}

export async function fetchPlatformTransactions(): Promise<PlatformTransactionRow[]> {
  try {
    const { data } = await supabase
      .from("finance_applications")
      .select("id, amount, status, created_at")
      .in("status", ["approved", "disbursed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (data?.length) {
      return data.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: String(row.id),
          type: "loan" as const,
          reference: `FIN-${String(row.id).slice(0, 8)}`,
          party: "Finance application",
          amount: Number(row.amount ?? 0),
          status: String(row.status),
          createdAt: String(row.created_at),
        };
      });
    }
  } catch {
    /* mock */
  }
  return MOCK_TRANSACTIONS;
}

export async function fetchAdminVehicles(): Promise<AdminVehicleRow[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, title, brand, model, price, city, status, is_featured, metadata, created_at, dealers(name)")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error || !data?.length) return useMock(MOCK_VEHICLES, error);

  return data.map((v) => {
    const row = v as unknown as Record<string, unknown> & { dealers?: { name: string } | null };
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    return {
      id: String(row.id),
      title: String(row.title),
      brand: String(row.brand),
      model: String(row.model),
      price: Number(row.price),
      city: String(row.city),
      status: String(row.status),
      isFeatured: Boolean(row.is_featured),
      platformFeatured: Boolean(meta.platform_featured),
      dealerName: row.dealers?.name ?? null,
      createdAt: String(row.created_at),
    };
  });
}

export async function moderateVehicle(
  id: string,
  patch: Partial<{ status: string; is_featured: boolean; platform_featured: boolean }>
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.is_featured != null) update.is_featured = patch.is_featured;

  if (patch.platform_featured != null) {
    const { data: current } = await supabase.from("vehicles").select("metadata").eq("id", id).maybeSingle();
    const meta = ((current?.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    update.metadata = { ...meta, platform_featured: patch.platform_featured };
  }

  const { error } = await supabase.from("vehicles").update(update).eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchAdminAuctions(): Promise<AdminAuctionRow[]> {
  const { data, error } = await supabase
    .from("auctions")
    .select("id, title, status, is_featured, current_bid, reserve_price, bid_count, ends_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error || !data?.length) return useMock(MOCK_AUCTIONS, error);

  return data.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    isFeatured: a.is_featured,
    currentBid: Number(a.current_bid ?? 0),
    reservePrice: Number(a.reserve_price ?? 0),
    bidCount: a.bid_count ?? 0,
    endsAt: a.ends_at,
  }));
}

export async function updateAdminAuction(
  id: string,
  patch: Partial<{ status: string; is_featured: boolean }>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("auctions").update(patch).eq("id", id);
  return { error: error?.message ?? null };
}

export async function createPlatformNotification(payload: {
  title: string;
  body: string;
  channel: string;
  audience: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("platform_notifications").insert({
    title: payload.title,
    body: payload.body,
    channel: payload.channel,
    audience: payload.audience,
    status: "scheduled",
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function sendPlatformNotification(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("platform_notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function upsertCmsPage(payload: {
  id?: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
}): Promise<{ error: string | null }> {
  if (payload.id) {
    const { error } = await supabase
      .from("platform_cms_pages")
      .update({
        slug: payload.slug,
        title: payload.title,
        body: payload.body,
        status: payload.status,
        updated_at: new Date().toISOString(),
        published_at: payload.status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", payload.id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("platform_cms_pages").insert({
    slug: payload.slug,
    title: payload.title,
    body: payload.body,
    status: payload.status,
  });
  return { error: error?.message ?? null };
}

export async function generatePlatformReport(reportKey: string, title: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("platform_report_snapshots").insert({
    report_key: reportKey,
    title,
    period_label: new Date().toLocaleString("en-IN", { month: "long", year: "numeric" }),
    payload: { generatedAt: new Date().toISOString(), source: "admin_erp" },
  });
  return { error: error?.message ?? null };
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlanRow[]> {
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("code, name, price_monthly, max_listings")
    .order("sort_order");

  if (error || !plans?.length) return useMock(MOCK_PLANS, error);

  const { data: dealers } = await supabase.from("dealers").select("subscription_tier");
  const counts: Record<string, number> = {};
  for (const d of dealers ?? []) {
    const t = d.subscription_tier ?? "free";
    counts[t] = (counts[t] ?? 0) + 1;
  }

  return plans.map((p) => ({
    code: p.code,
    name: p.name,
    priceMonthly: Number(p.price_monthly),
    maxListings: p.max_listings,
    activeDealers: counts[p.code] ?? 0,
  }));
}

export async function fetchPlatformBanners(): Promise<PlatformBanner[]> {
  const { data, error } = await supabase
    .from("platform_banners")
    .select("*")
    .order("sort_order");

  if (error || !data?.length) return useMock(MOCK_BANNERS, error);

  return data.map((b) => ({
    id: b.id,
    title: b.title,
    placement: b.placement,
    imageUrl: b.image_url,
    linkUrl: b.link_url,
    isActive: b.is_active,
    sortOrder: b.sort_order,
  }));
}

export async function fetchCmsPages(): Promise<CmsPageRow[]> {
  const { data, error } = await supabase.from("platform_cms_pages").select("id, slug, title, status, updated_at").order("updated_at", { ascending: false });

  if (error || !data?.length) return useMock(MOCK_CMS, error);

  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status as CmsPageRow["status"],
    updatedAt: p.updated_at,
  }));
}

export async function fetchPlatformNotifications(): Promise<PlatformNotificationRow[]> {
  const { data, error } = await supabase.from("platform_notifications").select("*").order("created_at", { ascending: false }).limit(50);

  if (error || !data?.length) return useMock(MOCK_NOTIFICATIONS, error);

  return data.map((n) => ({
    id: n.id,
    title: n.title,
    channel: n.channel,
    audience: n.audience,
    status: n.status,
    scheduledAt: n.scheduled_at,
  }));
}

export async function fetchSupportTickets(): Promise<SupportTicketRow[]> {
  const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100);

  if (error || !data?.length) return useMock(MOCK_TICKETS, error);

  return data.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status as SupportTicketRow["status"],
    priority: t.priority as SupportTicketRow["priority"],
    requesterEmail: t.requester_email,
    category: t.category,
    createdAt: t.created_at,
  }));
}

export async function updateSupportTicket(id: string, status: PlatformTicketStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchFraudAlerts(): Promise<FraudAlertRow[]> {
  const { data, error } = await supabase.from("platform_fraud_alerts").select("*").order("created_at", { ascending: false }).limit(100);

  if (error || !data?.length) return useMock(MOCK_FRAUD, error);

  return data.map((f) => ({
    id: f.id,
    source: f.source,
    entityType: f.entity_type,
    entityId: f.entity_id,
    riskScore: Number(f.risk_score),
    reason: f.reason,
    status: f.status as FraudAlertRow["status"],
    createdAt: f.created_at,
  }));
}

export async function updateFraudAlert(id: string, status: PlatformFraudStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from("platform_fraud_alerts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchPlatformReports(): Promise<PlatformReportRow[]> {
  const { data, error } = await supabase.from("platform_report_snapshots").select("*").order("created_at", { ascending: false }).limit(30);

  if (error || !data?.length) return useMock(MOCK_REPORTS, error);

  return data.map((r) => ({
    id: r.id,
    reportKey: r.report_key,
    title: r.title,
    periodLabel: r.period_label,
    createdAt: r.created_at,
  }));
}
