import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { FINANCE_DESK_ROLES } from "@/lib/finance/errors";

export function requireFinanceDesk(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) throw new Error("UNAUTHORIZED");
  if (!FINANCE_DESK_ROLES.has(auth.role)) throw new Error("FORBIDDEN");
  return auth;
}
