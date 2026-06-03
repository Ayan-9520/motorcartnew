import jwt from "jsonwebtoken";
import type { AppRole } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  role: AppRole;
  email?: string | null;
};

const accessSecret = () =>
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-access-secret-change-in-production";
const refreshSecret = () =>
  process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? "dev-refresh-secret-change-in-production";

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, accessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  });
}

export function signRefreshToken(payload: { sub: string }) {
  return jwt.sign(payload, refreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, accessSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, refreshSecret()) as { sub: string };
  } catch {
    return null;
  }
}
