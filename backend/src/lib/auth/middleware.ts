import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "./jwt";

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyAccessToken(token);
}

export function requireAuth(req: NextRequest): JwtPayload {
  const user = getAuthUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function requireRoles(user: JwtPayload, roles: string[]) {
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
}
