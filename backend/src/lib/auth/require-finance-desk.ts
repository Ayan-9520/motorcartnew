import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";

const FINANCE_DESK_ROLES = new Set([
  "super_admin",
  "admin",
  "finance_manager",
  "bank_nbfc",
]);

export function requireFinanceDesk(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) throw new Error("UNAUTHORIZED");
  if (!FINANCE_DESK_ROLES.has(auth.role)) throw new Error("FORBIDDEN");
  return auth;
}
