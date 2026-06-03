import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email) return err("Email required");

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: normalized } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        email: normalized,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // TODO: nodemailer send reset link
    console.info(`[auth] Password reset token for ${normalized}: ${token}`);
  }

  return ok({ message: "If the email exists, a reset link was sent." });
}
