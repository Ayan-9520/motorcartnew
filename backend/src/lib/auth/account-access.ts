import type { AppRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JwtPayload } from "@/lib/auth/jwt";

/** Roles that register via business signup and require admin approval. */
export const BUSINESS_APPROVAL_ROLES: AppRole[] = [
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

const PLATFORM_ADMIN_ROLES = new Set<AppRole>(["admin", "super_admin", "finance_manager"]);

export type UserAccessRow = {
  id: string;
  role: AppRole;
  status: UserStatus;
  approvalStatus: string | null;
};

export function isBusinessApprovalRole(role: string): boolean {
  return BUSINESS_APPROVAL_ROLES.includes(role as AppRole);
}

/** Business workspace locked until admin sets status=active and approvalStatus=approved. */
export function isPendingBusinessAccess(user: Pick<UserAccessRow, "role" | "status" | "approvalStatus">): boolean {
  if (!isBusinessApprovalRole(user.role)) return false;
  if (user.status === "suspended" || user.status === "closed") return false;
  return user.status !== "active" || user.approvalStatus !== "approved";
}

export async function loadUserAccess(userId: string): Promise<UserAccessRow | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true, status: true, approvalStatus: true },
  });
  return user;
}

export async function assertWorkspaceAccess(auth: JwtPayload): Promise<UserAccessRow> {
  const user = await loadUserAccess(auth.sub);
  if (!user) throw new Error("UNAUTHORIZED");
  if (PLATFORM_ADMIN_ROLES.has(user.role)) return user;
  if (isPendingBusinessAccess(user)) throw new Error("ACCOUNT_PENDING_APPROVAL");
  return user;
}

/** Tables a pending business user may still read/write (profile + notifications only). */
export const PENDING_BUSINESS_DB_TABLES = new Set([
  "users",
  "notifications",
  "device_sessions",
]);

export function isPendingBusinessDbAllowed(
  table: string,
  action: string,
  authUserId: string,
  filters?: unknown
): boolean {
  if (!PENDING_BUSINESS_DB_TABLES.has(table)) return false;
  if (table === "users" && action === "select") {
    try {
      const parsed = typeof filters === "string" ? JSON.parse(filters) : filters;
      if (Array.isArray(parsed)) {
        const idFilter = parsed.find(
          (f: { column?: string; op?: string; value?: string }) =>
            f.column === "id" && f.op === "eq" && f.value === authUserId
        );
        return Boolean(idFilter);
      }
    } catch {
      return false;
    }
  }
  if (table === "users" && (action === "update" || action === "patch")) return true;
  if (table === "notifications") return action === "select";
  if (table === "device_sessions" && (action === "insert" || action === "upsert" || action === "select")) {
    return true;
  }
  return false;
}
