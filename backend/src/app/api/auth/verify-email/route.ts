import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { z } from "zod";
import { issueSessionTokens } from "@/lib/auth/otp-helpers";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();

    const record = await prisma.otpCode.findFirst({
      where: {
        email,
        purpose: "signup_verify",
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return err("Invalid or expired verification code", 401);

    await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });

    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return err("User not found", 404);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isVerified: user.role === "customer" ? true : user.isVerified,
      },
    });

    const session = await issueSessionTokens(updated);
    return ok({ ...session, verified: true });
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input");
    console.error("[auth/verify-email]", e);
    return err("Verification failed", 500);
  }
}
