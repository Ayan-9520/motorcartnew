import { api } from "@/lib/api/axios";
import type { AppRole, FinanceStatus, KycStatus, UserStatus } from "@/types/database";

export type PendingBusinessAccountDto = {
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

export type AdminUserDto = {
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

export type AdminFinanceAppDto = {
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

export type AdminDealerDto = {
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

export type AdminOverviewDto = {
  totalUsers: number;
  activeUsers: number;
  pendingBusiness: number;
  pendingKyc: number;
  pendingDealers: number;
  listingsLive: number;
  pendingFinance: number;
  approvedFinance: number;
  loanDisbursedTotal: number;
};

export type AdminFlowDto = {
  id: string;
  title: string;
  from: string;
  stores: string;
  admin: string;
  result: string;
};

export async function fetchPendingBusinessAccountsApi(): Promise<PendingBusinessAccountDto[]> {
  const { data } = await api.get<{ accounts: PendingBusinessAccountDto[] }>(
    "/api/admin/business-accounts/pending"
  );
  return data.accounts ?? [];
}

export async function approveBusinessAccountApi(userId: string): Promise<void> {
  await api.post(`/api/admin/business-accounts/${userId}/approve`);
}

export async function rejectBusinessAccountApi(userId: string, reason?: string): Promise<void> {
  await api.post(`/api/admin/business-accounts/${userId}/reject`, { reason });
}

export async function fetchAdminOverviewApi(): Promise<AdminOverviewDto | null> {
  try {
    const { data } = await api.get<{ overview: AdminOverviewDto }>("/api/admin/overview");
    return data.overview ?? null;
  } catch {
    return null;
  }
}

export async function fetchAdminUsersApi(): Promise<AdminUserDto[]> {
  const { data } = await api.get<{ users: AdminUserDto[] }>("/api/admin/users");
  return data.users ?? [];
}

export async function patchAdminUserApi(
  userId: string,
  patch: Partial<{ status: UserStatus; role: AppRole; kyc_status: KycStatus }>
): Promise<void> {
  await api.patch(`/api/admin/users/${userId}`, patch);
}

export async function reviewKycApi(userId: string, action: "verified" | "rejected"): Promise<void> {
  await api.post(`/api/admin/users/${userId}/kyc`, { action });
}

export async function fetchPendingDealersApi(): Promise<AdminDealerDto[]> {
  const { data } = await api.get<{ dealers: AdminDealerDto[] }>("/api/admin/dealers/pending");
  return data.dealers ?? [];
}

export async function fetchFinanceApplicationsApi(
  status?: FinanceStatus
): Promise<AdminFinanceAppDto[]> {
  const { data } = await api.get<{ applications: AdminFinanceAppDto[] }>(
    "/api/admin/finance/applications",
    { params: status ? { status } : undefined }
  );
  return data.applications ?? [];
}

export async function updateFinanceStatusApi(
  id: string,
  status: FinanceStatus,
  note?: string
): Promise<void> {
  await api.post(`/api/admin/finance/applications/${id}/status`, { status, note });
}

export async function fetchAdminFlowsApi(): Promise<AdminFlowDto[]> {
  const { data } = await api.get<{ flows: AdminFlowDto[] }>("/api/admin/flows");
  return data.flows ?? [];
}

/** Roles that require business approval */
export const ADMIN_BUSINESS_ROLES: AppRole[] = [
  "dealer",
  "used_car_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "parts_seller",
  "service_center",
];

export function isAdminBusinessRole(role: AppRole): boolean {
  return ADMIN_BUSINESS_ROLES.includes(role);
}
