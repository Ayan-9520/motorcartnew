import type { AppRole, FinanceStatus, KycStatus, Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCommissionOnDisbursement } from "./finance-commission.service";

/** Roles that register via business signup and need admin approval */
export const BUSINESS_ROLES: AppRole[] = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "parts_seller",
  "service_center",
  "broker",
];

const DEALER_ROLES: AppRole[] = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
];

export type PendingBusinessAccount = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: AppRole;
  status: string;
  approvalStatus: string | null;
  companyName: string | null;
  city: string | null;
  state: string | null;
  kycStatus: string;
  createdAt: string;
  dealerId: string | null;
  dealerName: string | null;
  dealerVerificationStatus: string | null;
};

export type AdminUserListItem = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: AppRole;
  status: UserStatus;
  approvalStatus: string | null;
  kycStatus: KycStatus;
  companyName: string | null;
  city: string | null;
  createdAt: string;
};

export type AdminFinanceApplication = {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string | null;
  bankId: string | null;
  amount: number;
  tenure: number;
  status: FinanceStatus;
  createdAt: string;
};

export type AdminDealerRow = {
  id: string;
  name: string;
  city: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  verificationStatus: string | null;
  isVerified: boolean;
  subscriptionTier: string;
  createdAt: string;
};

function readMeta(user: { metadata: unknown }): Record<string, unknown> {
  return user.metadata && typeof user.metadata === "object" && !Array.isArray(user.metadata)
    ? (user.metadata as Record<string, unknown>)
    : {};
}

export async function listPendingBusinessAccounts(): Promise<PendingBusinessAccount[]> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: BUSINESS_ROLES },
      OR: [
        { status: "pending_verification" },
        { approvalStatus: { in: ["pending", "under_review", "submitted", "in_review"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      dealers: {
        where: { deletedAt: null },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, verificationStatus: true },
      },
    },
  });

  return users.map((u) => {
    const dealer = u.dealers[0] ?? null;
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      approvalStatus: u.approvalStatus,
      companyName: u.companyName,
      city: u.city,
      state: u.state,
      kycStatus: u.kycStatus,
      createdAt: u.createdAt.toISOString(),
      dealerId: dealer?.id ?? null,
      dealerName: dealer?.name ?? null,
      dealerVerificationStatus: dealer?.verificationStatus ?? null,
    };
  });
}

