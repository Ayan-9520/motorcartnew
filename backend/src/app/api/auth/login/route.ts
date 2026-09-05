import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { ok, err } from "@/lib/api-response";
import { z } from "zod";
import { issueSessionTokens } from "@/lib/auth/otp-helpers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      return err("Invalid login credentials", 401);
    }

    if (user.status === "suspended" || user.status === "closed") {
      return err("Account suspended", 403);
    }

    const autoConfirm = process.env.MAILER_AUTOCONFIRM === "true";
    if (!user.emailVerified && !autoConfirm) {
      return err("Email not verified. Check your inbox for the 48-hour verification code, or resend it.", 403);
    }

    if (!user.emailVerified && autoConfirm) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
      user.emailVerified = true;
    }

    const session = await issueSessionTokens(user);
    return ok(session);
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input");
    console.error("[auth/login]", e);
    const msg = e instanceof Error ? e.message : "Login failed";
    return err(msg, 500);
  }
}
