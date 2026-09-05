import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { formatAuthUser } from "@/lib/auth/format-user";
import type { User } from "@prisma/client";

export type OtpPurpose = "signup_verify" | "email_login" | "phone_login";

export function generateOtpCode(digits = 6): string {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  return String(randomInt(min, max));
}

export function siteBaseUrl(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    process.env.VITE_SITE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000"
  );
}

export async function issueSessionTokens(user: User) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email ?? undefined });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  };
}

export async function invalidateOtps(opts: {
  purpose: OtpPurpose;
  email?: string | null;
  phone?: string | null;
}) {
  await prisma.otpCode.updateMany({
    where: {
      purpose: opts.purpose,
      used: false,
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.phone ? { phone: opts.phone } : {}),
    },
    data: { used: true },
  });
}
