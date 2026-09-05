import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { issueSessionTokens } from "@/lib/auth/otp-helpers";

export async function POST(req: NextRequest) {
  const { phone, otp } = (await req.json()) as { phone?: string; otp?: string };
  if (!phone || !otp) return err("Phone and OTP required");

  const normalized = phone.replace(/\D/g, "").slice(-10);
  const record = await prisma.otpCode.findFirst({
    where: {
      phone: normalized,
      purpose: "phone_login",
      code: otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return err("Invalid OTP", 401);

  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });

  let user = await prisma.user.findFirst({ where: { phone: normalized, deletedAt: null } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: normalized,
        fullName: "User",
        role: "customer",
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  if (user.status === "suspended" || user.status === "closed") {
    return err("Account suspended", 403);
  }

  const session = await issueSessionTokens(user);
  return ok(session);
}
