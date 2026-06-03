import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email) return err("Email required");
  const normalized = email.trim().toLowerCase();

  if (process.env.MAILER_AUTOCONFIRM === "true") {
    await prisma.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    return ok({ sent: true, verified: true });
  }

  console.info(`[auth] Resend verification to ${normalized}`);
  return ok({ sent: true });
}
