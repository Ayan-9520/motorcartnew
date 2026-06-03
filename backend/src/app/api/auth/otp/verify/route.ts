import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ok, err } from "@/lib/api-response";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { phone, otp } = (await req.json()) as { phone?: string; otp?: string };
  if (!phone || !otp) return err("Phone and OTP required");

  const normalized = phone.replace(/\D/g, "").slice(-10);
  const record = await prisma.otpCode.findFirst({
    where: { phone: normalized, code: otp, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return err("Invalid OTP", 401);

  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });

  let user = await prisma.user.findFirst({ where: { phone: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone: normalized, fullName: "User", role: "customer" },
    });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return ok({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      metadata: {},
    },
  });
}