export async function listAdminUsers(limit = 200): Promise<AdminUserListItem[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      role: true,
      status: true,
      approvalStatus: true,
      kycStatus: true,
      companyName: true,
      city: true,
      createdAt: true,
    },
  });

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function listPendingDealers(): Promise<AdminDealerRow[]> {
  const dealers = await prisma.dealer.findMany({
    where: {
      deletedAt: null,
      OR: [
        { isVerified: false },
        { verificationStatus: { in: ["pending", "documents_submitted", "under_review"] } },
        { verificationStatus: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return dealers.map((d) => ({
    id: d.id,
    name: d.name,
    city: d.city,
    ownerId: d.ownerId,
    ownerName: d.owner.fullName,
    ownerEmail: d.owner.email,
    verificationStatus: d.verificationStatus,
    isVerified: d.isVerified,
    subscriptionTier: d.subscriptionTier,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function listFinanceApplicationsForAdmin(
  status?: FinanceStatus
): Promise<AdminFinanceApplication[]> {
  const rows = await prisma.financeApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    applicantName: r.user.fullName,
    applicantEmail: r.user.email,
    bankId: r.bankId,
    amount: Number(r.amount),
    tenure: r.tenure,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function updateFinanceApplicationStatus(
  id: string,
  status: FinanceStatus,
  reviewerId?: string,
  note?: string
) {
  const allowed: FinanceStatus[] = ["processing", "approved", "rejected", "disbursed"];
  if (!allowed.includes(status)) throw new Error("INVALID_STATUS");

  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new Error("APPLICATION_NOT_FOUND");

  const meta =
    app.metadata && typeof app.metadata === "object" && !Array.isArray(app.metadata)
      ? (app.metadata as Record<string, unknown>)
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.financeApplication.update({
      where: { id },
      data: {
        status,
        metadata: {
          ...meta,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: reviewerId ?? "platform_admin",
          last_review_note: note?.trim() || null,
        } as Prisma.InputJsonValue,
      },
    });

    await tx.financeStatusHistory.create({
      data: {
        applicationId: id,
        status,
        fromStatus: app.status,
        toStatus: status,
        changedBy: reviewerId ?? null,
        note: note?.trim() || `Status updated to ${status} by ${reviewerId ?? "platform_admin"}`,
      },
    });
    if (status === "processing") {
      const existing = await tx.financeVerification.count({ where: { applicationId: id } });
      if (existing === 0) {
        await tx.financeVerification.createMany({
          data: ["identity", "income", "cibil", "bank_statement"].map((checkType) => ({
            applicationId: id,
            checkType,
            status: "pending",
            metadata: {},
          })),
        });
      }
    }
    if (status === "disbursed") {
      await ensureCommissionOnDisbursement(id, tx);
    }
  });

  return { ok: true };
}

export async function updateAdminUser(
  userId: string,
  patch: Partial<{ status: UserStatus; role: AppRole; kycStatus: KycStatus }>
) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new Error("USER_NOT_FOUND");

  await prisma.user.update({
    where: { id: userId },
    data: patch,
  });
  return { ok: true };
}

export async function reviewKyc(userId: string, kycStatus: "verified" | "rejected") {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const meta = readMeta(user);
  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus,
      metadata: {
        ...meta,
        kyc_reviewed_at: new Date().toISOString(),
        kyc_reviewed_by: "platform_admin",
      } as Prisma.InputJsonValue,
    },
  });
  return { ok: true };
}

export async function approveBusinessAccount(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!BUSINESS_ROLES.includes(user.role)) throw new Error("NOT_BUSINESS_ACCOUNT");

  const meta = readMeta(user);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        status: "active",
        approvalStatus: "approved",
        onboardingStatus: "approved",
        isVerified: true,
        kycStatus: user.kycStatus === "pending" ? "verified" : user.kycStatus,
        profileCompletion: Math.max(user.profileCompletion, 85),
        metadata: {
          ...meta,
          approved_at: new Date().toISOString(),
          approved_by: "platform_admin",
        } as Prisma.InputJsonValue,
      },
    });

    if (DEALER_ROLES.includes(user.role)) {
      await tx.dealer.updateMany({
        where: { ownerId: userId, deletedAt: null },
        data: {
          isVerified: true,
          verificationStatus: "verified",
        },
      });
    }
  });

  return { ok: true };
}

export async function rejectBusinessAccount(userId: string, reason?: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const meta = readMeta(user);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        approvalStatus: "rejected",
        onboardingStatus: "rejected",
        metadata: {
          ...meta,
          rejection_reason:
            reason?.trim() || "Application did not meet verification requirements.",
          rejected_at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    if (DEALER_ROLES.includes(user.role)) {
      await tx.dealer.updateMany({
        where: { ownerId: userId, deletedAt: null },
        data: {
          isVerified: false,
          verificationStatus: "rejected",
        },
      });
    }
  });

  return { ok: true };
}

