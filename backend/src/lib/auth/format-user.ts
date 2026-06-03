export function formatAuthUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: string;
  status?: string;
  kycStatus?: string;
  companyName?: string | null;
  city?: string | null;
  state?: string | null;
  approvalStatus?: string | null;
  createdAt: Date;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  metadata?: unknown;
}) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    kycStatus: user.kycStatus,
    companyName: user.companyName,
    city: user.city,
    state: user.state,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt.toISOString(),
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    metadata: {
      ...(typeof user.metadata === "object" && user.metadata ? user.metadata : {}),
      full_name: user.fullName,
      role: user.role,
      status: user.status,
      approval_status: user.approvalStatus,
    },
    user_metadata: {
      full_name: user.fullName,
      role: user.role,
      status: user.status,
      approval_status: user.approvalStatus,
    },
  };
}
