import type { User } from "@/types";
import type { AppRole, DbUser, KycStatus, UserStatus } from "@/types/database";

function readBusinessCategory(metadata: Record<string, unknown>): string | undefined {
  const business = metadata.business as { business_category?: string } | undefined;
  return business?.business_category;
}

/** Map API auth session user when DB profile row is not loaded yet. */
export function mapAuthSessionToAppUser(authUser: {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}): User {
  const meta = authUser.user_metadata ?? {};
  const status = (meta.status as UserStatus) ?? "active";
  const approvalStatus = (meta.approval_status as string | undefined) ?? undefined;
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    phone: authUser.phone ?? undefined,
    fullName: (meta.full_name as string) || authUser.email?.split("@")[0] || "User",
    role: (meta.role as AppRole) ?? "customer",
    accountStatus: status,
    approvalStatus,
    kycStatus: (meta.kyc_status as KycStatus) ?? "pending",
    isVerified: !!authUser.email_confirmed_at,
    createdAt: authUser.created_at,
  };
}

export function mapDbUserToAppUser(row: DbUser): User {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const status = (row.status ?? "active") as User["accountStatus"];
  return {
    id: row.id,
    email: row.email ?? "",
    phone: row.phone ?? undefined,
    fullName: row.full_name ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role,
    businessCategory: readBusinessCategory(metadata),
    kycStatus: row.kyc_status ?? "pending",
    isVerified: row.is_verified ?? false,
    accountStatus: status,
    approvalStatus: row.approval_status as string | undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    companyName: row.company_name ?? undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}