export async function getPlatformAdminOverview() {
  const [
    totalUsers,
    activeUsers,
    pendingBusiness,
    pendingKyc,
    pendingDealers,
    listingsLive,
    pendingFinance,
    approvedFinance,
    disbursedTotal,
    organizations,
    dealers,
    leads,
    opportunities,
    quotations,
    testDrives,
    communityPosts,
    jobs,
    serviceBookings,
    partOrders,
    insuranceQuotes,
    openPayoutRequests,
    invoiceSum,
    paymentSum,
    rewardSum,
    unroutedLeads,
    pendingTestDriveRequests,
    expiringQuotations,
    openReports,
    payoutMismatches,
    failedCommunications,
    pendingJobApplications,
    zeroStockNewCars,
    openTickets,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: "active" } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        role: { in: BUSINESS_ROLES },
        OR: [
          { status: "pending_verification" },
          { approvalStatus: { in: ["pending", "under_review", "submitted", "in_review"] } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        kycStatus: { in: ["pending", "submitted"] },
      },
    }),
    prisma.dealer.count({
      where: {
        deletedAt: null,
        OR: [
          { isVerified: false },
          { verificationStatus: { in: ["pending", "documents_submitted", "under_review"] } },
        ],
      },
    }),
    prisma.vehicle.count({ where: { deletedAt: null, status: "available" } }),
    prisma.financeApplication.count({
      where: { status: { in: ["submitted", "processing"] } },
    }),
    prisma.financeApplication.count({ where: { status: "approved" } }),
    prisma.financeApplication.aggregate({
      where: { status: "disbursed" },
      _sum: { amount: true },
    }),
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.dealer.count({ where: { deletedAt: null } }),
    prisma.lead.count(),
    prisma.opportunity.count(),
    prisma.quotation.count(),
    prisma.testDriveBooking.count(),
    prisma.socialPost.count(),
    prisma.jobPosting.count(),
    prisma.serviceBooking.count(),
    prisma.partOrder.count(),
    prisma.insuranceQuote.count(),
    prisma.partnerPayoutRequest.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"] } },
    }),
    prisma.commercialInvoice.aggregate({
      where: { status: { in: ["ISSUED", "PAID"] } },
      _sum: { total: true },
    }),
    prisma.commercialPayment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.rewardAccount.aggregate({ _sum: { balance: true } }),
    prisma.lead.count({ where: { assignments: { none: {} } } }),
    prisma.testDriveBooking.count({ where: { status: "requested" } }),
    prisma.quotation.count({
      where: { status: "issued", validityEnd: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.communityReport.count({ where: { status: "OPEN" } }),
    prisma.reconciliationEntry.count({ where: { status: "MISMATCH" } }),
    prisma.communicationMessage.count({ where: { status: "FAILED" } }),
    prisma.jobApplication.count({ where: { status: "APPLIED" } }),
    prisma.newCarInventory.count({ where: { stock: { lte: 0 } } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
  ]);

  return {
    totalUsers,
    activeUsers,
    pendingBusiness,
    pendingKyc,
    pendingDealers,
    listingsLive,
    pendingFinance,
    approvedFinance,
    loanDisbursedTotal: Number(disbursedTotal._sum.amount ?? 0),
    organizations,
    dealers,
    vehicles: listingsLive,
    leads,
    opportunities,
    quotations,
    testDrives,
    communityPosts,
    jobs,
    serviceBookings,
    partOrders,
    insuranceApplications: insuranceQuotes,
    openPayoutRequests,
    recordedInvoiceTotal: Number(invoiceSum._sum.total ?? 0),
    confirmedPaymentTotal: Number(paymentSum._sum.amount ?? 0),
    rewardLiabilityPoints: Number(rewardSum._sum.balance ?? 0),
    mrrEstimate: 0,
    openTickets,
    fraudOpen: 0,
    ops: {
      unroutedLeads,
      pendingTestDriveRequests,
      expiringQuotations,
      openReports,
      payoutMismatches,
      failedCommunications,
      pendingJobApplications,
      zeroStockNewCars,
    },
    sources: {
      users: "users.deleted_at IS NULL",
      listingsLive: "vehicles.status=available",
      loanDisbursedTotal: "SUM(finance_applications.amount) WHERE status=disbursed",
      recordedInvoiceTotal: "SUM(commercial_invoices.total) WHERE status IN (ISSUED,PAID)",
      rewardLiabilityPoints: "SUM(reward_accounts.balance)",
      mrrEstimate: "not calculated — no subscription MRR series",
    },
  };
}

/** Static map for admin UI — where data flows */
export const ADMIN_OPERATION_FLOWS = [
  {
    id: "business-signup",
    title: "Business signup → approval",
    from: "POST /api/auth/register (businessSignup)",
    stores: "users.status=pending_verification, approval_status=pending",
    admin: "POST /api/admin/business-accounts/:id/approve",
    result: "users.status=active, dealers verified, workspace unlocked",
  },
  {
    id: "kyc",
    title: "KYC document review",
    from: "Dealer uploads via /dashboard/dealer/verification",
    stores: "users.kyc_status=submitted",
    admin: "POST /api/admin/users/:id/kyc (verified|rejected)",
    result: "users.kyc_status updated",
  },
  {
    id: "finance",
    title: "Loan / fintech applications",
    from: "Customer/dealer applies via /finance",
    stores: "finance_applications.status=submitted",
    admin: "POST /api/admin/finance/applications/:id/status",
    result: "processing → approved → disbursed",
  },
  {
    id: "dealer-verify",
    title: "Dealer storefront verification",
    from: "dealers row on business signup",
    stores: "dealers.verification_status",
    admin: "Approve business account OR dealer page",
    result: "dealers.is_verified=true",
  },
] as const;
