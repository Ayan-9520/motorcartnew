import type { NextRequest } from "next/server";
import { getAuthUser } from "./middleware";
import type { JwtPayload } from "./jwt";

const PLATFORM_ADMIN_ROLES = new Set(["super_admin", "admin"]);

export function requirePlatformAdmin(req: NextRequest): JwtPayload {
  const user = getAuthUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  if (!PLATFORM_ADMIN_ROLES.has(user.role)) throw new Error("FORBIDDEN");
  return user;
}
